"use client";

import type { SpreadStrategy } from "@/lib/types";

interface Props {
  value: SpreadStrategy[];
  onChange: (next: SpreadStrategy[]) => void;
}

type StrategyModeKey = "All" | SpreadStrategy;

const STRATEGY_MODES: Array<{
  key: StrategyModeKey;
  label: string;
  sub: string;
}> = [
  {
    key: "All",
    label: "全部",
    sub: "同时查看 Sell Call Spread 与 Sell Put Spread",
  },
  {
    key: "BearCall",
    label: "Sell Call Spread",
    sub: "Sell lower-strike call, buy higher-strike call",
  },
  {
    key: "BullPut",
    label: "Sell Put Spread",
    sub: "Sell higher-strike put, buy lower-strike put",
  },
];

function resolveSelectedMode(value: SpreadStrategy[]): StrategyModeKey {
  if (value.length === 2) return "All";
  if (value[0] === "BearCall") return "BearCall";
  if (value[0] === "BullPut") return "BullPut";
  return "All";
}

function toStrategies(mode: StrategyModeKey): SpreadStrategy[] {
  if (mode === "All") {
    return ["BearCall", "BullPut"];
  }
  return [mode];
}

export function StrategyFilter({ value, onChange }: Props) {
  const selectedMode = resolveSelectedMode(value);

  return (
    <div className="flex items-center gap-2">
      <span className="text-2xs font-medium uppercase tracking-[0.12em] text-fg-dim">
        策略
      </span>
      <div
        role="group"
        aria-label="策略切换"
        className="flex overflow-hidden rounded-lg border border-border-subtle"
      >
        {STRATEGY_MODES.map((s, idx) => {
          const active = selectedMode === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onChange(toStrategies(s.key))}
              aria-pressed={active}
              title={s.sub}
              className={[
                "focus-ring h-8 cursor-pointer px-3 text-xs font-medium transition-colors",
                active
                  ? "bg-bg-muted text-fg"
                  : "bg-bg-card text-fg-dim hover:text-fg-muted",
                idx > 0 ? "border-l border-border-subtle" : "",
              ].join(" ")}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
