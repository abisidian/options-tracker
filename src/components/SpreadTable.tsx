"use client";

import { useMemo, useState } from "react";
import {
  formatDelta,
  formatRatio,
  formatStrike,
  formatUsd,
} from "@/lib/format";
import type { Coin, SpreadCombo } from "@/lib/types";
import { SpreadChart } from "./SpreadChart";

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
  coin: Coin;
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
          ? "text-profit bg-profit/8"
          : "text-loss bg-loss/8";
      return (
        <span
          className={`inline-flex h-5 items-center rounded px-1.5 font-mono text-2xs font-medium ${toneClass}`}
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
    label: "卖腿 Delta",
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
    label: "买腿 Delta",
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
    sub: "USD",
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
        className="font-mono tabular-nums font-medium text-profit"
        title={`毛利 +${formatUsd(c.maxProfitUsd)} - 手续费 ${formatUsd(c.feesUsd)}`}
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
        className="font-mono tabular-nums font-medium text-loss"
        title={`毛亏 -${formatUsd(c.maxLossUsd)} + 手续费 ${formatUsd(c.feesUsd)}`}
      >
        -{formatUsd(c.netMaxLossUsd)}
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
        className="font-mono tabular-nums text-fg-dim"
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
          className={`font-mono tabular-nums font-medium ${
            good ? "text-warn" : "text-fg-dim"
          }`}
          title={`毛盈亏比 ${formatRatio(c.riskReward)}`}
        >
          {formatRatio(c.netRiskReward)}
        </span>
      );
    },
  },
  {
    key: "breakEven",
    label: "盈亏平衡",
    align: "right",
    numeric: true,
    value: (c) => c.breakEven,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg-dim">
        {formatStrike(c.breakEven)}
      </span>
    ),
  },
];

/**
 * SpreadTable 渲染价差组合表，并支持点击行打开对应的盈亏曲线弹层。
 */
export function SpreadTable({ combos, loading, coin }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("riskReward");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<SpreadCombo | null>(null);

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

  // 表体统一在这里处理，避免骨架屏、空态和正常数据三套分支散落在 JSX 中。
  const renderBody = () => {
    if (loading && combos.length === 0) {
      return <SkeletonRows />;
    }
    if (sorted.length === 0) {
      return <EmptyRow />;
    }
    return sorted.map((c) => (
      <tr
        key={c.id}
        onClick={() => setSelected(c)}
        title="点击查看盈亏曲线"
        className="cursor-pointer border-b border-border-subtle/50 transition-colors last:border-b-0 hover:bg-bg-muted/40"
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
    ));
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-card">
      <div className="max-h-[calc(100dvh-260px)] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-bg-elevated/95 backdrop-blur-sm">
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
                    className={`border-b border-border-subtle px-3 py-2.5 text-2xs font-medium ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onHeaderClick(col.key)}
                      className={`focus-ring inline-flex items-center gap-1 cursor-pointer transition-colors ${
                        col.align === "right" ? "flex-row-reverse" : ""
                      } ${active ? "text-fg" : "text-fg-dim hover:text-fg-muted"}`}
                    >
                      <span>{col.label}</span>
                      <SortIcon active={active} dir={sortDir} />
                    </button>
                    {col.sub ? (
                      <div
                        className={`mt-0.5 text-[10px] font-normal tracking-normal text-fg-dim ${
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
          <tbody>{renderBody()}</tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border-subtle bg-bg-card px-4 py-2 text-2xs text-fg-dim">
        <span>
          <span className="font-mono tabular-nums text-fg-muted">{sorted.length}</span> 个组合
        </span>
        <span className="hidden sm:inline">点击表头排序，点击行查看曲线</span>
      </div>
      {selected ? (
        <SpreadChart
          combo={selected}
          coin={coin}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return (
      <svg className="h-3 w-3 opacity-30" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
        <path d="M6 2 L9 6 L3 6 Z" />
        <path d="M6 10 L3 6 L9 6 Z" opacity="0.5" />
      </svg>
    );
  }
  return (
    <svg className="h-3 w-3 text-fg-muted" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      {dir === "asc" ? <path d="M6 2 L10 8 L2 8 Z" /> : <path d="M6 10 L2 4 L10 4 Z" />}
    </svg>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-border-subtle/50">
          {COLUMNS.map((col) => (
            <td key={col.key} className="h-row px-3 py-2">
              <div
                className={`h-3.5 animate-pulse rounded bg-bg-muted ${
                  col.align === "right" ? "ml-auto w-14" : "w-8"
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
        <p>当前到期日暂无符合条件的价差组合</p>
        <p className="mt-1 text-2xs">试试切换其他到期日或策略</p>
      </td>
    </tr>
  );
}
