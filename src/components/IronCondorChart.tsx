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
    { x: combo.putBuyLeg.strike, label: `K_pb ${formatStrike(combo.putBuyLeg.strike)}`, color: "#64748b" },
    { x: combo.putSellLeg.strike, label: `K_ps ${formatStrike(combo.putSellLeg.strike)}`, color: "#22c55e" },
    { x: combo.callSellLeg.strike, label: `K_cs ${formatStrike(combo.callSellLeg.strike)}`, color: "#22c55e" },
    { x: combo.callBuyLeg.strike, label: `K_cb ${formatStrike(combo.callBuyLeg.strike)}`, color: "#64748b" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-xl border border-border-subtle bg-bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <div className="text-sm font-semibold text-fg">
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
            className="focus-ring rounded p-1 text-fg-muted hover:bg-bg-muted hover:text-fg"
            aria-label="关闭"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3">
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
            {/* 背景盈亏区域填充 */}
            <defs>
              <clipPath id="plot-clip">
                <rect x={PAD_L} y={PAD_T} width={WIDTH - PAD_L - PAD_R} height={HEIGHT - PAD_T - PAD_B} />
              </clipPath>
            </defs>

            {/* 最大盈利区间高亮（K_ps ~ K_cs） */}
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
                    fill="#22c55e"
                    fillOpacity="0.08"
                  />
                  <line
                    x1={x1}
                    x2={x2}
                    y1={yTop}
                    y2={yTop}
                    stroke="#22c55e"
                    strokeWidth="2"
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={PAD_T + 12}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#22c55e"
                  >
                    最大盈利区间 {formatStrike(combo.putSellLeg.strike)} ~ {formatStrike(combo.callSellLeg.strike)}
                  </text>
                </g>
              );
            })()}

            {/* Y 轴 0 基线 */}
            <line
              x1={PAD_L}
              x2={WIDTH - PAD_R}
              y1={zeroY}
              y2={zeroY}
              stroke="#475569"
              strokeDasharray="4 4"
              strokeWidth="1"
            />

            {/* 4 个行权价垂直参考线 */}
            {verticalMarkers.map((m) => (
              <g key={m.label}>
                <line
                  x1={xScale(m.x)}
                  x2={xScale(m.x)}
                  y1={PAD_T}
                  y2={HEIGHT - PAD_B}
                  stroke={m.color}
                  strokeOpacity="0.35"
                  strokeWidth="1"
                />
              </g>
            ))}

            {/* 标的现价垂直线 */}
            {combo.underlyingPrice >= minPrice && combo.underlyingPrice <= maxPrice ? (
              <line
                x1={xScale(combo.underlyingPrice)}
                x2={xScale(combo.underlyingPrice)}
                y1={PAD_T}
                y2={HEIGHT - PAD_B}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            ) : null}

            {/* 盈亏平衡点 */}
            {[combo.lowerBreakEven, combo.upperBreakEven].map((be) => (
              <line
                key={be}
                x1={xScale(be)}
                x2={xScale(be)}
                y1={PAD_T}
                y2={HEIGHT - PAD_B}
                stroke="#94a3b8"
                strokeDasharray="2 4"
                strokeWidth="1"
                strokeOpacity="0.6"
              />
            ))}

            {/* PnL 曲线 */}
            <path
              d={linePath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              clipPath="url(#plot-clip)"
            />

            {/* X 轴刻度（4 strikes） */}
            {verticalMarkers.map((m) => (
              <text
                key={`lbl-${m.label}`}
                x={xScale(m.x)}
                y={HEIGHT - PAD_B + 14}
                textAnchor="middle"
                fontSize="10"
                fill="#94a3b8"
              >
                {formatStrike(m.x)}
              </text>
            ))}

            {/* Y 轴刻度 */}
            <text x={PAD_L - 8} y={yScale(maxPnl)} textAnchor="end" fontSize="10" fill="#94a3b8" dominantBaseline="middle">
              {formatUsd(maxPnl)}
            </text>
            <text x={PAD_L - 8} y={yScale(0)} textAnchor="end" fontSize="10" fill="#94a3b8" dominantBaseline="middle">
              $0
            </text>
            <text x={PAD_L - 8} y={yScale(minPnl)} textAnchor="end" fontSize="10" fill="#94a3b8" dominantBaseline="middle">
              {formatUsd(minPnl)}
            </text>

            {/* Hover 指示 */}
            {hoverPoint ? (
              <g>
                <line
                  x1={xScale(hoverPoint.price)}
                  x2={xScale(hoverPoint.price)}
                  y1={PAD_T}
                  y2={HEIGHT - PAD_B}
                  stroke="#e2e8f0"
                  strokeOpacity="0.25"
                  strokeWidth="1"
                />
                <circle
                  cx={xScale(hoverPoint.price)}
                  cy={yScale(hoverPoint.pnl)}
                  r="4"
                  fill={hoverPoint.pnl >= 0 ? "#22c55e" : "#ef4444"}
                />
              </g>
            ) : null}
          </svg>

          {/* 数字汇总 */}
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-2xs text-fg-dim sm:grid-cols-4">
            <Stat label="标的现价" value={formatStrike(combo.underlyingPrice)} />
            <Stat label="净权利金" value={formatUsd(combo.netCreditUsd)} tone="profit" />
            <Stat label="手续费(4腿往返)" value={`−${formatUsd(combo.feesUsd)}`} tone="loss" />
            <Stat label="最大盈利(扣费后)" value={`+${formatUsd(combo.netMaxProfitUsd)}`} tone="profit" />
            <Stat label="最大亏损(含手续费)" value={`−${formatUsd(combo.netMaxLossUsd)}`} tone="loss" />
            <Stat label="下盈亏平衡" value={formatStrike(combo.lowerBreakEven)} />
            <Stat label="上盈亏平衡" value={formatStrike(combo.upperBreakEven)} />
            <Stat
              label="最大盈利区间"
              value={`${formatStrike(combo.putSellLeg.strike)} ~ ${formatStrike(combo.callSellLeg.strike)}`}
              tone="profit"
            />
            <Stat label="Put 宽度" value={formatStrike(combo.putWidth)} />
            <Stat label="Call 宽度" value={formatStrike(combo.callWidth)} />
            {hoverPoint ? (
              <Stat
                label="鼠标处"
                value={`${formatStrike(hoverPoint.price)} → ${hoverPoint.pnl >= 0 ? "+" : "−"}${formatUsd(Math.abs(hoverPoint.pnl))}`}
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
