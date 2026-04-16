"use client";

import { useMemo } from "react";
import type { IronCondorCombo } from "@/lib/types";
import { formatStrike } from "@/lib/format";
import {
  SelectChevron,
  filterInputClassName,
  filterSelectClassName,
} from "./FormControls";

export interface IronCondorFilterCriteria {
  lowerBeMin: string;
  lowerBeMax: string;
  upperBeMin: string;
  upperBeMax: string;
  putSellStrike: string;  // "" = 全部
  callSellStrike: string; // "" = 全部
}

export const EMPTY_IC_FILTER: IronCondorFilterCriteria = {
  lowerBeMin: "",
  lowerBeMax: "",
  upperBeMin: "",
  upperBeMax: "",
  putSellStrike: "",
  callSellStrike: "",
};

// parseNum 将筛选输入转换为数值；空字符串代表不过滤该条件。
function parseNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// applyIronCondorFilter 根据上下盈亏平衡点和卖腿行权价筛选铁鹰组合。
export function applyIronCondorFilter(
  combos: IronCondorCombo[],
  f: IronCondorFilterCriteria,
): IronCondorCombo[] {
  const lMin = parseNum(f.lowerBeMin);
  const lMax = parseNum(f.lowerBeMax);
  const uMin = parseNum(f.upperBeMin);
  const uMax = parseNum(f.upperBeMax);
  const psK = parseNum(f.putSellStrike);
  const csK = parseNum(f.callSellStrike);

  // 逐项短路判断，保持铁鹰各个筛选条件互不影响。
  return combos.filter((c) => {
    if (lMin !== null && c.lowerBreakEven < lMin) return false;
    if (lMax !== null && c.lowerBreakEven > lMax) return false;
    if (uMin !== null && c.upperBreakEven < uMin) return false;
    if (uMax !== null && c.upperBreakEven > uMax) return false;
    if (psK !== null && c.putSellLeg.strike !== psK) return false;
    if (csK !== null && c.callSellLeg.strike !== csK) return false;
    return true;
  });
}

interface Props {
  combos: IronCondorCombo[];
  value: IronCondorFilterCriteria;
  onChange: (next: IronCondorFilterCriteria) => void;
  filteredCount: number;
}

// IronCondorFilterPanel 渲染铁鹰策略的筛选控件和当前命中数量。
export function IronCondorFilterPanel({
  combos,
  value,
  onChange,
  filteredCount,
}: Props) {
  // Put 卖腿行权价去重后排序，保证下拉选项稳定。
  const putSellStrikes = useMemo(() => {
    const set = new Set<number>();
    for (const c of combos) set.add(c.putSellLeg.strike);
    return Array.from(set).sort((a, b) => a - b);
  }, [combos]);

  // Call 卖腿行权价去重后排序，保证下拉选项稳定。
  const callSellStrikes = useMemo(() => {
    const set = new Set<number>();
    for (const c of combos) set.add(c.callSellLeg.strike);
    return Array.from(set).sort((a, b) => a - b);
  }, [combos]);

  const hasFilter =
    value.lowerBeMin ||
    value.lowerBeMax ||
    value.upperBeMin ||
    value.upperBeMax ||
    value.putSellStrike ||
    value.callSellStrike;

  // update 合并局部筛选条件，避免调用方重复展开当前值。
  const update = (patch: Partial<IronCondorFilterCriteria>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border-subtle bg-bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-fg">筛选条件</span>
          <span className="text-2xs text-fg-dim">Iron Condor</span>
        </div>
        <span className="font-mono text-2xs text-fg-dim">
          <span className="tabular-nums text-fg-muted">{filteredCount}</span>
          <span className="mx-0.5">/</span>
          <span className="tabular-nums">{combos.length}</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-2xs text-fg-dim">
        {/* 下盈亏平衡范围 */}
        <RangeFilter
          label="下盈亏平衡"
          minVal={value.lowerBeMin}
          maxVal={value.lowerBeMax}
          onMin={(v) => update({ lowerBeMin: v })}
          onMax={(v) => update({ lowerBeMax: v })}
        />

        {/* 上盈亏平衡范围 */}
        <RangeFilter
          label="上盈亏平衡"
          minVal={value.upperBeMin}
          maxVal={value.upperBeMax}
          onMin={(v) => update({ upperBeMin: v })}
          onMax={(v) => update({ upperBeMax: v })}
        />

        {/* 下卖腿 (Put Sell) */}
        <StrikeSelect
          label="下卖腿 K"
          value={value.putSellStrike}
          strikes={putSellStrikes}
          onChange={(v) => update({ putSellStrike: v })}
        />

        {/* 上卖腿 (Call Sell) */}
        <StrikeSelect
          label="上卖腿 K"
          value={value.callSellStrike}
          strikes={callSellStrikes}
          onChange={(v) => update({ callSellStrike: v })}
        />

        {hasFilter ? (
          <button
            type="button"
            onClick={() => onChange(EMPTY_IC_FILTER)}
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
