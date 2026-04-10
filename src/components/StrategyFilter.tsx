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
  { key: "All", label: "全部", sub: "同时查看 Bear Call 与 Bull Put" },
  { key: "BearCall", label: "Bear Call", sub: "熊市看涨信用价差" },
  { key: "BullPut", label: "Bull Put", sub: "牛市看跌信用价差" },
];

/**
 * 根据当前选中的策略数组推导按钮模式。
 * 两个策略同时存在时，统一视为“全部”。
 */
function resolveSelectedMode(value: SpreadStrategy[]): StrategyModeKey {
  if (value.length === 2) return "All";
  if (value[0] === "BearCall") return "BearCall";
  if (value[0] === "BullPut") return "BullPut";
  return "All";
}

/**
 * 将按钮模式转换成接口需要的策略数组。
 */
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
      <span className="text-2xs font-medium uppercase tracking-[0.14em] text-fg-muted">
        策略
      </span>
      <div
        role="group"
        aria-label="策略切换"
        className="flex overflow-hidden rounded-lg border border-border"
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
                "focus-ring h-9 cursor-pointer px-3 text-xs font-medium transition-colors",
                active
                  ? "bg-info/15 text-info"
                  : "bg-bg-card text-fg-muted hover:bg-bg-muted hover:text-fg",
                idx > 0 ? "border-l border-border" : "",
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
