"use client";

import { useEffect, useState } from "react";
import { formatRelative } from "@/lib/format";

/**
 * 返回一个会持续刷新的相对时间文案，例如“12s 前”“3m 前”。
 * 默认按 1 秒刷新，保证秒级文案能跟着时间推进。
 */
export function useRelativeTime(
  timestamp: number | null,
  intervalMs = 1_000,
): string {
  const [, tick] = useState(0);

  useEffect(() => {
    if (!timestamp) return;
    // 相对时间包含秒级展示时，需要按秒触发重渲染，否则“xx s前”会停在旧值上。
    const id = window.setInterval(() => tick((n) => n + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [timestamp, intervalMs]);

  if (!timestamp) return "加载中";
  return formatRelative(timestamp);
}
