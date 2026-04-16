"use client";

import { useEffect, useMemo, useState } from "react";
import { formatStrike, formatUsd } from "@/lib/format";
import { ironCondorPayoffCurve } from "@/lib/payoff";
import type { Coin, IronCondorCombo } from "@/lib/types";

interface Props {
  combo: IronCondorCombo;
  coin: Coin;
  onClose: () => void;
}

const WIDTH = 720;
const HEIGHT = 360;
const PAD_L = 64;
const PAD_R = 24;
const PAD_T = 24;
const PAD_B = 40;

/* OKLCH-derived colors for chart elements */
const CHART_COLORS = {
  line: "oklch(0.72 0.12 230)",       // calm blue for PnL curve
  profit: "oklch(0.72 0.17 155)",     // green
  loss: "oklch(0.63 0.20 25)",        // red
  warn: "oklch(0.78 0.14 75)",        // amber - underlying price
  strike: "oklch(0.48 0.015 260)",    // dim - strike lines
  strikeSell: "oklch(0.60 0.10 155)", // muted green - sell strikes
  zero: "oklch(0.38 0.015 260)",      // zero line
  axis: "oklch(0.55 0.015 260)",      // axis labels
  hover: "oklch(0.85 0.005 260)",     // hover crosshair
  profitZone: "oklch(0.72 0.17 155)", // green zone fill
} as const;

