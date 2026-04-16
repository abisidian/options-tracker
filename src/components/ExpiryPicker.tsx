"use client";

import { formatDays } from "@/lib/format";
import type { ExpiryInfo } from "@/lib/types";
import { SelectChevron, expirySelectClassName } from "./FormControls";

interface Props {
  expiries: ExpiryInfo[];
  value: string | null;
  onChange: (label: string) => void;
  loading?: boolean;
}

// ExpiryPicker 负责到期日选择，并在加载和空数据时给出稳定占位。
export function ExpiryPicker({ expiries, value, onChange, loading }: Props) {
  if (loading && expiries.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xs font-medium uppercase tracking-wider text-fg-dim">
          到期日
        </span>
        <div
          className="h-8 w-36 animate-pulse rounded-lg bg-bg-muted"
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
        className="text-2xs font-medium uppercase tracking-[0.12em] text-fg-dim"
      >
        到期日
      </label>
      <div className="relative">
        <select
          id="expiry-select"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={expirySelectClassName}
        >
          {expiries.map((e) => (
            <option key={e.label} value={e.label}>
              {e.label} · {formatDays(e.daysToExpiry)} · {e.count} 合约
            </option>
          ))}
        </select>
        <SelectChevron className="right-2.5 h-4 w-4" />
      </div>
    </div>
  );
}
