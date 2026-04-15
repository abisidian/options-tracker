/**
 * Bybit 期权手续费模型。
 *
 * 规则（官方费率页）：
 * - 成交手续费 = min(0.02% × 标的指数价 × 合约乘数,
 *                  10%   × 期权 markPrice × 合约乘数)
 *   即：按标的计的比例费 vs 按权利金计的上限，取小。
 * - 交割/行权手续费 = min(0.015% × 标的指数价 × 合约乘数,
 *                      10%     × 结算价 × 合约乘数)
 *
 * 对用户持仓来说，从开仓到了结（到期交割或主动平仓）至少会产生两笔费用：
 * 开仓一次，平仓/交割一次。这里统一按「两次成交费」近似作为每条腿的往返费，
 * 计入净盈亏比的估算中。
 */

export const BYBIT_OPTION_TRADE_RATE = 0.0002; // 0.02%
export const BYBIT_OPTION_FEE_CAP_RATIO = 0.1; // 10% of option premium

/**
 * 单条腿开仓/平仓的一笔成交手续费（USD）。
 */
export function legTradeFeeUsd(
  markPrice: number,
  underlyingPrice: number,
  contractSize: number,
): number {
  if (!(markPrice > 0) || !(underlyingPrice > 0) || !(contractSize > 0)) {
    return 0;
  }
  const byUnderlying = BYBIT_OPTION_TRADE_RATE * underlyingPrice * contractSize;
  const cap = BYBIT_OPTION_FEE_CAP_RATIO * markPrice * contractSize;
  return Math.min(byUnderlying, cap);
}

/**
 * 单条腿「往返」手续费（USD）= 开仓 + 平仓（或交割）。
 * 简化为 2× 成交手续费，用于盈亏比估算。
 */
export function legRoundTripFeeUsd(
  markPrice: number,
  underlyingPrice: number,
  contractSize: number,
): number {
  return 2 * legTradeFeeUsd(markPrice, underlyingPrice, contractSize);
}
