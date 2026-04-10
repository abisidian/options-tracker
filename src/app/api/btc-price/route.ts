import { NextResponse } from "next/server";
import { fetchBtcSpotPrice } from "@/lib/bybit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const price = await fetchBtcSpotPrice();
    return NextResponse.json({ price, fetchedAt: Date.now() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
