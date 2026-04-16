"use client";

import { formatUsd } from "@/lib/format";
import { usePolling } from "@/hooks/usePolling";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import type { Coin } from "@/lib/types";

interface PriceResponse {
  coin: Coin;
  price: number;
  fetchedAt: number;
}

interface Props {
  coin: Coin;
}

export function BtcPriceHeader({ coin }: Props) {
  const { data, error, fetchedAt } = usePolling(
    async () => {
      const res = await fetch(`/api/btc-price?coin=${coin}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return (await res.json()) as PriceResponse;
    },
    60_000,
    [coin],
  );

  const relativeTime = useRelativeTime(fetchedAt);
  const priceFormat: "int" | "full" = coin === "BTC" ? "int" : "full";

  return (
    <div className="flex items-center gap-5 rounded-xl border border-border-subtle bg-bg-card px-5 py-3.5">
      <span className="text-2xs font-medium uppercase tracking-[0.12em] text-fg-dim">
        {coin}/USDT
      </span>

      <div className="flex items-baseline gap-2">
        {data ? (
          <span className="font-mono text-xl font-semibold tabular-nums tracking-tight text-fg">
            {formatUsd(data.price, priceFormat)}
          </span>
        ) : (
          <span className="h-6 w-28 animate-pulse rounded bg-bg-muted" aria-hidden />
        )}
        <span className="text-2xs text-fg-dim">Spot</span>
      </div>

      <div className="ml-auto flex items-center gap-3 text-2xs text-fg-dim">
        {error ? (
          <span className="text-loss" role="status">
            {error}
          </span>
        ) : null}
        <span>{relativeTime}</span>
      </div>
    </div>
  );
}
