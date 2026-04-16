const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const usdIntFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numFmt = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

/**
 * 格式化美元金额，保留现有货币符号展示。
 */
export function formatUsd(value: number, mode: "full" | "int" = "full"): string {
  if (!Number.isFinite(value)) return "—";
  return (mode === "int" ? usdIntFmt : usdFmt).format(value);
}

/**
 * 格式化行权价/标的价格，统一输出完整数字，避免 2.3k 这类缩写影响辨识。
 */
export function formatStrike(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return numFmt.format(value);
}

/**
 * 按指定精度格式化普通数字。
 */
export function formatNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(decimals);
}

/**
 * 格式化 Delta，并保留正负号。
 */
export function formatDelta(delta: number): string {
  if (!Number.isFinite(delta)) return "—";
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(3)}`;
}

/**
 * 格式化盈亏比。
 */
export function formatRatio(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}x`;
}

/**
 * 格式化剩余天数，小于一天时转成小时展示。
 */
export function formatDays(days: number): string {
  if (!Number.isFinite(days)) return "—";
  if (days < 1) {
    const hours = Math.max(0, Math.round(days * 24));
    return `${hours}h`;
  }
  return `${Math.round(days)}d`;
}

/**
 * 格式化相对时间。
 */
export function formatRelative(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const diffSec = Math.round((Date.now() - ms) / 1000);
  if (diffSec < 5) return "刚刚";
  if (diffSec < 60) return `${diffSec}s 前`;
  const m = Math.floor(diffSec / 60);
  return `${m}m 前`;
}
