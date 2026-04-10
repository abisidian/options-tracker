import { NextResponse } from "next/server";
import { deriveExpiries, fetchBtcOptionTickers } from "@/lib/bybit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tickers = await fetchBtcOptionTickers();
    const expiries = deriveExpiries(tickers);
    return NextResponse.json({ expiries, fetchedAt: Date.now() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
