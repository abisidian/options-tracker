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
  breakEven: number;
  width: number; // |K_buy - K_sell|
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
  };
  combos: SpreadCombo[];
}
