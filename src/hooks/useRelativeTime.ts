"use client";

import { useEffect, useState } from "react";
import { formatRelative } from "@/lib/format";

/**
 * Returns a live-updating relative time string (e.g. "12s 前", "3m 前").
 * Re-renders every `intervalMs` (default 10s) to keep it fresh.
 */
export function useRelativeTime(
  timestamp: number | null,
  intervalMs = 10_000,
): string {
  const [, tick] = useState(0);

  useEffect(() => {
    if (!timestamp) return;
    const id = window.setInterval(() => tick((n) => n + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [timestamp, intervalMs]);

  if (!timestamp) return "加载中";
  return formatRelative(timestamp);
}
