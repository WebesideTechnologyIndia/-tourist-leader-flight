import { NextRequest, NextResponse } from "next/server";
import { searchCities, cityCount } from "@/lib/bus-cities";

export const dynamic = "force-dynamic";

/**
 * Bus city autocomplete over BDSD's master list.
 *
 * The list is ~15k entries, so it stays on the server and the picker queries
 * this route instead of shipping the dataset to the browser. An empty `q`
 * returns BDSD's featured cities (Delhi, Shimla, Mumbai, Goa).
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") || "";
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 30, 1), 100);
  return NextResponse.json({ query: q, total: cityCount(), cities: searchCities(q, limit) });
}
