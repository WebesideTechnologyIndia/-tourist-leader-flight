import { NextRequest, NextResponse } from "next/server";
import { searchFlights as benzySearch, fareCalendar } from "@/lib/benzy";
import { amadeusConfigured, searchFlights as amadeusSearch } from "@/lib/amadeus";
import type { SearchQuery, TripType, CabinClass, Flight } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseQuery(sp: URLSearchParams): SearchQuery {
  return {
    tripType: (sp.get("tripType") as TripType) || "ONE_WAY",
    from: sp.get("from") || "DEL",
    to: sp.get("to") || "BOM",
    departDate: sp.get("departDate") || new Date().toISOString().slice(0, 10),
    returnDate: sp.get("returnDate") || undefined,
    cabinClass: (sp.get("cabinClass") as CabinClass) || "Economy",
    travellers: {
      adults: Number(sp.get("adults") || 1),
      children: Number(sp.get("children") || 0),
      infants: Number(sp.get("infants") || 0),
    },
    passengerType: sp.get("passengerType") || "REGULAR",
  };
}

export async function GET(req: NextRequest) {
  const q = parseQuery(req.nextUrl.searchParams);

  // Search flights concurrently from both API sources: Amadeus (AM) and Benzy / Akbar (AK)
  const [amadeusRes, benzyRes] = await Promise.all([
    amadeusConfigured() ? amadeusSearch(q) : Promise.resolve({ flights: [] as Flight[], live: false }),
    benzySearch(q),
  ]);

  // Combine results from both APIs so both AM and AK flight cards are visible in the UI
  const allFlights: Flight[] = [
    ...(amadeusRes.flights || []),
    ...(benzyRes.flights || []),
  ];

  // Sort combined results by base price
  allFlights.sort((a, b) => a.basePrice - b.basePrice);

  const isLive = amadeusRes.live || benzyRes.live;

  return NextResponse.json({
    query: q,
    flights: allFlights,
    calendar: fareCalendar(q),
    live: isLive,
  });
}
