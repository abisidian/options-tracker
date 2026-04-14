import { NextRequest, NextResponse } from "next/server";
import { fetchSpotPrice } from "@/lib/bybit";
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
    const price = await fetchSpotPrice(coin);
    return NextResponse.json({ coin, price, fetchedAt: Date.now() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
