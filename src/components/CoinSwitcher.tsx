"use client";

import { COINS } from "@/lib/types";
import type { Coin } from "@/lib/types";

interface Props {
  value: Coin;
  onChange: (coin: Coin) => void;
}

export function CoinSwitcher({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="切换币种"
      className="inline-flex items-center rounded-lg border border-border-subtle bg-bg-card p-0.5 text-2xs"
    >
      {COINS.map((coin) => {
        const active = coin === value;
        return (
          <button
            key={coin}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(coin)}
            className={`focus-ring rounded-md px-2.5 py-1 font-mono font-medium tracking-wide transition-colors cursor-pointer ${
              active
                ? "bg-bg-muted text-fg"
                : "text-fg-dim hover:text-fg-muted"
            }`}
          >
            {coin}
          </button>
        );
      })}
    </div>
  );
}
