import { legRoundTripFeeUsd } from "./fees";
import type {
  Coin,
  IronCondorCombo,
  OptionTicker,
  OptionType,
  SpreadCombo,
  SpreadStrategy,
} from "./types";

/** Iron Condor 的最小盈亏比过滤阈值。 */
export const IRON_CONDOR_MIN_RR = 0.3;

/**
 * Bybit options contract size (张 → underlying 数量)。
 * BTC 为 0.01 BTC/张，ETH 为 0.1 ETH/张。
 * markPrice 以每 1 个 underlying 的 USD 报价，因此 1 张的 USD 成本
 * = markPrice * contractSize。
 */
const CONTRACT_SIZE: Record<Coin, number> = {
  BTC: 0.01,
  ETH: 0.1,
};

export function contractSizeFor(coin: Coin): number {
  return CONTRACT_SIZE[coin];
}

/**
 * Delta 阈值。
 * Call 侧只保留 `delta > 0.1` 且高于现价的行权价，
 * Put 侧只保留 `delta < -0.1` 且低于现价的行权价。
 */
export const DELTA_LIMIT = 0.1;

export interface BuildSpreadsInput {
  tickers: OptionTicker[];
  expiryLabel: string;
  coin: Coin;
  strategies?: SpreadStrategy[]; // default: both
}

interface LegSnapshot {
  symbol: string;
  strike: number;
  delta: number;
  markPrice: number;
  bid: number;
  ask: number;
}

function toLeg(t: OptionTicker): LegSnapshot {
  return {
    symbol: t.symbol,
    strike: t.strike,
    delta: t.delta,
    markPrice: t.markPrice,
    bid: t.bid1Price,
    ask: t.ask1Price,
  };
}

function sortByStrike(a: OptionTicker, b: OptionTicker): number {
  return a.strike - b.strike;
}

/**
 * Bear Call 的候选行权价筛选。
 * 这里只保留 delta 大于阈值，且行权价高于标的现价的 Call。
 */
function isEligibleCallStrike(
  t: OptionTicker,
  underlyingPrice: number,
): boolean {
  return (
    t.type === "C" &&
    t.delta > DELTA_LIMIT &&
    Number.isFinite(underlyingPrice) &&
    underlyingPrice > 0 &&
    t.strike > underlyingPrice
  );
}

/**
 * Bull Put 的候选行权价筛选。
 * 这里只保留 delta 小于负阈值，且行权价低于标的现价的 Put。
 */
function isEligiblePutStrike(
  t: OptionTicker,
  underlyingPrice: number,
): boolean {
  return (
    t.type === "P" &&
    t.delta < -DELTA_LIMIT &&
    Number.isFinite(underlyingPrice) &&
    underlyingPrice > 0 &&
    t.strike < underlyingPrice
  );
}

function underlyingFrom(tickers: OptionTicker[]): number {
  // Bybit exposes underlyingPrice on each option row; use the first valid one.
  for (const t of tickers) {
    if (Number.isFinite(t.underlyingPrice) && t.underlyingPrice > 0) {
      return t.underlyingPrice;
    }
  }
  return 0;
}

/**
 * Enumerate credit spreads for a given expiry.
 *
 * Rules:
 * - Call 候选腿要求 delta > DELTA_LIMIT，且 K > 标的现价。
 * - Put 候选腿要求 delta < -DELTA_LIMIT，且 K < 标的现价。
 * - Bear Call Spread: two calls with K_sell < K_buy (sell lower strike, buy higher).
 * - Bull Put Spread:  two puts  with K_sell > K_buy (sell higher strike, buy lower).
 * - 两条腿都必须来自上面的候选区间。
 * - Net credit must be strictly positive (otherwise skipped as degenerate).
 */
