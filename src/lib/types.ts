export type OptionType = "C" | "P";

export type Coin = "BTC" | "ETH";

export const COINS: Coin[] = ["BTC", "ETH"];

export interface OptionTicker {
  symbol: string;
  baseCoin: string;
  expiryMs: number;
  expiryLabel: string; // e.g. "28JUN24"
  strike: number;
  type: OptionType;
  bid1Price: number;
  ask1Price: number;
  markPrice: number; // USD per BTC (Bybit markPrice for options is quoted in USD)
  markIv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  openInterest: number;
  underlyingPrice: number;
}

export interface ExpiryInfo {
  label: string;
  expiryMs: number;
  daysToExpiry: number;
  count: number;
}

export type SpreadStrategy = "BearCall" | "BullPut";

export interface SpreadCombo {
  id: string;
  strategy: SpreadStrategy;
  expiryLabel: string;
  expiryMs: number;
  daysToExpiry: number;
  sellLeg: {
    symbol: string;
    strike: number;
    delta: number;
    markPrice: number;
    bid: number;
    ask: number;
  };
  buyLeg: {
    symbol: string;
    strike: number;
    delta: number;
    markPrice: number;
    bid: number;
    ask: number;
  };
  netCreditUsd: number; // per 1 contract (0.01 BTC)
  maxProfitUsd: number; // per 1 contract
  maxLossUsd: number; // per 1 contract
  riskReward: number; // maxProfit / maxLoss
  returnOnRisk: number; // maxProfit / maxLoss (same formula, kept for clarity)
  // 手续费（USD / 合约）：每条腿的「开仓+平仓」往返估算，总和 = sellLegFeeUsd + buyLegFeeUsd
  sellLegFeeUsd: number;
  buyLegFeeUsd: number;
  feesUsd: number; // 总往返手续费
  netMaxProfitUsd: number; // maxProfit - feesUsd
  netMaxLossUsd: number; // maxLoss + feesUsd
  netRiskReward: number; // netMaxProfit / netMaxLoss
  breakEven: number;
  width: number; // |K_buy - K_sell|
  underlyingPrice: number;
}

export interface LegSnapshot {
  symbol: string;
  strike: number;
  delta: number;
  markPrice: number;
  bid: number;
  ask: number;
}

export interface IronCondorCombo {
  id: string;
  strategy: "IronCondor";
  expiryLabel: string;
  expiryMs: number;
  daysToExpiry: number;
  putBuyLeg: LegSnapshot; // K_pb: 买入低行权价 Put
  putSellLeg: LegSnapshot; // K_ps: 卖出高行权价 Put
  callSellLeg: LegSnapshot; // K_cs: 卖出低行权价 Call
  callBuyLeg: LegSnapshot; // K_cb: 买入高行权价 Call
  netCreditUsd: number;
  maxProfitUsd: number;
  maxLossUsd: number;
  riskReward: number;
  returnOnRisk: number;
  // 四条腿的往返手续费（USD / 合约）
  putBuyLegFeeUsd: number;
  putSellLegFeeUsd: number;
  callSellLegFeeUsd: number;
  callBuyLegFeeUsd: number;
  feesUsd: number; // 四条腿往返总费用
  netMaxProfitUsd: number;
  netMaxLossUsd: number;
  netRiskReward: number;
  lowerBreakEven: number;
  upperBreakEven: number;
  putWidth: number;
  callWidth: number;
  underlyingPrice: number;
}

export interface SpreadsResponse {
  fetchedAt: number;
  coin: Coin;
  underlyingPrice: number;
  expiryLabel: string;
  expiryMs: number;
  daysToExpiry: number;
  counts: {
    totalOptions: number;
    filteredCalls: number;
    filteredPuts: number;
    bearCall: number;
    bullPut: number;
    ironCondor: number;
  };
  combos: SpreadCombo[];
  ironCondors: IronCondorCombo[];
}
