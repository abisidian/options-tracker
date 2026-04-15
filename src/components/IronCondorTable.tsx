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
  value: (c: IronCondorCombo) => number | string;
  render: (c: IronCondorCombo) => React.ReactNode;
}

/**
 * 以 [lowerBE, upperBE] 区间内 PnL 的算术平均作为「平均盈利」。
 * 铁鹰 PnL 曲线呈梯形：两侧从 0 线性爬到扣费后最大盈利，中间 K_ps~K_cs 持平。
 * 面积 = netMaxProfit × (beWidth + profitZoneWidth) / 2；均值 = 面积 / beWidth。
 */
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
    value: (c) => c.putBuyLeg.strike,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg-muted">
        {formatStrike(c.putBuyLeg.strike)}
      </span>
    ),
  },
  {
    key: "putSell",
    label: "Put 卖 K",
    sub: "K_ps",
    align: "right",
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
    value: (c) => c.callBuyLeg.strike,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg-muted">
        {formatStrike(c.callBuyLeg.strike)}
      </span>
    ),
  },
  {
    key: "width",
    label: "宽度",
    sub: "put / call",
    align: "right",
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
    sub: "USD / 合约",
    align: "right",
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
    sub: "4 腿往返",
    align: "right",
    value: (c) => c.feesUsd,
    render: (c) => (
      <span
        className="font-mono tabular-nums text-fg-muted"
        title={`Put买 ${formatUsd(c.putBuyLegFeeUsd)} · Put卖 ${formatUsd(c.putSellLegFeeUsd)} · Call卖 ${formatUsd(c.callSellLegFeeUsd)} · Call买 ${formatUsd(c.callBuyLegFeeUsd)}`}
      >
        {formatUsd(c.feesUsd)}
      </span>
    ),
  },
  {
    key: "riskReward",
    label: "最大盈亏比",
    sub: "maxProfit / loss",
    align: "right",
    value: (c) => c.netRiskReward,
    render: (c) => (
      <span
        className="font-mono tabular-nums font-semibold text-warn"
        title={`扣费后最大盈利 / 扣费后最大亏损；毛盈亏比 ${formatRatio(c.riskReward)}`}
      >
        {formatRatio(c.netRiskReward)}
      </span>
    ),
  },
  {
    key: "avgRiskReward",
    label: "平均盈亏比",
    sub: "avgProfit / loss",
    align: "right",
    value: (c) => avgRiskReward(c),
    render: (c) => (
      <span
        className="font-mono tabular-nums font-semibold text-info"
        title="区间内平均盈利 / 扣费后最大亏损：压低盈利区间过窄的组合"
      >
        {formatRatio(avgRiskReward(c))}
      </span>
    ),
  },
  {
    key: "beWidth",
    label: "盈亏平衡区间",
    sub: "upper − lower",
    align: "right",
    value: (c) => c.upperBreakEven - c.lowerBreakEven,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg">
        {formatStrike(c.upperBreakEven - c.lowerBreakEven)}
      </span>
    ),
  },
  {
    key: "avgProfit",
    label: "平均盈利",
    sub: "盈亏区间内 均值",
    align: "right",
    value: (c) => avgProfitUsd(c),
    render: (c) => (
      <span
        className="font-mono tabular-nums text-profit"
        title="在 [下盈亏平衡, 上盈亏平衡] 区间内对扣费后 PnL 做算术平均：梯形面积 ÷ 区间宽度。用于压低盈利区间过窄、峰值很尖的组合。"
      >
        +{formatUsd(avgProfitUsd(c))}
      </span>
    ),
  },
  {
    key: "profitZone",
    label: "最大盈利区间",
    sub: "K_cs − K_ps",
    align: "right",
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
    value: (c) => c.lowerBreakEven,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg-muted">
        {formatStrike(c.lowerBreakEven)}
      </span>
    ),
  },
  {
    key: "upperBE",
    label: "上盈亏平衡",
    align: "right",
    value: (c) => c.upperBreakEven,
    render: (c) => (
      <span className="font-mono tabular-nums text-fg-muted">
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
  const [lowerBeMin, setLowerBeMin] = useState<string>("");
  const [lowerBeMax, setLowerBeMax] = useState<string>("");
  const [upperBeMin, setUpperBeMin] = useState<string>("");
  const [upperBeMax, setUpperBeMax] = useState<string>("");

  const parseNum = (s: string): number | null => {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  const filtered = useMemo(() => {
    const lMin = parseNum(lowerBeMin);
    const lMax = parseNum(lowerBeMax);
    const uMin = parseNum(upperBeMin);
    const uMax = parseNum(upperBeMax);
    return combos.filter((c) => {
      if (lMin !== null && c.lowerBreakEven < lMin) return false;
      if (lMax !== null && c.lowerBreakEven > lMax) return false;
      if (uMin !== null && c.upperBreakEven < uMin) return false;
      if (uMax !== null && c.upperBreakEven > uMax) return false;
      return true;
    });
  }, [combos, lowerBeMin, lowerBeMax, upperBeMin, upperBeMax]);

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const arr = [...filtered];
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
  }, [filtered, sortKey, sortDir]);

  const onHeaderClick = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

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
        className="cursor-pointer border-b border-border-subtle/60 transition-colors last:border-b-0 hover:bg-bg-muted/60"
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
      <div className="flex flex-col gap-2 border-b border-border-subtle bg-bg-elevated/60 px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-6 items-center rounded border border-info/30 bg-info/10 px-2 font-mono text-2xs font-semibold text-info"
              title="Iron Condor = Bear Call Spread + Bull Put Spread"
            >
              IC
            </span>
            <span className="text-xs font-medium text-fg">铁鹰组合</span>
            <span className="text-2xs text-fg-dim">
              BCS + BPS · 已过滤 最大盈亏比 ≥ 0.3（扣除 Bybit 手续费后）· 点击行查看盈亏曲线
            </span>
          </div>
          <span className="text-2xs text-fg-dim">
            共{" "}
            <span className="font-mono tabular-nums text-fg">{sorted.length}</span>{" "}
            / {combos.length} 个
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-fg-dim">
          <BeRangeFilter
            label="下盈亏平衡"
            minVal={lowerBeMin}
            maxVal={lowerBeMax}
            onMin={setLowerBeMin}
            onMax={setLowerBeMax}
          />
          <BeRangeFilter
            label="上盈亏平衡"
            minVal={upperBeMin}
            maxVal={upperBeMax}
            onMin={setUpperBeMin}
            onMax={setUpperBeMax}
          />
          {lowerBeMin || lowerBeMax || upperBeMin || upperBeMax ? (
            <button
              type="button"
              onClick={() => {
                setLowerBeMin("");
                setLowerBeMax("");
                setUpperBeMin("");
                setUpperBeMax("");
              }}
              className="focus-ring rounded border border-border-subtle px-2 py-0.5 text-fg-muted hover:text-fg"
            >
              清除筛选
            </button>
          ) : null}
        </div>
      </div>
      <div className="max-h-[520px] overflow-auto">
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
                    aria-sort={
                      ariaSort as "ascending" | "descending" | "none"
                    }
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
        className="h-3 w-3 opacity-40"
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
    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      {dir === "asc" ? (
        <path d="M6 2 L10 8 L2 8 Z" />
      ) : (
        <path d="M6 10 L2 4 L10 4 Z" />
      )}
    </svg>
  );
}

function BeRangeFilter({
  label,
  minVal,
  maxVal,
  onMin,
  onMax,
}: {
  label: string;
  minVal: string;
  maxVal: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}) {
  const inputCls =
    "h-6 w-20 rounded border border-border-subtle bg-bg-card px-1.5 font-mono text-2xs tabular-nums text-fg placeholder:text-fg-dim focus:border-info focus:outline-none";
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-fg-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        placeholder="min"
        value={minVal}
        onChange={(e) => onMin(e.target.value)}
        className={inputCls}
      />
      <span className="text-fg-dim">~</span>
      <input
        type="number"
        inputMode="decimal"
        placeholder="max"
        value={maxVal}
        onChange={(e) => onMax(e.target.value)}
        className={inputCls}
      />
    </label>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
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
        className="px-4 py-12 text-center text-sm text-fg-dim"
      >
        当前到期日没有最大盈亏比 ≥ 0.3 的铁鹰组合（已扣除 Bybit 手续费）
      </td>
    </tr>
  );
}
