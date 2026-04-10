"use client";

import { formatUsd, formatRelative } from "@/lib/format";
import { usePolling } from "@/hooks/usePolling";

interface BtcPriceResponse {
  price: number;
  fetchedAt: number;
}

async function fetchPrice(): Promise<BtcPriceResponse> {
  const res = await fetch("/api/btc-price", { cache: "no-store" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as BtcPriceResponse;
}

export function BtcPriceHeader() {
  // BTC 头部价格与主表保持一致，统一按 1 分钟轮询。
  const { data, error, fetchedAt } = usePolling(fetchPrice, 60_000);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border-subtle bg-bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-profit" aria-hidden />
        <span className="text-2xs font-medium uppercase tracking-[0.14em] text-fg-muted">
          BTC / USDT
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        {data ? (
          <span className="font-mono text-2xl font-semibold tabular-nums text-fg">
            {formatUsd(data.price, "int")}
          </span>
        ) : (
          <span className="h-7 w-32 animate-pulse rounded bg-bg-muted" aria-hidden />
        )}
        <span className="text-2xs text-fg-dim">Bybit Spot</span>
      </div>

      <div className="ml-auto flex items-center gap-3 text-2xs text-fg-dim">
        {error ? (
          <span className="text-loss" role="status">
            ⚠ {error}
          </span>
        ) : null}
        <span>{fetchedAt ? `更新于 ${formatRelative(fetchedAt)}` : "连接中…"}</span>
      </div>
    </div>
  );
}
