import { NextRequest, NextResponse } from "next/server";
import { searchHotels } from "@/lib/benzy";
import type { HotelSearchQuery } from "@/lib/hotel-types";

export const dynamic = "force-dynamic";

function parse(sp: URLSearchParams): HotelSearchQuery {
  const today = new Date();
  const tmrw = new Date(today.getTime() + 86400000);
  return {
    city: sp.get("city") || "Goa",
    checkIn: sp.get("checkIn") || today.toISOString().slice(0, 10),
    checkOut: sp.get("checkOut") || tmrw.toISOString().slice(0, 10),
    rooms: Number(sp.get("rooms") || 1),
    adults: Number(sp.get("adults") || 2),
    children: Number(sp.get("children") || 0),
    priceBand: sp.get("priceBand") || undefined,
  };
}

export async function GET(req: NextRequest) {
  const q = parse(req.nextUrl.searchParams);
  const { hotels, live } = await searchHotels(q);
  return NextResponse.json({ query: q, hotels, live });
}
