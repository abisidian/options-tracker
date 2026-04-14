"use client";

import { useEffect, useMemo, useState } from "react";
import { BtcPriceHeader } from "@/components/BtcPriceHeader";
import { CoinSwitcher } from "@/components/CoinSwitcher";
import { ExpiryPicker } from "@/components/ExpiryPicker";
import { StrategyFilter } from "@/components/StrategyFilter";
import { SpreadTable } from "@/components/SpreadTable";
import { usePolling } from "@/hooks/usePolling";
import { formatDays, formatRelative } from "@/lib/format";
import type {
  Coin,
  ExpiryInfo,
  SpreadStrategy,
  SpreadsResponse,
} from "@/lib/types";

// 页面上的行情与组合数据统一按 1 分钟轮询，避免不同区域刷新频率不一致。
const POLLING_INTERVAL_MS = 60_000;

interface ExpiriesResponse {
  coin: Coin;
  expiries: ExpiryInfo[];
  fetchedAt: number;
}

async function fetchExpiries(coin: Coin): Promise<ExpiriesResponse> {
  const res = await fetch(`/api/expiries?coin=${coin}`, { cache: "no-store" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as ExpiriesResponse;
}

async function fetchSpreads(
  coin: Coin,
  expiry: string,
  strategies: SpreadStrategy[],
): Promise<SpreadsResponse> {
  const params = new URLSearchParams({
    coin,
    expiry,
    strategies: strategies.join(","),
  });
  const res = await fetch(`/api/spreads?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as SpreadsResponse;
}

export default function HomePage() {
  const [coin, setCoin] = useState<Coin>("BTC");
  const [expiry, setExpiry] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<SpreadStrategy[]>([
    "BearCall",
    "BullPut",
  ]);

  // 切换币种时，重置已选到期日，等新列表到来后再挑最近到期。
  const handleCoinChange = (next: Coin) => {
    if (next === coin) return;
    setCoin(next);
    setExpiry(null);
  };

  const expiriesState = usePolling(
    () => fetchExpiries(coin),
    POLLING_INTERVAL_MS,
    [coin],
  );

  // Default to the nearest future expiry once data arrives.
  useEffect(() => {
    if (!expiry && expiriesState.data?.expiries?.length) {
      setExpiry(expiriesState.data.expiries[0].label);
    }
  }, [expiriesState.data, expiry]);

  const spreadsState = usePolling(
    async () => {
      if (!expiry) {
        // Placate the hook; it will ignore the null result.
        return null as unknown as SpreadsResponse;
      }
      return fetchSpreads(coin, expiry, strategies);
    },
    POLLING_INTERVAL_MS,
    [coin, expiry, strategies.join(",")],
  );

  const spreads = spreadsState.data;
  const hasData = Boolean(spreads?.combos);

  const selectedExpiry = useMemo(
    () => expiriesState.data?.expiries.find((e) => e.label === expiry) ?? null,
    [expiriesState.data, expiry],
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      {/* Top bar */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/15 text-info"
              aria-hidden
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l4-4 4 4 5-5" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-fg">
                Options Tracker
              </h1>
              <p className="text-2xs text-fg-dim">
                Bybit {coin} 期权 · 10-Delta 信用价差扫描
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-2xs text-fg-dim">
            <CoinSwitcher value={coin} onChange={handleCoinChange} />
            <span className="hidden items-center gap-1.5 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-profit" aria-hidden />
              1 分钟轮询
            </span>
          </div>
        </div>
        <BtcPriceHeader coin={coin} />
      </header>

      {/* Controls + summary */}
      <section className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <ExpiryPicker
            expiries={expiriesState.data?.expiries ?? []}
            value={expiry}
            onChange={setExpiry}
            loading={expiriesState.loading}
          />
          <StrategyFilter value={strategies} onChange={setStrategies} />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-2xs text-fg-dim">
          {selectedExpiry ? (
            <span>
              剩余
              <span className="ml-1 font-mono tabular-nums text-fg">
                {formatDays(selectedExpiry.daysToExpiry)}
              </span>
            </span>
          ) : null}
          {spreads ? (
            <>
              <span>
                Calls(Δ&gt;0.1, K&gt;现价):
                <span className="ml-1 font-mono tabular-nums text-fg">
                  {spreads.counts.filteredCalls}
                </span>
              </span>
              <span>
                Puts(Δ&lt;-0.1, K&lt;现价):
                <span className="ml-1 font-mono tabular-nums text-fg">
                  {spreads.counts.filteredPuts}
                </span>
              </span>
              <span>
                组合:
                <span className="ml-1 font-mono tabular-nums text-fg">
                  {spreads.combos.length}
                </span>
              </span>
            </>
          ) : null}
          <span>
            {spreadsState.fetchedAt
              ? `更新于 ${formatRelative(spreadsState.fetchedAt)}`
              : "加载中…"}
          </span>
        </div>
      </section>

      {/* Error banner */}
      {spreadsState.error ? (
        <div
          role="alert"
          className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-2 text-xs text-loss"
        >
          数据加载失败：{spreadsState.error}
        </div>
      ) : null}

      {/* Table */}
      <section className="min-h-0 flex-1">
        <SpreadTable
          combos={hasData ? spreads!.combos : []}
          loading={spreadsState.loading}
        />
      </section>

      <footer className="pt-2 text-center text-2xs text-fg-dim">
        数据来源：Bybit 公开行情接口 · 本页面仅供研究学习，不构成投资建议
      </footer>
    </main>
  );
}
