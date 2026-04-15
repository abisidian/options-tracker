import { NextRequest, NextResponse } from "next/server";
import { fetchOptionTickers } from "@/lib/bybit";
import { buildIronCondors, buildSpreadsForExpiry } from "@/lib/spreads";
import type { Coin, SpreadStrategy, SpreadsResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCoin(req: NextRequest): Coin {
  const v = req.nextUrl.searchParams.get("coin");
  return v === "ETH" ? "ETH" : "BTC";
}

export async function GET(req: NextRequest) {
  const expiryLabel = req.nextUrl.searchParams.get("expiry");
  if (!expiryLabel) {
    return NextResponse.json(
      { error: "Missing required query param: expiry" },
      { status: 400 },
    );
  }
  const coin = parseCoin(req);

  const stratParam = req.nextUrl.searchParams.get("strategies");
  const strategies: SpreadStrategy[] | undefined = stratParam
    ? (stratParam
        .split(",")
        .map((s) => s.trim())
        .filter(
          (s): s is SpreadStrategy => s === "BearCall" || s === "BullPut",
        ))
    : undefined;

  try {
    const tickers = await fetchOptionTickers(coin);
    const sample = tickers.find((t) => t.expiryLabel === expiryLabel);
    if (!sample) {
      return NextResponse.json(
        { error: `Unknown expiry: ${expiryLabel}` },
        { status: 404 },
      );
    }
    const { combos, counts, underlyingPrice } = buildSpreadsForExpiry({
      tickers,
      expiryLabel,
      coin,
      strategies,
    });

    // Iron Condor 独立板块：始终基于完整的 BCS/BPS 池计算（不受 strategies 过滤影响）。
    const { combos: fullCombos } =
      strategies === undefined
        ? { combos }
        : buildSpreadsForExpiry({
            tickers,
            expiryLabel,
            coin,
          });
    const bearCallCombos = fullCombos.filter((c) => c.strategy === "BearCall");
    const bullPutCombos = fullCombos.filter((c) => c.strategy === "BullPut");
    const ironCondors = buildIronCondors(
      bearCallCombos,
      bullPutCombos,
      coin,
      expiryLabel,
    );

    const daysToExpiry = Math.max(
      0,
      (sample.expiryMs - Date.now()) / (24 * 60 * 60 * 1000),
    );

    const payload: SpreadsResponse = {
      fetchedAt: Date.now(),
      coin,
      underlyingPrice,
      expiryLabel,
      expiryMs: sample.expiryMs,
      daysToExpiry,
      counts: { ...counts, ironCondor: ironCondors.length },
      combos,
      ironCondors,
    };

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
