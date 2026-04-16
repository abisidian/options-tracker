"use client";

interface SelectChevronProps {
  className?: string;
}

// 筛选输入框统一视觉规范：亮暗主题下保持清晰边框、hover 和可见焦点态。
export const filterInputClassName =
  "h-8 w-24 rounded-lg border border-border-subtle bg-bg-elevated/80 px-2.5 font-mono text-xs tabular-nums text-fg shadow-sm shadow-black/[0.03] transition-[border-color,background-color,box-shadow] placeholder:text-fg-dim/55 hover:border-border hover:bg-bg-card focus:border-info focus:outline-none focus:ring-2 focus:ring-info/20";

// 筛选下拉框统一视觉规范：隐藏浏览器默认箭头，预留右侧空间给自定义箭头。
export const filterSelectClassName =
  "h-8 min-w-24 cursor-pointer appearance-none rounded-lg border border-border-subtle bg-bg-elevated/80 pl-2.5 pr-8 font-mono text-xs tabular-nums text-fg shadow-sm shadow-black/[0.03] transition-[border-color,background-color,box-shadow] hover:border-border hover:bg-bg-card focus:border-info focus:outline-none focus:ring-2 focus:ring-info/20";

// 到期日选择框承载更长文案，尺寸略大于筛选区控件以匹配页面层级。
export const expirySelectClassName =
  "h-9 min-w-44 cursor-pointer appearance-none rounded-lg border border-border-subtle bg-bg-elevated/80 pl-3 pr-9 font-mono text-sm tabular-nums text-fg shadow-sm shadow-black/[0.03] transition-[border-color,background-color,box-shadow] hover:border-border hover:bg-bg-card focus:border-info focus:outline-none focus:ring-2 focus:ring-info/20";

// SelectChevron 统一所有 select 的下拉提示，避免不同浏览器原生控件样式不一致。
export function SelectChevron({
  className = "right-2 h-3.5 w-3.5",
}: SelectChevronProps) {
  return (
    <svg
      className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-fg-dim ${className}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.38a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}
