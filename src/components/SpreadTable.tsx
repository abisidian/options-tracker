"use client";

import { useMemo, useState } from "react";
import {
  formatDelta,
  formatRatio,
  formatStrike,
  formatUsd,
} from "@/lib/format";
import type { SpreadCombo } from "@/lib/types";

type SortKey =
  | "strategy"
  | "sellStrike"
  | "buyStrike"
  | "sellDelta"
  | "buyDelta"
  | "netCredit"
  | "maxProfit"
  | "maxLoss"
  | "fees"
  | "riskReward"
  | "breakEven"
  | "width";

type SortDir = "asc" | "desc";

interface Column {
  key: SortKey;
  label: string;
  sub?: string;
  align: "left" | "right";
  numeric: boolean;
  value: (c: SpreadCombo) => number | string;
  render: (c: SpreadCombo) => React.ReactNode;
}

interface Props {
  combos: SpreadCombo[];
  loading: boolean;
}

const STRATEGY_META: Record<
  SpreadCombo["strategy"],
  { label: string; tone: "profit" | "loss" }
> = {
  BearCall: { label: "BCS", tone: "loss" },
  BullPut: { label: "BPS", tone: "profit" },
};

const COLUMNS: Column[] = [
  {
    key: "strategy",
    label: "策略",
    align: "left",
    numeric: false,
    value: (c) => c.strategy,
    render: (c) => {
      const meta = STRATEGY_META[c.strategy];
      const toneClass =
        meta.tone === "profit"
          ? "text-profit border-profit/30 bg-profit/10"
          : "text-loss border-loss/30 bg-loss/10";
      return (
        <span
          className={`inline-flex h-6 items-center rounded border px-2 font-mono text-2xs font-semibold ${toneClass}`}
          title={c.strategy === "BearCall" ? "Bear Call Spread" : "Bull Put Spread"}
        >
          {meta.label}
        </span>
      );
    },
  },
  {
    key: "sellStrike",
    label: "卖腿 K",
    sub: "SELL",
    align: "right",
    numeric: true,
    value: (c) => c.sellLeg.strike,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg">
        {formatStrike(c.sellLeg.strike)}
      </span>
    ),
  },
  {
    key: "sellDelta",
    label: "卖腿 Δ",
    align: "right",
    numeric: true,
    value: (c) => Math.abs(c.sellLeg.delta),
    render: (c) => (
      <span className="font-mono tabular-nums text-fg-muted">
        {formatDelta(c.sellLeg.delta)}
      </span>
    ),
  },
  {
    key: "buyStrike",
    label: "买腿 K",
    sub: "BUY",
    align: "right",
    numeric: true,
    value: (c) => c.buyLeg.strike,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg">
        {formatStrike(c.buyLeg.strike)}
      </span>
    ),
  },
  {
    key: "buyDelta",
    label: "买腿 Δ",
    align: "right",
    numeric: true,
    value: (c) => Math.abs(c.buyLeg.delta),
    render: (c) => (
      <span className="font-mono tabular-nums text-fg-muted">
        {formatDelta(c.buyLeg.delta)}
      </span>
    ),
  },
  {
    key: "width",
    label: "价差宽度",
    align: "right",
    numeric: true,
    value: (c) => c.width,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg-dim">
        {formatStrike(c.width)}
      </span>
    ),
  },
  {
    key: "netCredit",
    label: "净权利金",
    sub: "USD / 合约",
    align: "right",
    numeric: true,
    value: (c) => c.netCreditUsd,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg">
        {formatUsd(c.netCreditUsd)}
      </span>
    ),
  },
  {
    key: "maxProfit",
    label: "最大盈利",
    sub: "扣费后",
    align: "right",
    numeric: true,
    value: (c) => c.netMaxProfitUsd,
    render: (c) => (
      <span
        className="font-mono tabular-nums font-semibold text-profit"
        title={`毛利 +${formatUsd(c.maxProfitUsd)} − 手续费 ${formatUsd(c.feesUsd)}`}
      >
        +{formatUsd(c.netMaxProfitUsd)}
      </span>
    ),
  },
  {
    key: "maxLoss",
    label: "最大亏损",
    sub: "含手续费",
    align: "right",
    numeric: true,
    value: (c) => c.netMaxLossUsd,
    render: (c) => (
      <span
        className="font-mono tabular-nums font-semibold text-loss"
        title={`毛亏 −${formatUsd(c.maxLossUsd)} + 手续费 ${formatUsd(c.feesUsd)}`}
      >
        −{formatUsd(c.netMaxLossUsd)}
      </span>
    ),
  },
  {
    key: "fees",
    label: "手续费",
    sub: "2 腿往返",
    align: "right",
    numeric: true,
    value: (c) => c.feesUsd,
    render: (c) => (
      <span
        className="font-mono tabular-nums text-fg-muted"
        title={`卖腿 ${formatUsd(c.sellLegFeeUsd)} · 买腿 ${formatUsd(c.buyLegFeeUsd)}`}
      >
        {formatUsd(c.feesUsd)}
      </span>
    ),
  },
  {
    key: "riskReward",
    label: "净盈亏比",
    sub: "扣费后",
    align: "right",
    numeric: true,
    value: (c) => c.netRiskReward,
    render: (c) => {
      const good = c.netRiskReward >= 0.3;
      return (
        <span
          className={`font-mono tabular-nums font-semibold ${
            good ? "text-warn" : "text-fg-muted"
          }`}
          title={`毛盈亏比 ${formatRatio(c.riskReward)}（未扣费）`}
        >
          {formatRatio(c.netRiskReward)}
        </span>
      );
    },
  },
  {
    key: "breakEven",
    label: "盈亏平衡点",
    align: "right",
    numeric: true,
    value: (c) => c.breakEven,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg-muted">
        {formatStrike(c.breakEven)}
      </span>
    ),
  },
];

