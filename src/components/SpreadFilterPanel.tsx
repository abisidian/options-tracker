"use client";

import { useMemo } from "react";
import type { SpreadCombo } from "@/lib/types";
import { formatStrike } from "@/lib/format";
import {
  SelectChevron,
  filterInputClassName,
  filterSelectClassName,
} from "./FormControls";

export interface SpreadFilterCriteria {
  breakEvenMin: string;
  breakEvenMax: string;
  sellStrike: string; // "" = 全部
  buyStrike: string;  // "" = 全部
}

export const EMPTY_SPREAD_FILTER: SpreadFilterCriteria = {
  breakEvenMin: "",
  breakEvenMax: "",
  sellStrike: "",
  buyStrike: "",
};

// parseNum 将筛选输入转换为数值；空字符串代表不过滤该条件。
function parseNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// applySpreadFilter 根据盈亏平衡点和腿部行权价筛选 Credit Spread 组合。
export function applySpreadFilter(
  combos: SpreadCombo[],
  f: SpreadFilterCriteria,
): SpreadCombo[] {
  const beMin = parseNum(f.breakEvenMin);
  const beMax = parseNum(f.breakEvenMax);
  const sellK = parseNum(f.sellStrike);
  const buyK = parseNum(f.buyStrike);

  // 逐项短路判断，保持筛选条件彼此独立且易于扩展。
  return combos.filter((c) => {
    if (beMin !== null && c.breakEven < beMin) return false;
    if (beMax !== null && c.breakEven > beMax) return false;
    if (sellK !== null && c.sellLeg.strike !== sellK) return false;
    if (buyK !== null && c.buyLeg.strike !== buyK) return false;
    return true;
  });
}

interface Props {
  combos: SpreadCombo[];
  value: SpreadFilterCriteria;
  onChange: (next: SpreadFilterCriteria) => void;
  filteredCount: number;
}

// SpreadFilterPanel 渲染 Credit Spread 的筛选控件和当前命中数量。
export function SpreadFilterPanel({
  combos,
  value,
  onChange,
  filteredCount,
}: Props) {
  // 卖腿行权价去重后排序，供下拉框稳定展示。
  const sellStrikes = useMemo(() => {
    const set = new Set<number>();
    for (const c of combos) set.add(c.sellLeg.strike);
    return Array.from(set).sort((a, b) => a - b);
  }, [combos]);

  // 买腿行权价去重后排序，供下拉框稳定展示。
  const buyStrikes = useMemo(() => {
    const set = new Set<number>();
    for (const c of combos) set.add(c.buyLeg.strike);
    return Array.from(set).sort((a, b) => a - b);
  }, [combos]);

  const hasFilter =
    value.breakEvenMin ||
    value.breakEvenMax ||
    value.sellStrike ||
    value.buyStrike;

  // update 合并局部筛选条件，避免调用方重复展开当前值。
  const update = (patch: Partial<SpreadFilterCriteria>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border-subtle bg-bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-fg">筛选条件</span>
          <span className="text-2xs text-fg-dim">Credit Spread</span>
        </div>
        <span className="font-mono text-2xs text-fg-dim">
          <span className="tabular-nums text-fg-muted">{filteredCount}</span>
          <span className="mx-0.5">/</span>
          <span className="tabular-nums">{combos.length}</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-2xs text-fg-dim">
        {/* 盈亏平衡点范围 */}
        <RangeFilter
          label="盈亏平衡"
          minVal={value.breakEvenMin}
          maxVal={value.breakEvenMax}
          onMin={(v) => update({ breakEvenMin: v })}
          onMax={(v) => update({ breakEvenMax: v })}
        />

        {/* 卖腿 */}
        <StrikeSelect
          label="卖腿 K"
          value={value.sellStrike}
          strikes={sellStrikes}
          onChange={(v) => update({ sellStrike: v })}
        />

        {/* 买腿 */}
        <StrikeSelect
          label="买腿 K"
          value={value.buyStrike}
          strikes={buyStrikes}
          onChange={(v) => update({ buyStrike: v })}
        />

        {hasFilter ? (
          <button
            type="button"
            onClick={() => onChange(EMPTY_SPREAD_FILTER)}
            className="focus-ring rounded px-2 py-0.5 text-fg-dim transition-colors hover:text-fg-muted"
          >
            清除
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- 子组件 ---------- */

// RangeFilter 渲染最小值和最大值两个数值输入框。
function RangeFilter({
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
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-fg-dim">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        aria-label={`${label} 最小值`}
        placeholder="min"
        value={minVal}
        onChange={(e) => onMin(e.target.value)}
        className={filterInputClassName}
      />
      <span className="text-fg-dim/50">~</span>
      <input
        type="number"
        inputMode="decimal"
        aria-label={`${label} 最大值`}
        placeholder="max"
        value={maxVal}
        onChange={(e) => onMax(e.target.value)}
        className={filterInputClassName}
      />
    </label>
  );
}

// StrikeSelect 渲染行权价下拉框，并复用统一表单控件样式。
function StrikeSelect({
  label,
  value,
  strikes,
  onChange,
}: {
  label: string;
  value: string;
  strikes: number[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-fg-dim">{label}</span>
      <span className="relative inline-flex">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={filterSelectClassName}
        >
          <option value="">全部</option>
          {strikes.map((k) => (
            <option key={k} value={String(k)}>
              {formatStrike(k)}
            </option>
          ))}
        </select>
        <SelectChevron />
      </span>
    </label>
  );
}
