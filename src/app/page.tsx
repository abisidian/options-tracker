"use client";

import { useEffect, useMemo, useState } from "react";
import { BtcPriceHeader } from "@/components/BtcPriceHeader";
import { CoinSwitcher } from "@/components/CoinSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { ExpiryPicker } from "@/components/ExpiryPicker";
import { StrategyFilter } from "@/components/StrategyFilter";
import { SpreadTable } from "@/components/SpreadTable";
import { IronCondorTable } from "@/components/IronCondorTable";
import {
  SpreadFilterPanel,
  applySpreadFilter,
  EMPTY_SPREAD_FILTER,
  type SpreadFilterCriteria,
} from "@/components/SpreadFilterPanel";
import {
  IronCondorFilterPanel,
  applyIronCondorFilter,
  EMPTY_IC_FILTER,
  type IronCondorFilterCriteria,
} from "@/components/IronCondorFilterPanel";
import { usePolling } from "@/hooks/usePolling";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { formatDays } from "@/lib/format";
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

/**
 * 根据页面展示口径挑选默认到期日：优先显示为 3d，没有则回退到 2d、1d，再没有才取最早到期。
 */
function pickDefaultExpiry(expiries: ExpiryInfo[]): ExpiryInfo | null {
  if (expiries.length === 0) return null;

  // 页面展示 DTE 时使用四舍五入，所以默认选择也按同一口径匹配 3 天 / 2 天 / 1 天。
  const roundedDteTargets = [3, 2, 1];
  for (const target of roundedDteTargets) {
    const matched = expiries.find((expiry) => Math.round(expiry.daysToExpiry) === target);
    if (matched) {
      return matched;
    }
  }

  return expiries[0];
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
  const [activeTab, setActiveTab] = useState<"spread" | "ironCondor">("spread");
  const [spreadFilter, setSpreadFilter] = useState<SpreadFilterCriteria>(EMPTY_SPREAD_FILTER);
  const [icFilter, setIcFilter] = useState<IronCondorFilterCriteria>(EMPTY_IC_FILTER);

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

  // 默认优先选择显示为 3d 的到期日；没有则回退到 2d、1d，再没有才取最早到期。
  useEffect(() => {
    if (!expiry && expiriesState.data?.expiries?.length) {
      const defaultExpiry = pickDefaultExpiry(expiriesState.data.expiries);
      if (defaultExpiry) {
        setExpiry(defaultExpiry.label);
      }
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

  const allCombos = hasData ? spreads!.combos : [];
  const allIronCondors = spreads?.ironCondors ?? [];

  const filteredCombos = useMemo(
    () => applySpreadFilter(allCombos, spreadFilter),
    [allCombos, spreadFilter],
  );

  const filteredIronCondors = useMemo(
    () => applyIronCondorFilter(allIronCondors, icFilter),
    [allIronCondors, icFilter],
  );

  // 切换到期日时重置筛选
  useEffect(() => {
    setSpreadFilter(EMPTY_SPREAD_FILTER);
    setIcFilter(EMPTY_IC_FILTER);
  }, [expiry]);

  const relativeTime = useRelativeTime(spreadsState.fetchedAt);

  const selectedExpiry = useMemo(
    () => expiriesState.data?.expiries.find((e) => e.label === expiry) ?? null,
    [expiriesState.data, expiry],
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1500px] flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
      {/* Top bar */}
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-base font-semibold tracking-tight text-fg">
              Options Tracker
            </h1>
            <p className="text-2xs text-fg-dim">
              Bybit {coin} · 10-Delta 信用价差
            </p>
          </div>
          <div className="flex items-center gap-4 text-2xs text-fg-dim">
            <ThemeSwitcher />
            <CoinSwitcher value={coin} onChange={handleCoinChange} />
            <span className="hidden items-center gap-1.5 sm:inline-flex">
              <span className="h-1 w-1 rounded-full bg-profit" aria-hidden />
              1 分钟
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
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-2xs text-fg-dim">
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
                Calls
                <span className="ml-1 font-mono tabular-nums text-fg">
                  {spreads.counts.filteredCalls}
                </span>
              </span>
              <span>
                Puts
                <span className="ml-1 font-mono tabular-nums text-fg">
                  {spreads.counts.filteredPuts}
                </span>
              </span>
              <span>
                组合
                <span className="ml-1 font-mono tabular-nums text-fg">
                  {spreads.combos.length}
                </span>
              </span>
            </>
          ) : null}
          <span>{relativeTime}</span>
        </div>
      </section>

      {/* Error banner */}
      {spreadsState.error ? (
        <div
          role="alert"
          className="rounded-lg border border-loss/30 bg-loss/5 px-4 py-2.5 text-xs text-loss"
        >
          {spreadsState.error}
        </div>
      ) : null}

      {/* Tab switcher */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 rounded-lg border border-border-subtle bg-bg-muted p-1">
          <button
            type="button"
            onClick={() => setActiveTab("spread")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "spread"
                ? "bg-bg-elevated text-fg shadow-sm"
                : "text-fg-dim hover:text-fg-muted"
            }`}
          >
            价差组合 <span className="text-2xs font-normal text-fg-dim">Credit Spread</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ironCondor")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "ironCondor"
                ? "bg-bg-elevated text-fg shadow-sm"
                : "text-fg-dim hover:text-fg-muted"
            }`}
          >
            铁鹰组合 <span className="text-2xs font-normal text-fg-dim">Iron Condor</span>
          </button>
        </div>
        {activeTab === "spread" ? (
          <StrategyFilter value={strategies} onChange={setStrategies} />
        ) : null}
      </div>

      {/* Filter panel */}
      {activeTab === "spread" ? (
        <SpreadFilterPanel
          combos={allCombos}
          value={spreadFilter}
          onChange={setSpreadFilter}
          filteredCount={filteredCombos.length}
        />
      ) : (
        <IronCondorFilterPanel
          combos={allIronCondors}
          value={icFilter}
          onChange={setIcFilter}
          filteredCount={filteredIronCondors.length}
        />
      )}

      {/* Table content */}
      <section className="min-h-0 flex-1">
        {activeTab === "spread" ? (
          <SpreadTable
            combos={filteredCombos}
            loading={spreadsState.loading}
            coin={coin}
          />
        ) : (
          <IronCondorTable
            combos={filteredIronCondors}
            loading={spreadsState.loading}
            coin={coin}
          />
        )}
      </section>

      <footer className="pb-2 pt-4 text-center text-2xs text-fg-dim">
        Bybit 公开行情 · 仅供研究
      </footer>
    </main>
  );
}