export function SpreadTable({ combos, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("riskReward");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey);
    if (!col) return combos;
    const arr = [...combos];
    arr.sort((a, b) => {
      const av = col.value(a);
      const bv = col.value(b);
      let delta: number;
      if (typeof av === "number" && typeof bv === "number") {
        delta = av - bv;
      } else {
        delta = String(av).localeCompare(String(bv));
      }
      return sortDir === "asc" ? delta : -delta;
    });
    return arr;
  }, [combos, sortKey, sortDir]);

  const onHeaderClick = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "strategy" ? "asc" : "desc");
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-card">
      <div className="max-h-[calc(100dvh-260px)] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-bg-elevated/95 backdrop-blur">
            <tr>
              {COLUMNS.map((col) => {
                const active = sortKey === col.key;
                const ariaSort = active
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none";
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort as "ascending" | "descending" | "none"}
                    className={`border-b border-border-subtle px-3 py-2 text-2xs font-medium uppercase tracking-wider ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onHeaderClick(col.key)}
                      className={`focus-ring inline-flex items-center gap-1 cursor-pointer transition-colors ${
                        col.align === "right" ? "flex-row-reverse" : ""
                      } ${active ? "text-info" : "text-fg-muted hover:text-fg"}`}
                    >
                      <span>{col.label}</span>
                      <SortIcon active={active} dir={sortDir} />
                    </button>
                    {col.sub ? (
                      <div
                        className={`mt-0.5 text-[10px] font-normal normal-case tracking-normal text-fg-dim ${
                          col.align === "right" ? "text-right" : "text-left"
                        }`}
                      >
                        {col.sub}
                      </div>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && combos.length === 0 ? (
              <SkeletonRows />
            ) : sorted.length === 0 ? (
              <EmptyRow />
            ) : (
              sorted.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border-subtle/60 transition-colors last:border-b-0 hover:bg-bg-muted/60"
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`h-row whitespace-nowrap px-3 py-2 ${
                        col.align === "right" ? "text-right" : "text-left"
                      }`}
                    >
                      {col.render(c)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border-subtle bg-bg-card px-4 py-2 text-2xs text-fg-dim">
        <span>
          共 <span className="font-mono tabular-nums text-fg">{sorted.length}</span> 个组合
        </span>
        <span className="hidden sm:inline">点击表头切换排序 · 默认按盈亏比降序</span>
      </div>
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return (
      <svg className="h-3 w-3 opacity-40" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
        <path d="M6 2 L9 6 L3 6 Z" />
        <path d="M6 10 L3 6 L9 6 Z" opacity="0.5" />
      </svg>
    );
  }
  return (
    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      {dir === "asc" ? <path d="M6 2 L10 8 L2 8 Z" /> : <path d="M6 10 L2 4 L10 4 Z" />}
    </svg>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-border-subtle/60">
          {COLUMNS.map((col) => (
            <td key={col.key} className="h-row px-3 py-2">
              <div
                className={`h-4 animate-pulse rounded bg-bg-muted ${
                  col.align === "right" ? "ml-auto w-16" : "w-10"
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyRow() {
  return (
    <tr>
      <td
        colSpan={COLUMNS.length}
        className="px-4 py-16 text-center text-sm text-fg-dim"
      >
        <div className="mx-auto flex max-w-md flex-col items-center gap-2">
          <svg className="h-8 w-8 text-fg-dim/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>当前到期日暂无符合 Call Δ&gt;0.1 且 K&gt;现价 / Put Δ&lt;-0.1 且 K&lt;现价 的价差组合</p>
          <p className="text-2xs">试试切换其他到期日或策略</p>
        </div>
      </td>
    </tr>
  );
}
