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

export function formatUsd(value: number, mode: "full" | "int" = "full"): string {
  if (!Number.isFinite(value)) return "—";
  return (mode === "int" ? usdIntFmt : usdFmt).format(value);
}

export function formatStrike(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return numFmt.format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(decimals);
}

export function formatDelta(delta: number): string {
  if (!Number.isFinite(delta)) return "—";
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(3)}`;
}

export function formatRatio(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}x`;
}

export function formatDays(days: number): string {
  if (!Number.isFinite(days)) return "—";
  if (days < 1) {
    const hours = Math.max(0, Math.round(days * 24));
    return `${hours}h`;
  }
  return `${Math.round(days)}d`;
}

export function formatRelative(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const diffSec = Math.round((Date.now() - ms) / 1000);
  if (diffSec < 5) return "刚刚";
  if (diffSec < 60) return `${diffSec}s 前`;
  const m = Math.floor(diffSec / 60);
  return `${m}m 前`;
}