export function buildSpreadsForExpiry(
  input: BuildSpreadsInput,
): {
  combos: SpreadCombo[];
  underlyingPrice: number;
  counts: {
    totalOptions: number;
    filteredCalls: number;
    filteredPuts: number;
    bearCall: number;
    bullPut: number;
  };
} {
  const { tickers, expiryLabel, coin } = input;
  const strategies = input.strategies ?? ["BearCall", "BullPut"];
  const contractSize = contractSizeFor(coin);

  const ofExpiry = tickers.filter((t) => t.expiryLabel === expiryLabel);
  const underlyingPrice = underlyingFrom(ofExpiry);

  const calls = ofExpiry
    .filter((t) => isEligibleCallStrike(t, underlyingPrice))
    .sort(sortByStrike);
  const puts = ofExpiry
    .filter((t) => isEligiblePutStrike(t, underlyingPrice))
    .sort(sortByStrike);

  const combos: SpreadCombo[] = [];

  if (strategies.includes("BearCall")) {
    // Pair every (sell, buy) with K_sell < K_buy.
    for (let i = 0; i < calls.length; i++) {
      for (let j = i + 1; j < calls.length; j++) {
        const sell = calls[i];
        const buy = calls[j];
        const combo = toCombo(
          sell,
          buy,
          "BearCall",
          expiryLabel,
          underlyingPrice,
          contractSize,
        );
        if (combo) combos.push(combo);
      }
    }
  }

  if (strategies.includes("BullPut")) {
    // Pair every (sell, buy) with K_sell > K_buy.
    // Sorted ascending by strike; sell is the later one, buy is the earlier one.
    for (let i = 0; i < puts.length; i++) {
      for (let j = i + 1; j < puts.length; j++) {
        const buy = puts[i]; // lower strike
        const sell = puts[j]; // higher strike
        const combo = toCombo(
          sell,
          buy,
          "BullPut",
          expiryLabel,
          underlyingPrice,
          contractSize,
        );
        if (combo) combos.push(combo);
      }
    }
  }

  const bearCall = combos.filter((c) => c.strategy === "BearCall").length;
  const bullPut = combos.filter((c) => c.strategy === "BullPut").length;

  return {
    combos,
    underlyingPrice,
    counts: {
      totalOptions: ofExpiry.length,
      filteredCalls: calls.length,
      filteredPuts: puts.length,
      bearCall,
      bullPut,
    },
  };
}

function toCombo(
  sell: OptionTicker,
  buy: OptionTicker,
  strategy: SpreadStrategy,
  expiryLabel: string,
  underlyingPrice: number,
  contractSize: number,
): SpreadCombo | null {
  // Credit per unit of underlying (USD)，再乘合约单位得到 1 张的 USD。
  const netCreditPerUnit = sell.markPrice - buy.markPrice;
  if (!(netCreditPerUnit > 0)) return null;

  const netCreditUsd = netCreditPerUnit * contractSize;
  const width = Math.abs(buy.strike - sell.strike);
  const maxLossUsd = width * contractSize - netCreditUsd;
  if (!(maxLossUsd > 0)) return null;

  const maxProfitUsd = netCreditUsd;
  const riskReward = maxProfitUsd / maxLossUsd;

  const sellLegFeeUsd = legRoundTripFeeUsd(
    sell.markPrice,
    underlyingPrice,
    contractSize,
  );
  const buyLegFeeUsd = legRoundTripFeeUsd(
    buy.markPrice,
    underlyingPrice,
    contractSize,
  );
  const feesUsd = sellLegFeeUsd + buyLegFeeUsd;
  const netMaxProfitUsd = maxProfitUsd - feesUsd;
  const netMaxLossUsd = maxLossUsd + feesUsd;
  const netRiskReward =
    netMaxLossUsd > 0 ? netMaxProfitUsd / netMaxLossUsd : 0;

  let breakEven: number;
  if (strategy === "BearCall") {
    breakEven = sell.strike + netCreditPerUnit;
  } else {
    breakEven = sell.strike - netCreditPerUnit;
  }

  const daysToExpiry = Math.max(
    0,
    (sell.expiryMs - Date.now()) / (24 * 60 * 60 * 1000),
  );

  return {
    id: `${strategy}:${sell.symbol}:${buy.symbol}`,
    strategy,
    expiryLabel,
    expiryMs: sell.expiryMs,
    daysToExpiry,
    sellLeg: toLeg(sell),
    buyLeg: toLeg(buy),
    netCreditUsd,
    maxProfitUsd,
    maxLossUsd,
    riskReward,
    returnOnRisk: riskReward,
    sellLegFeeUsd,
    buyLegFeeUsd,
    feesUsd,
    netMaxProfitUsd,
    netMaxLossUsd,
    netRiskReward,
    breakEven,
    width,
    underlyingPrice,
  };
}

