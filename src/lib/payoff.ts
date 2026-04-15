import { contractSizeFor } from "./spreads";
import type { Coin, IronCondorCombo } from "./types";

export interface PayoffPoint {
  price: number;
  pnl: number;
}

/**
 * 计算铁鹰在到期时、给定标的价格 S 下的 PnL（per 1 张合约，USD）。
 * 公式：
 *   PnL(S) = 净权
 *          − max(0, S − K_cs) × size   (卖出 Call)
 *          + max(0, S − K_cb) × size   (买入 Call)
 *          − max(0, K_ps − S) × size   (卖出 Put)
 *          + max(0, K_pb − S) × size   (买入 Put)
 */
export function ironCondorPayoffAt(
  combo: IronCondorCombo,
  price: number,
  coin: Coin,
): number {
  const size = contractSizeFor(coin);
  const { callSellLeg, callBuyLeg, putSellLeg, putBuyLeg, netCreditUsd } = combo;
  const shortCall = Math.max(0, price - callSellLeg.strike);
  const longCall = Math.max(0, price - callBuyLeg.strike);
  const shortPut = Math.max(0, putSellLeg.strike - price);
  const longPut = Math.max(0, putBuyLeg.strike - price);
  return netCreditUsd + (-shortCall + longCall - shortPut + longPut) * size;
}

/**
 * 采样一条铁鹰到期盈亏曲线，关键转折点（4 个行权价）必被采样以保证折线准确。
 */
export function ironCondorPayoffCurve(
  combo: IronCondorCombo,
  coin: Coin,
  opts: { steps?: number; paddingRatio?: number } = {},
): PayoffPoint[] {
  const steps = opts.steps ?? 60;
  const paddingRatio = opts.paddingRatio ?? 0.08;
  const strikes = [
    combo.putBuyLeg.strike,
    combo.putSellLeg.strike,
    combo.callSellLeg.strike,
    combo.callBuyLeg.strike,
  ];
  const minK = Math.min(...strikes);
  const maxK = Math.max(...strikes);
  const span = maxK - minK;
  const lo = minK - span * paddingRatio;
  const hi = maxK + span * paddingRatio;

  const prices = new Set<number>();
  for (let i = 0; i <= steps; i++) {
    prices.add(lo + ((hi - lo) * i) / steps);
  }
  // 确保每个行权价、盈亏平衡点、标的现价都落在采样点上。
  for (const k of strikes) prices.add(k);
  prices.add(combo.lowerBreakEven);
  prices.add(combo.upperBreakEven);
  if (combo.underlyingPrice >= lo && combo.underlyingPrice <= hi) {
    prices.add(combo.underlyingPrice);
  }

  return Array.from(prices)
    .sort((a, b) => a - b)
    .map((price) => ({ price, pnl: ironCondorPayoffAt(combo, price, coin) }));
}
