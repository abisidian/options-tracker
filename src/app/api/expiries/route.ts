import { NextRequest, NextResponse } from "next/server";
import { deriveExpiries, fetchOptionTickers } from "@/lib/bybit";
import type { Coin } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCoin(req: NextRequest): Coin {
  const v = req.nextUrl.searchParams.get("coin");
  return v === "ETH" ? "ETH" : "BTC";
}

export async function GET(req: NextRequest) {
  const coin = parseCoin(req);
  try {
    const tickers = await fetchOptionTickers(coin);
    const expiries = deriveExpiries(tickers);
    return NextResponse.json({ coin, expiries, fetchedAt: Date.now() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
