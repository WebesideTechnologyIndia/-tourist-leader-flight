import { NextRequest, NextResponse } from "next/server";
import { searchBuses } from "@/lib/bdsd";

export const dynamic = "force-dynamic";

/** BDSD echoes UserIp back and logs it, so forward the real caller's address. */
function clientIp(req: NextRequest): string | undefined {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || undefined;
}

function cityId(v: string | null): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = {
    from: sp.get("from") || "Delhi",
    to: sp.get("to") || "Kanpur",
    date: sp.get("date") || new Date().toISOString().slice(0, 10),
    // Sent by BusCitySelect. Required for the 318 city names shared by more than
    // one BDSD id, where the name alone cannot identify the city.
    fromId: cityId(sp.get("fromId")),
    toId: cityId(sp.get("toId")),
  };
  const { buses, live, searchTokenId, reason } = await searchBuses(q, clientIp(req));
  // searchTokenId is required by seatlayout/boardingpoint/blockseat/book.
  return NextResponse.json({ query: q, buses, live, searchTokenId, ...(reason ? { reason } : {}) });
}
