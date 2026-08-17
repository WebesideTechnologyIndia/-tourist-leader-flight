import { AIRLINES, FARE_TYPES } from "./constants";
import type { Flight, FareOption, FareTypeId, SearchQuery } from "./types";
import type { FlightSource } from "./flight-source";

// Deterministic-ish pseudo random based on a string seed (stable per route+date)
function seeded(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h = (h ^= h >>> 16) >>> 0;
    return h / 4294967296;
  };
}

function buildFares(base: number): FareOption[] {
  return FARE_TYPES.map((f) => {
    const price = Math.round((base * f.multiplier) / 10) * 10;
    const map: Record<string, Partial<FareOption>> = {
      FEE_SAVER: { seat: "Chargeable", meal: "Chargeable", cancellation: "Restrictive" },
      REGULAR: { seat: "Paid selection", meal: "Paid", cancellation: "Standard" },
      COMFORT: { seat: "Free standard seat", meal: "Free veg/non-veg", cancellation: "Lower fees" },
      YOUR_CHOICE: { seat: "Free preferred seat", meal: "Free meals", cancellation: "Free cancellation" },
    };
    return {
      id: f.id as FareTypeId,
      label: f.label,
      price,
      cabinBaggage: "7 kg",
      checkInBaggage: f.id === "YOUR_CHOICE" ? "25 kg" : "15 kg",
      badge: f.badge,
      ...map[f.id],
    } as FareOption;
  });
}

/**
 * Stand-in fares for when a supplier API is unreachable. `source` is the
 * supplier the search was routed to, so the AK / AM badge stays correct while
 * the live APIs are still behind their IP whitelist; `live` is left false so
 * nothing downstream mistakes these for real inventory.
 */
export function generateFlights(q: SearchQuery, source: FlightSource = "BENZY"): Flight[] {
  const rand = seeded(`${q.from}-${q.to}-${q.departDate}`);
  const day = q.departDate;
  const flights: Flight[] = [];
  const count = 9 + Math.floor(rand() * 6);

  for (let i = 0; i < count; i++) {
    const airline = AIRLINES[Math.floor(rand() * AIRLINES.length)];
    const departHour = 5 + Math.floor(rand() * 17);
    const departMin = [0, 10, 15, 25, 40, 50][Math.floor(rand() * 6)];
    const stops = rand() > 0.62 ? (rand() > 0.6 ? 2 : 1) : 0;
    const baseDuration = 90 + Math.floor(rand() * 140);
    const layoverExtra = stops * (45 + Math.floor(rand() * 90));
    const duration = baseDuration + layoverExtra;

    const depart = new Date(`${day}T${String(departHour).padStart(2, "0")}:${String(departMin).padStart(2, "0")}:00`);
    const arrive = new Date(depart.getTime() + duration * 60000);

    const classMult = q.cabinClass === "Business" ? 3.1 : q.cabinClass === "Premium" ? 1.8 : 1;
    const basePrice = Math.round(((2600 + rand() * 6400) * classMult) / 10) * 10;
    const flightNo = `${airline.code} ${100 + Math.floor(rand() * 899)}`;
    const layoverPool = ["HYD", "BLR", "BOM", "DEL", "CCU"].filter((c) => c !== q.from && c !== q.to);

    flights.push({
      id: `${airline.code}${flightNo.replace(/\s/g, "")}-${source.toLowerCase()}-${i}`,
      source,
      live: false,
      airlineCode: airline.code,
      airlineName: airline.name,
      flightNumber: flightNo,
      from: q.from,
      to: q.to,
      departTime: depart.toISOString(),
      arriveTime: arrive.toISOString(),
      durationMinutes: duration,
      stops,
      layoverAirports: stops ? layoverPool.slice(0, stops) : [],
      refundable: rand() > 0.45,
      cabinBaggage: "7 kg",
      checkInBaggage: "15 kg",
      basePrice,
      fares: buildFares(basePrice),
      segments: [
        {
          airlineCode: airline.code,
          airlineName: airline.name,
          flightNumber: flightNo,
          from: q.from,
          to: q.to,
          departTime: depart.toISOString(),
          arriveTime: arrive.toISOString(),
          durationMinutes: duration,
        },
      ],
    });
  }
  return flights.sort((a, b) => a.basePrice - b.basePrice);
}

/** Fare trend for +/- 7 days around the chosen date, for the fare calendar. */
export function generateFareCalendar(q: SearchQuery) {
  const base = new Date(q.departDate);
  const days: { date: string; price: number; cheapest?: boolean }[] = [];
  let min = Infinity;
  for (let d = -7; d <= 7; d++) {
    const date = new Date(base.getTime() + d * 86400000);
    const iso = date.toISOString().slice(0, 10);
    const rand = seeded(`${q.from}-${q.to}-${iso}-cal`);
    const price = Math.round((2600 + rand() * 6000) / 50) * 50;
    min = Math.min(min, price);
    days.push({ date: iso, price });
  }
  return days.map((d) => ({ ...d, cheapest: d.price === min }));
}
