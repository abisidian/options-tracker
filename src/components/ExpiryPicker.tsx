"use client";

import { formatDays } from "@/lib/format";
import type { ExpiryInfo } from "@/lib/types";

interface Props {
  expiries: ExpiryInfo[];
  value: string | null;
  onChange: (label: string) => void;
  loading?: boolean;
}

export function ExpiryPicker({ expiries, value, onChange, loading }: Props) {
  if (loading && expiries.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xs uppercase tracking-wider text-fg-muted">
          到期日
        </span>
        <div
          className="h-9 w-40 animate-pulse rounded-lg bg-bg-muted"
          aria-hidden
        />
      </div>
    );
  }

  if (expiries.length === 0) {
    return (
      <div className="text-2xs text-fg-dim">暂无可用到期日</div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="expiry-select"
        className="text-2xs font-medium uppercase tracking-[0.14em] text-fg-muted"
      >
        到期日
      </label>
      <div className="relative">
        <select
          id="expiry-select"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="focus-ring h-9 cursor-pointer appearance-none rounded-lg border border-border bg-bg-card pl-3 pr-8 font-mono text-sm text-fg transition-colors hover:border-info"
        >
          {expiries.map((e) => (
            <option key={e.label} value={e.label}>
              {e.label} · {formatDays(e.daysToExpiry)} · {e.count} 合约
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.38a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}
