"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { formatStrike, formatUsd } from "@/lib/format";
import { spreadPayoffCurve } from "@/lib/payoff";
import type { Coin, SpreadCombo } from "@/lib/types";

interface Props {
  combo: SpreadCombo;
  coin: Coin;
  onClose: () => void;
}

const WIDTH = 720;
const HEIGHT = 360;
const PAD_L = 64;
const PAD_R = 24;
const PAD_T = 24;
const PAD_B = 40;

/* 价差曲线沿用现有图表色板，保持和铁鹰弹层一致。 */
const CHART_COLORS = {
  line: "oklch(0.72 0.12 230)",
  profit: "oklch(0.72 0.17 155)",
  loss: "oklch(0.63 0.20 25)",
  warn: "oklch(0.78 0.14 75)",
  strike: "oklch(0.48 0.015 260)",
  strikeSell: "oklch(0.60 0.10 155)",
  zero: "oklch(0.38 0.015 260)",
  axis: "oklch(0.55 0.015 260)",
  hover: "oklch(0.85 0.005 260)",
  profitZone: "oklch(0.72 0.17 155)",
} as const;

/**
 * SpreadChart 渲染两腿信用价差的到期盈亏曲线，并提供 hover 读数与关键价位标记。
 */
export function SpreadChart({ combo, coin, onClose }: Props) {
  const curve = useMemo(
    () => spreadPayoffCurve(combo, coin, { steps: 80 }),
    [combo, coin],
  );
  const clipPathId = `spread-plot-${useId().replaceAll(":", "")}`;
  const [hoverX, setHoverX] = useState<number | null>(null);

  useEffect(() => {
    // 允许用户用 ESC 直接关闭弹层。
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { xScale, yScale, minPrice, maxPrice, minPnl, maxPnl } = useMemo(() => {
    const prices = curve.map((p) => p.price);
    const pnls = curve.map((p) => p.pnl);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const minPnl = Math.min(...pnls);
    const maxPnl = Math.max(...pnls);
    const pnlPad = (maxPnl - minPnl) * 0.1 || 1;
    const yMin = minPnl - pnlPad;
    const yMax = maxPnl + pnlPad;

    return {
      minPrice,
      maxPrice,
      minPnl,
      maxPnl,
      xScale: (price: number) =>
        PAD_L + ((price - minPrice) / (maxPrice - minPrice)) * (WIDTH - PAD_L - PAD_R),
      yScale: (pnl: number) =>
        HEIGHT - PAD_B - ((pnl - yMin) / (yMax - yMin)) * (HEIGHT - PAD_T - PAD_B),
    };
  }, [curve]);

  const linePath = useMemo(
    () =>
      curve
        .map(
          (pt, i) =>
            `${i === 0 ? "M" : "L"} ${xScale(pt.price).toFixed(2)} ${yScale(pt.pnl).toFixed(2)}`,
        )
        .join(" "),
    [curve, xScale, yScale],
  );

  const hoverPoint = useMemo(() => {
    if (hoverX === null) return null;
    const price =
      minPrice + ((hoverX - PAD_L) / (WIDTH - PAD_L - PAD_R)) * (maxPrice - minPrice);
    if (price < minPrice || price > maxPrice) return null;

    let nearest = curve[0];
    for (const point of curve) {
      if (Math.abs(point.price - price) < Math.abs(nearest.price - price)) {
        nearest = point;
      }
    }
    return nearest;
  }, [curve, hoverX, maxPrice, minPrice]);

  // 固定渲染“鼠标处”统计项，避免 hover 前后增删节点导致弹层重新居中而跳动。
  const hoverStat: { value: string; tone?: "profit" | "loss" } = hoverPoint
    ? {
        value: `${formatStrike(hoverPoint.price)} → ${hoverPoint.pnl >= 0 ? "+" : "-"}${formatUsd(Math.abs(hoverPoint.pnl))}`,
        tone: hoverPoint.pnl >= 0 ? "profit" : "loss",
      }
    : {
        value: "--",
        tone: undefined,
      };

  const verticalMarkers = [
    {
      x: combo.sellLeg.strike,
      label: `K_sell ${formatStrike(combo.sellLeg.strike)}`,
      color: CHART_COLORS.strikeSell,
    },
    {
      x: combo.buyLeg.strike,
      label: `K_buy ${formatStrike(combo.buyLeg.strike)}`,
      color: CHART_COLORS.strike,
    },
  ];
  const zeroY = yScale(0);
  const profitZoneLabel =
    combo.strategy === "BearCall"
      ? `<= ${formatStrike(combo.sellLeg.strike)}`
      : `>= ${formatStrike(combo.sellLeg.strike)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-xl border border-border-subtle bg-bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
          <div className="flex flex-col gap-0.5">
            <div className="text-sm font-medium text-fg">
              价差盈亏曲线 · {combo.expiryLabel}
            </div>
            <div className="font-mono text-2xs text-fg-dim">
              {strategyLabel(combo)} · {formatStrike(combo.sellLeg.strike)} /{" "}
              {formatStrike(combo.buyLeg.strike)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded p-1.5 text-fg-dim transition-colors hover:text-fg"
            aria-label="关闭"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const scale = WIDTH / rect.width;
              setHoverX((e.clientX - rect.left) * scale);
            }}
            onMouseLeave={() => setHoverX(null)}
          >
            <defs>
              <clipPath id={clipPathId}>
                <rect
                  x={PAD_L}
                  y={PAD_T}
                  width={WIDTH - PAD_L - PAD_R}
                  height={HEIGHT - PAD_T - PAD_B}
                />
              </clipPath>
            </defs>

            {/* 用半透明底色标出最大盈利的平台一侧。 */}
            {combo.strategy === "BearCall" ? (
              <rect
                x={PAD_L}
                y={PAD_T}
                width={xScale(combo.sellLeg.strike) - PAD_L}
                height={HEIGHT - PAD_T - PAD_B}
                fill={CHART_COLORS.profitZone}
                fillOpacity="0.05"
              />
            ) : (
              <rect
                x={xScale(combo.sellLeg.strike)}
                y={PAD_T}
                width={WIDTH - PAD_R - xScale(combo.sellLeg.strike)}
                height={HEIGHT - PAD_T - PAD_B}
                fill={CHART_COLORS.profitZone}
                fillOpacity="0.05"
              />
            )}

            <line
              x1={PAD_L}
              x2={WIDTH - PAD_R}
              y1={zeroY}
              y2={zeroY}
              stroke={CHART_COLORS.zero}
              strokeDasharray="4 4"
              strokeWidth="1"
            />

            {verticalMarkers.map((marker) => (
              <line
                key={marker.label}
                x1={xScale(marker.x)}
                x2={xScale(marker.x)}
                y1={PAD_T}
                y2={HEIGHT - PAD_B}
                stroke={marker.color}
                strokeOpacity="0.3"
                strokeWidth="1"
              />
            ))}

            {combo.underlyingPrice >= minPrice && combo.underlyingPrice <= maxPrice ? (
              <line
                x1={xScale(combo.underlyingPrice)}
                x2={xScale(combo.underlyingPrice)}
                y1={PAD_T}
                y2={HEIGHT - PAD_B}
                stroke={CHART_COLORS.warn}
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            ) : null}

            <line
              x1={xScale(combo.breakEven)}
              x2={xScale(combo.breakEven)}
              y1={PAD_T}
              y2={HEIGHT - PAD_B}
              stroke={CHART_COLORS.axis}
              strokeDasharray="2 4"
              strokeWidth="1"
              strokeOpacity="0.5"
            />

            <path
              d={linePath}
              fill="none"
              stroke={CHART_COLORS.line}
              strokeWidth="2"
              clipPath={`url(#${clipPathId})`}
            />

            {verticalMarkers.map((marker) => (
              <text
                key={`label-${marker.label}`}
                x={xScale(marker.x)}
                y={HEIGHT - PAD_B + 14}
                textAnchor="middle"
                fontSize="10"
                fill={CHART_COLORS.axis}
                fontFamily="var(--font-geist-mono)"
              >
                {formatStrike(marker.x)}
              </text>
            ))}

            <text
              x={xScale(combo.strategy === "BearCall" ? minPrice : maxPrice)}
              y={PAD_T + 12}
              textAnchor={combo.strategy === "BearCall" ? "start" : "end"}
              fontSize="10"
              fill={CHART_COLORS.profit}
              fontFamily="var(--font-geist-sans)"
            >
              {profitZoneLabel}
            </text>

            <text
              x={PAD_L - 8}
              y={yScale(maxPnl)}
              textAnchor="end"
              fontSize="10"
              fill={CHART_COLORS.axis}
              dominantBaseline="middle"
              fontFamily="var(--font-geist-mono)"
            >
              {formatUsd(maxPnl)}
            </text>
            <text
              x={PAD_L - 8}
              y={yScale(0)}
              textAnchor="end"
              fontSize="10"
              fill={CHART_COLORS.axis}
              dominantBaseline="middle"
              fontFamily="var(--font-geist-mono)"
            >
              $0
            </text>
            <text
              x={PAD_L - 8}
              y={yScale(minPnl)}
              textAnchor="end"
              fontSize="10"
              fill={CHART_COLORS.axis}
              dominantBaseline="middle"
              fontFamily="var(--font-geist-mono)"
            >
              {formatUsd(minPnl)}
            </text>

            {hoverPoint ? (
              <g>
                <line
                  x1={xScale(hoverPoint.price)}
                  x2={xScale(hoverPoint.price)}
                  y1={PAD_T}
                  y2={HEIGHT - PAD_B}
                  stroke={CHART_COLORS.hover}
                  strokeOpacity="0.15"
                  strokeWidth="1"
                />
                <circle
                  cx={xScale(hoverPoint.price)}
                  cy={yScale(hoverPoint.pnl)}
                  r="3.5"
                  fill={
                    hoverPoint.pnl >= 0 ? CHART_COLORS.profit : CHART_COLORS.loss
                  }
                />
              </g>
            ) : null}
          </svg>

          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-2xs sm:grid-cols-4">
            <Stat label="标的现价" value={formatStrike(combo.underlyingPrice)} />
            <Stat label="净权利金" value={formatUsd(combo.netCreditUsd)} tone="profit" />
            <Stat label="手续费" value={`-${formatUsd(combo.feesUsd)}`} tone="loss" />
            <Stat label="最大盈利" value={`+${formatUsd(combo.netMaxProfitUsd)}`} tone="profit" />
            <Stat label="最大亏损" value={`-${formatUsd(combo.netMaxLossUsd)}`} tone="loss" />
            <Stat label="盈亏平衡" value={formatStrike(combo.breakEven)} />
            <Stat label="最大盈利区" value={profitZoneLabel} tone="profit" />
            <Stat label="价差宽度" value={formatStrike(combo.width)} />
            <Stat label="鼠标处" value={hoverStat.value} tone={hoverStat.tone} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * strategyLabel 将内部策略枚举转换为更直观的标题文字。
 */
function strategyLabel(combo: SpreadCombo): string {
  return combo.strategy === "BearCall"
    ? "Sell Call Spread"
    : "Sell Put Spread";
}

/**
 * Stat 渲染弹层底部的单个指标，沿用现有铁鹰图表的视觉层级。
 */
function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss";
}) {
  const toneClass =
    tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-fg";
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-fg-dim">{label}</span>
      <span className={`font-mono tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}
