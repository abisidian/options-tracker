"use client";

import { useMemo, useState } from "react";
import { formatRatio, formatStrike, formatUsd } from "@/lib/format";
import type { Coin, IronCondorCombo } from "@/lib/types";
import { IronCondorChart } from "./IronCondorChart";

type SortKey =
  | "putBuy"
  | "putSell"
  | "callSell"
  | "callBuy"
  | "netCredit"
  | "maxProfit"
  | "maxLoss"
  | "fees"
  | "riskReward"
  | "avgRiskReward"
  | "lowerBE"
  | "upperBE"
  | "beWidth"
  | "profitZone"
  | "avgProfit"
  | "width";

type SortDir = "asc" | "desc";

interface Column {
  key: SortKey;
  label: string;
  sub?: string;
  align: "left" | "right";
  numeric: boolean;
  value: (c: IronCondorCombo) => number | string;
  render: (c: IronCondorCombo) => React.ReactNode;
}

function avgProfitUsd(c: IronCondorCombo): number {
  const beWidth = c.upperBreakEven - c.lowerBreakEven;
  if (!(beWidth > 0)) return 0;
  const profitZoneWidth = c.callSellLeg.strike - c.putSellLeg.strike;
  return (c.netMaxProfitUsd * (beWidth + profitZoneWidth)) / (2 * beWidth);
}

function avgRiskReward(c: IronCondorCombo): number {
  if (!(c.netMaxLossUsd > 0)) return 0;
  return avgProfitUsd(c) / c.netMaxLossUsd;
}

const COLUMNS: Column[] = [
  {
    key: "putBuy",
    label: "Put 买 K",
    sub: "K_pb",
    align: "right",
    numeric: true,
    value: (c) => c.putBuyLeg.strike,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg-dim">
        {formatStrike(c.putBuyLeg.strike)}
      </span>
    ),
  },
  {
    key: "putSell",
    label: "Put 卖 K",
    sub: "K_ps",
    align: "right",
    numeric: true,
    value: (c) => c.putSellLeg.strike,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg">
        {formatStrike(c.putSellLeg.strike)}
      </span>
    ),
  },
  {
    key: "callSell",
    label: "Call 卖 K",
    sub: "K_cs",
    align: "right",
    numeric: true,
    value: (c) => c.callSellLeg.strike,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg">
        {formatStrike(c.callSellLeg.strike)}
      </span>
    ),
  },
  {
    key: "callBuy",
    label: "Call 买 K",
    sub: "K_cb",
    align: "right",
    numeric: true,
    value: (c) => c.callBuyLeg.strike,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg-dim">
        {formatStrike(c.callBuyLeg.strike)}
      </span>
    ),
  },
  {
    key: "width",
    label: "宽度",
    sub: "put / call",
    align: "right",
    numeric: true,
    value: (c) => Math.max(c.putWidth, c.callWidth),
    render: (c) => (
      <span className="font-mono tabular-nums text-fg-dim">
        {formatStrike(c.putWidth)} / {formatStrike(c.callWidth)}
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
    sub: "4 腿往返",
    align: "right",
    numeric: true,
    value: (c) => c.feesUsd,
    render: (c) => (
      <span
        className="font-mono tabular-nums text-fg-dim"
        title={`Put买 ${formatUsd(c.putBuyLegFeeUsd)} · Put卖 ${formatUsd(c.putSellLegFeeUsd)} · Call卖 ${formatUsd(c.callSellLegFeeUsd)} · Call买 ${formatUsd(c.callBuyLegFeeUsd)}`}
      >
        {formatUsd(c.feesUsd)}
      </span>
    ),
  },
  {
    key: "riskReward",
    label: "最大盈亏比",
    sub: "max / loss",
    align: "right",
    numeric: true,
    value: (c) => c.netRiskReward,
    render: (c) => (
      <span
        className="font-mono tabular-nums font-medium text-warn"
        title={`毛盈亏比 ${formatRatio(c.riskReward)}`}
      >
        {formatRatio(c.netRiskReward)}
      </span>
    ),
  },
  {
    key: "avgRiskReward",
    label: "平均盈亏比",
    sub: "avg / loss",
    align: "right",
    numeric: true,
    value: (c) => avgRiskReward(c),
    render: (c) => (
      <span
        className="font-mono tabular-nums font-medium text-info"
        title="区间内平均盈利 / 扣费后最大亏损"
      >
        {formatRatio(avgRiskReward(c))}
      </span>
    ),
  },
  {
    key: "beWidth",
    label: "盈亏平衡区间",
    sub: "upper - lower",
    align: "right",
    numeric: true,
    value: (c) => c.upperBreakEven - c.lowerBreakEven,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg-muted">
        {formatStrike(c.upperBreakEven - c.lowerBreakEven)}
      </span>
    ),
  },
  {
    key: "avgProfit",
    label: "平均盈利",
    sub: "区间均值",
    align: "right",
    numeric: true,
    value: (c) => avgProfitUsd(c),
    render: (c) => (
      <span
        className="font-mono tabular-nums text-profit"
        title="在盈亏平衡区间内对扣费后 PnL 做算术平均"
      >
        +{formatUsd(avgProfitUsd(c))}
      </span>
    ),
  },
  {
    key: "profitZone",
    label: "最大盈利区间",
    sub: "K_cs - K_ps",
    align: "right",
    numeric: true,
    value: (c) => c.callSellLeg.strike - c.putSellLeg.strike,
    render: (c) => {
      const width = c.callSellLeg.strike - c.putSellLeg.strike;
      return (
        <span
          className="font-mono tabular-nums text-profit"
          title={`${formatStrike(c.putSellLeg.strike)} ~ ${formatStrike(c.callSellLeg.strike)}`}
        >
          {formatStrike(width)}
        </span>
      );
    },
  },
  {
    key: "lowerBE",
    label: "下盈亏平衡",
    align: "right",
    numeric: true,
    value: (c) => c.lowerBreakEven,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg-dim">
        {formatStrike(c.lowerBreakEven)}
      </span>
    ),
  },
  {
    key: "upperBE",
    label: "上盈亏平衡",
    align: "right",
    numeric: true,
    value: (c) => c.upperBreakEven,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg-dim">
        {formatStrike(c.upperBreakEven)}
      </span>
    ),
  },
];

