import type { Coin, ExpiryInfo, OptionTicker, OptionType } from "./types";

const BYBIT_BASE = process.env.BYBIT_API_BASE || "https://api.bybit.com";
const USER_AGENT =
  "Mozilla/5.0 (compatible; OptionsTracker/0.1; +https://github.com/)";

// Optional HTTPS proxy support. When HTTPS_PROXY / HTTP_PROXY is set we
// route requests through an undici ProxyAgent so users behind corporate
// proxies or in geo-blocked regions (e.g. mainland China, where Bybit's
// CloudFront edge returns 403) can still reach the public market data.
let proxyDispatcher: unknown = null;
async function getDispatcher(): Promise<unknown> {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;
  if (!proxyUrl) return null;
  if (proxyDispatcher) return proxyDispatcher;
  try {
    // undici is bundled with Next.js (Node 18+). Use a string literal import
    // variable so TS doesn't try to resolve types for the optional dep.
    const mod = "undici";
    const undici = (await import(/* webpackIgnore: true */ mod)) as {
      ProxyAgent: new (url: string) => unknown;
    };
    proxyDispatcher = new undici.ProxyAgent(proxyUrl);
    return proxyDispatcher;
  } catch {
    return null;
  }
}

// Simple in-memory cache to avoid hammering Bybit when multiple
// clients poll the same endpoint within a short window.
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value as T;
}

function setCached<T>(key: string, value: T, ttlMs: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

async function bybitGet<T>(path: string): Promise<T> {
  const url = `${BYBIT_BASE}${path}`;
  const dispatcher = await getDispatcher();
  const init: RequestInit & { dispatcher?: unknown } = {
    headers: {
      accept: "application/json",
      "user-agent": USER_AGENT,
    },
    // Force fresh data — we manage our own cache layer.
    cache: "no-store",
  };
  if (dispatcher) init.dispatcher = dispatcher;
  const res = await fetch(url, init as RequestInit);
  if (!res.ok) {
    throw new Error(`Bybit ${path} failed: HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    retCode: number;
    retMsg: string;
    result: T;
  };
  if (json.retCode !== 0) {
    throw new Error(`Bybit ${path} error: ${json.retMsg}`);
  }
  return json.result;
}

/**
 * Fetch the current {coin}/USDT spot price from Bybit.
 */
export async function fetchSpotPrice(coin: Coin): Promise<number> {
  const cacheKey = `${coin}-spot`;
  const cached = getCached<number>(cacheKey);
  if (cached !== null) return cached;

  const result = await bybitGet<{
    list: Array<{ symbol: string; lastPrice: string }>;
  }>(`/v5/market/tickers?category=spot&symbol=${coin}USDT`);
  const price = Number(result.list?.[0]?.lastPrice ?? 0);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid ${coin} spot price from Bybit`);
  }
  setCached(cacheKey, price, 2_000);
  return price;
}

interface RawOptionTicker {
  symbol: string;
  bid1Price: string;
  ask1Price: string;
  markPrice: string;
  markIv: string;
  delta: string;
  gamma: string;
  theta: string;
  vega: string;
  openInterest: string;
  underlyingPrice: string;
}

/**
 * 解析 Bybit 期权代码。
 * 兼容旧格式 `BTC-28JUN24-70000-C`，也兼容当前接口返回的
 * 新格式 `BTC-29MAY26-93000-C-USDT`。
 */
export function parseOptionSymbol(symbol: string): {
  baseCoin: string;
  expiryLabel: string;
  expiryMs: number;
  strike: number;
  type: OptionType;
} | null {
  const parts = symbol.split("-");
  if (parts.length !== 4 && parts.length !== 5) return null;
  // Bybit 现在会在尾部追加结算币种（如 USDT），解析时忽略即可。
  const [baseCoin, expiryLabel, strikeStr, typeChar] = parts;
  if (typeChar !== "C" && typeChar !== "P") return null;
  const strike = Number(strikeStr);
  if (!Number.isFinite(strike) || strike <= 0) return null;
  const expiryMs = parseBybitExpiry(expiryLabel);
  if (expiryMs === null) return null;
  return {
    baseCoin,
    expiryLabel,
    expiryMs,
    strike,
    type: typeChar as OptionType,
  };
}

/**
 * Parse Bybit's expiry label (e.g. "28JUN24") into a UTC timestamp at 08:00.
 * Bybit BTC options settle at 08:00 UTC on the expiry date.
 */
const MONTHS: Record<string, number> = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

function parseBybitExpiry(label: string): number | null {
  // Format: D[D]MMMYY  e.g. 7JUN24 or 28JUN24
  const match = label.match(/^(\d{1,2})([A-Z]{3})(\d{2})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const monthIdx = MONTHS[match[2]];
  const year = 2000 + Number(match[3]);
  if (monthIdx === undefined) return null;
  return Date.UTC(year, monthIdx, day, 8, 0, 0, 0);
}

/**
 * Fetch all option tickers for the given base coin from Bybit, parse,
 * and return a normalized list. Cached for 3s server-side to coalesce
 * concurrent requests.
 */
export async function fetchOptionTickers(coin: Coin): Promise<OptionTicker[]> {
  const cacheKey = `${coin}-options`;
  const cached = getCached<OptionTicker[]>(cacheKey);
  if (cached) return cached;

  const result = await bybitGet<{ list: RawOptionTicker[] }>(
    `/v5/market/tickers?category=option&baseCoin=${coin}`,
  );

  const normalized: OptionTicker[] = [];
  for (const raw of result.list ?? []) {
    const parsed = parseOptionSymbol(raw.symbol);
    if (!parsed) continue;

    const markPrice = Number(raw.markPrice);
    const delta = Number(raw.delta);
    const underlyingPrice = Number(raw.underlyingPrice);
    if (
      !Number.isFinite(markPrice) ||
      !Number.isFinite(delta) ||
      !Number.isFinite(underlyingPrice)
    ) {
      continue;
    }

    normalized.push({
      symbol: raw.symbol,
      baseCoin: parsed.baseCoin,
      expiryMs: parsed.expiryMs,
      expiryLabel: parsed.expiryLabel,
      strike: parsed.strike,
      type: parsed.type,
      bid1Price: Number(raw.bid1Price) || 0,
      ask1Price: Number(raw.ask1Price) || 0,
      markPrice,
      markIv: Number(raw.markIv) || 0,
      delta,
      gamma: Number(raw.gamma) || 0,
      theta: Number(raw.theta) || 0,
      vega: Number(raw.vega) || 0,
      openInterest: Number(raw.openInterest) || 0,
      underlyingPrice,
    });
  }

  setCached(cacheKey, normalized, 3_000);
  return normalized;
}

/**
 * Derive the list of distinct expiries from a set of tickers.
 * Sorted ascending by expiry time, future expiries first.
 */
export function deriveExpiries(tickers: OptionTicker[]): ExpiryInfo[] {
  const byLabel = new Map<string, ExpiryInfo>();
  const now = Date.now();

  for (const t of tickers) {
    if (t.expiryMs <= now) continue; // skip expired
    const existing = byLabel.get(t.expiryLabel);
    if (existing) {
      existing.count += 1;
    } else {
      const daysToExpiry = Math.max(
        0,
        (t.expiryMs - now) / (24 * 60 * 60 * 1000),
      );
      byLabel.set(t.expiryLabel, {
        label: t.expiryLabel,
        expiryMs: t.expiryMs,
        daysToExpiry,
        count: 1,
      });
    }
  }

  return Array.from(byLabel.values()).sort((a, b) => a.expiryMs - b.expiryMs);
}