export function IronCondorChart({ combo, coin, onClose }: Props) {
  const curve = useMemo(
    () => ironCondorPayoffCurve(combo, coin, { steps: 80 }),
    [combo, coin],
  );

  const [hoverX, setHoverX] = useState<number | null>(null);

  useEffect(() => {
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

    const xScale = (price: number) =>
      PAD_L + ((price - minPrice) / (maxPrice - minPrice)) * (WIDTH - PAD_L - PAD_R);
    const yScale = (pnl: number) =>
      HEIGHT - PAD_B - ((pnl - yMin) / (yMax - yMin)) * (HEIGHT - PAD_T - PAD_B);

    return { xScale, yScale, minPrice, maxPrice, minPnl, maxPnl };
  }, [curve]);

  const linePath = useMemo(() => {
    return curve
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${xScale(pt.price).toFixed(2)} ${yScale(pt.pnl).toFixed(2)}`)
      .join(" ");
  }, [curve, xScale, yScale]);

  const zeroY = yScale(0);

  const hoverPoint = useMemo(() => {
    if (hoverX === null) return null;
    const price =
      minPrice + ((hoverX - PAD_L) / (WIDTH - PAD_L - PAD_R)) * (maxPrice - minPrice);
    if (price < minPrice || price > maxPrice) return null;
    let nearest = curve[0];
    for (const p of curve) {
      if (Math.abs(p.price - price) < Math.abs(nearest.price - price)) nearest = p;
    }
    return nearest;
  }, [hoverX, curve, minPrice, maxPrice]);

  const verticalMarkers: Array<{ x: number; label: string; color: string }> = [
    { x: combo.putBuyLeg.strike, label: `K_pb ${formatStrike(combo.putBuyLeg.strike)}`, color: CHART_COLORS.strike },
    { x: combo.putSellLeg.strike, label: `K_ps ${formatStrike(combo.putSellLeg.strike)}`, color: CHART_COLORS.strikeSell },
    { x: combo.callSellLeg.strike, label: `K_cs ${formatStrike(combo.callSellLeg.strike)}`, color: CHART_COLORS.strikeSell },
    { x: combo.callBuyLeg.strike, label: `K_cb ${formatStrike(combo.callBuyLeg.strike)}`, color: CHART_COLORS.strike },
  ];

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
              铁鹰盈亏曲线 · {combo.expiryLabel}
            </div>
            <div className="font-mono text-2xs text-fg-dim">
              {formatStrike(combo.putBuyLeg.strike)} / {formatStrike(combo.putSellLeg.strike)} /{" "}
              {formatStrike(combo.callSellLeg.strike)} / {formatStrike(combo.callBuyLeg.strike)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded p-1.5 text-fg-dim transition-colors hover:text-fg"
            aria-label="关闭"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
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
              <clipPath id="plot-clip">
                <rect x={PAD_L} y={PAD_T} width={WIDTH - PAD_L - PAD_R} height={HEIGHT - PAD_T - PAD_B} />
              </clipPath>
            </defs>

            {/* Profit zone highlight */}
            {(() => {
              const x1 = xScale(combo.putSellLeg.strike);
              const x2 = xScale(combo.callSellLeg.strike);
              const yTop = yScale(maxPnl);
              return (
                <g>
                  <rect
                    x={x1}
                    y={PAD_T}
                    width={x2 - x1}
                    height={HEIGHT - PAD_T - PAD_B}
                    fill={CHART_COLORS.profitZone}
                    fillOpacity="0.05"
                  />
                  <line
                    x1={x1} x2={x2} y1={yTop} y2={yTop}
                    stroke={CHART_COLORS.profit}
                    strokeWidth="1.5"
                  />
                  <text
                    x={(x1 + x2) / 2} y={PAD_T + 12}
                    textAnchor="middle" fontSize="10"
                    fill={CHART_COLORS.profit}
                    fontFamily="var(--font-geist-sans)"
                  >
                    {formatStrike(combo.putSellLeg.strike)} ~ {formatStrike(combo.callSellLeg.strike)}
                  </text>
                </g>
              );
            })()}

            {/* Zero baseline */}
            <line
              x1={PAD_L} x2={WIDTH - PAD_R} y1={zeroY} y2={zeroY}
              stroke={CHART_COLORS.zero}
              strokeDasharray="4 4" strokeWidth="1"
            />

            {/* Strike lines */}
            {verticalMarkers.map((m) => (
              <line
                key={m.label}
                x1={xScale(m.x)} x2={xScale(m.x)}
                y1={PAD_T} y2={HEIGHT - PAD_B}
                stroke={m.color} strokeOpacity="0.3" strokeWidth="1"
              />
            ))}

            {/* Underlying price */}
            {combo.underlyingPrice >= minPrice && combo.underlyingPrice <= maxPrice ? (
              <line
                x1={xScale(combo.underlyingPrice)} x2={xScale(combo.underlyingPrice)}
                y1={PAD_T} y2={HEIGHT - PAD_B}
                stroke={CHART_COLORS.warn}
                strokeDasharray="3 3" strokeWidth="1"
              />
            ) : null}

            {/* Break-even lines */}
            {[combo.lowerBreakEven, combo.upperBreakEven].map((be) => (
              <line
                key={be}
                x1={xScale(be)} x2={xScale(be)}
                y1={PAD_T} y2={HEIGHT - PAD_B}
                stroke={CHART_COLORS.axis}
                strokeDasharray="2 4" strokeWidth="1" strokeOpacity="0.5"
              />
            ))}

            {/* PnL curve */}
            <path
              d={linePath}
              fill="none" stroke={CHART_COLORS.line}
              strokeWidth="2" clipPath="url(#plot-clip)"
            />

            {/* X axis labels */}
            {verticalMarkers.map((m) => (
              <text
                key={`lbl-${m.label}`}
                x={xScale(m.x)} y={HEIGHT - PAD_B + 14}
                textAnchor="middle" fontSize="10"
                fill={CHART_COLORS.axis}
                fontFamily="var(--font-geist-mono)"
              >
                {formatStrike(m.x)}
              </text>
            ))}

            {/* Y axis labels */}
            <text x={PAD_L - 8} y={yScale(maxPnl)} textAnchor="end" fontSize="10" fill={CHART_COLORS.axis} dominantBaseline="middle" fontFamily="var(--font-geist-mono)">
              {formatUsd(maxPnl)}
            </text>
            <text x={PAD_L - 8} y={yScale(0)} textAnchor="end" fontSize="10" fill={CHART_COLORS.axis} dominantBaseline="middle" fontFamily="var(--font-geist-mono)">
              $0
            </text>
            <text x={PAD_L - 8} y={yScale(minPnl)} textAnchor="end" fontSize="10" fill={CHART_COLORS.axis} dominantBaseline="middle" fontFamily="var(--font-geist-mono)">
              {formatUsd(minPnl)}
            </text>

            {/* Hover indicator */}
            {hoverPoint ? (
              <g>
                <line
                  x1={xScale(hoverPoint.price)} x2={xScale(hoverPoint.price)}
                  y1={PAD_T} y2={HEIGHT - PAD_B}
                  stroke={CHART_COLORS.hover} strokeOpacity="0.15" strokeWidth="1"
                />
                <circle
                  cx={xScale(hoverPoint.price)} cy={yScale(hoverPoint.pnl)}
                  r="3.5"
                  fill={hoverPoint.pnl >= 0 ? CHART_COLORS.profit : CHART_COLORS.loss}
                />
              </g>
            ) : null}
          </svg>

          {/* Stats grid */}
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-2xs sm:grid-cols-4">
            <Stat label="标的现价" value={formatStrike(combo.underlyingPrice)} />
            <Stat label="净权利金" value={formatUsd(combo.netCreditUsd)} tone="profit" />
            <Stat label="手续费" value={`-${formatUsd(combo.feesUsd)}`} tone="loss" />
            <Stat label="最大盈利" value={`+${formatUsd(combo.netMaxProfitUsd)}`} tone="profit" />
            <Stat label="最大亏损" value={`-${formatUsd(combo.netMaxLossUsd)}`} tone="loss" />
            <Stat label="下盈亏平衡" value={formatStrike(combo.lowerBreakEven)} />
            <Stat label="上盈亏平衡" value={formatStrike(combo.upperBreakEven)} />
            <Stat
              label="盈利区间"
              value={`${formatStrike(combo.putSellLeg.strike)} ~ ${formatStrike(combo.callSellLeg.strike)}`}
              tone="profit"
            />
            <Stat label="Put 宽度" value={formatStrike(combo.putWidth)} />
            <Stat label="Call 宽度" value={formatStrike(combo.callWidth)} />
            {hoverPoint ? (
              <Stat
                label="鼠标处"
                value={`${formatStrike(hoverPoint.price)} → ${hoverPoint.pnl >= 0 ? "+" : "-"}${formatUsd(Math.abs(hoverPoint.pnl))}`}
                tone={hoverPoint.pnl >= 0 ? "profit" : "loss"}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

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