interface Props {
  combos: IronCondorCombo[];
  loading: boolean;
  coin: Coin;
}

export function IronCondorTable({ combos, loading, coin }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("riskReward");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<IronCondorCombo | null>(null);

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey);
    if (!col) return combos;
    const arr = [...combos];
    arr.sort((a, b) => {
      const av = col.value(a);
      const bv = col.value(b);
      const delta =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? delta : -delta;
    });
    return arr;
  }, [combos, sortKey, sortDir]);

  const onHeaderClick = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // 数字列保留单行，避免金额和价位被折断；表头改为允许换行，优先消化宽度压力。
  const getCellClassName = (col: Column) =>
    col.numeric
      ? "text-right whitespace-normal break-all sm:whitespace-nowrap"
      : "whitespace-normal break-words text-left";

  // 表头按钮拉满单元格宽度，并允许文字换行，避免长标题把整表撑出横向滚动。
  const getHeaderButtonClassName = (col: Column, active: boolean) =>
    `focus-ring inline-flex w-full min-w-0 items-start gap-1 cursor-pointer whitespace-normal break-words text-left leading-snug transition-colors ${
      col.align === "right" ? "justify-end text-right" : ""
    } ${active ? "text-fg" : "text-fg-dim hover:text-fg-muted"}`;

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
            className={`h-row px-2 py-2 align-top text-xs leading-snug sm:px-3 sm:text-sm ${getCellClassName(
              col,
            )}`}
          >
            {col.render(c)}
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-card">
      <div className="max-h-[520px] overflow-y-auto overflow-x-hidden">
        <table className="w-full table-fixed text-sm">
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
                    aria-sort={
                      ariaSort as "ascending" | "descending" | "none"
                    }
                    className={`border-b border-border-subtle px-2 py-2.5 align-top text-2xs font-medium sm:px-3 ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onHeaderClick(col.key)}
                      className={getHeaderButtonClassName(col, active)}
                    >
                      <span className="whitespace-nowrap">{col.label}</span>
                      <span className="shrink-0">
                        <SortIcon active={active} dir={sortDir} />
                      </span>
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
      {selected ? (
        <IronCondorChart
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
      <svg
        className="h-3 w-3 opacity-30"
        viewBox="0 0 12 12"
        fill="currentColor"
        aria-hidden
      >
        <path d="M6 2 L9 6 L3 6 Z" />
        <path d="M6 10 L3 6 L9 6 Z" opacity="0.5" />
      </svg>
    );
  }
  return (
    <svg className="h-3 w-3 text-fg-muted" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      {dir === "asc" ? (
        <path d="M6 2 L10 8 L2 8 Z" />
      ) : (
        <path d="M6 10 L2 4 L10 4 Z" />
      )}
    </svg>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
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
        className="px-4 py-12 text-center text-sm text-fg-dim"
      >
        {"当前到期日没有盈亏比 >= 0.3 的铁鹰组合"}
      </td>
    </tr>
  );
}