/**
 * 基于已有的 BCS 与 BPS combo 列表，笛卡尔配对成 Iron Condor。
 * 仅保留 `riskReward >= IRON_CONDOR_MIN_RR` 的组合。
 *
 * 结构约束：K_pb < K_ps < 现价 < K_cs < K_cb（由上游候选腿筛选保证）。
 * 铁鹰到期一侧最多 ITM，因此 maxLoss = max(callWidth, putWidth) * contractSize - netCredit。
 */
export function buildIronCondors(
  bearCalls: SpreadCombo[],
  bullPuts: SpreadCombo[],
  coin: Coin,
  expiryLabel: string,
): IronCondorCombo[] {
  const contractSize = contractSizeFor(coin);
  const out: IronCondorCombo[] = [];

  for (const bcs of bearCalls) {
    for (const bps of bullPuts) {
      if (bcs.expiryLabel !== expiryLabel || bps.expiryLabel !== expiryLabel) {
        continue;
      }
      const netCreditUsd = bcs.netCreditUsd + bps.netCreditUsd;
      const netCreditPerUnit = netCreditUsd / contractSize;
      const widthUsd = Math.max(bcs.width, bps.width) * contractSize;
      const maxLossUsd = widthUsd - netCreditUsd;
      if (!(maxLossUsd > 0)) continue;

      const riskReward = netCreditUsd / maxLossUsd;

      const putBuyLegFeeUsd = bps.buyLegFeeUsd;
      const putSellLegFeeUsd = bps.sellLegFeeUsd;
      const callSellLegFeeUsd = bcs.sellLegFeeUsd;
      const callBuyLegFeeUsd = bcs.buyLegFeeUsd;
      const feesUsd =
        putBuyLegFeeUsd +
        putSellLegFeeUsd +
        callSellLegFeeUsd +
        callBuyLegFeeUsd;
      const netMaxProfitUsd = netCreditUsd - feesUsd;
      const netMaxLossUsd = maxLossUsd + feesUsd;
      const netRiskReward =
        netMaxLossUsd > 0 ? netMaxProfitUsd / netMaxLossUsd : 0;

      // 过滤按「净盈亏比」执行——扣除手续费后仍达标才保留。
      if (!(netRiskReward >= IRON_CONDOR_MIN_RR)) continue;

      const lowerBreakEven = bps.sellLeg.strike - netCreditPerUnit;
      const upperBreakEven = bcs.sellLeg.strike + netCreditPerUnit;

      out.push({
        id: `IronCondor:${bcs.sellLeg.symbol}:${bcs.buyLeg.symbol}:${bps.sellLeg.symbol}:${bps.buyLeg.symbol}`,
        strategy: "IronCondor",
        expiryLabel,
        expiryMs: bcs.expiryMs,
        daysToExpiry: bcs.daysToExpiry,
        putBuyLeg: bps.buyLeg,
        putSellLeg: bps.sellLeg,
        callSellLeg: bcs.sellLeg,
        callBuyLeg: bcs.buyLeg,
        netCreditUsd,
        maxProfitUsd: netCreditUsd,
        maxLossUsd,
        riskReward,
        returnOnRisk: riskReward,
        putBuyLegFeeUsd,
        putSellLegFeeUsd,
        callSellLegFeeUsd,
        callBuyLegFeeUsd,
        feesUsd,
        netMaxProfitUsd,
        netMaxLossUsd,
        netRiskReward,
        lowerBreakEven,
        upperBreakEven,
        putWidth: bps.width,
        callWidth: bcs.width,
        underlyingPrice: bcs.underlyingPrice,
      });
    }
  }

  return out;
}

export const __test = { toCombo, underlyingFrom };
export type { OptionType };
