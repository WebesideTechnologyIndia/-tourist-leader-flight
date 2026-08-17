/**
 * Which supplier an itinerary came from.
 *
 * Flights are ticketed through two accounts — Akbar Travels (reached via
 * Benzy's B2B API) and Amadeus — and the client asked for the origin to be
 * visible "in flight search and in booking also", short-coded AK / AM, with the
 * booking reference prefixed TLAK / TLAM so a reference on its own identifies
 * the supplier it was ticketed on.
 *
 * `Flight.source` is the supplier the search was routed to, so the badge is
 * correct even while the APIs are still behind their IP whitelist and the fares
 * on screen are demo data. `Flight.live` is what says whether this particular
 * itinerary came back from a real API call; only a live one is recorded against
 * the supplier in the database (see `flightSource()` in the bookings route).
 */
export type FlightSource = "AMADEUS" | "BENZY";

/** Value stored in `Booking.source` when the fare did not come from a live API. */
export const DEMO_SOURCE = "DEMO";

export interface FlightSourceMeta {
  /** Short code shown on screen, per the client's brief. */
  code: string;
  /**
   * Supplier name the way the client refers to it. Internal only — the client
   * asked for the name to be off the customer-facing screens, so search,
   * confirmation and the customer email show `code` alone. The admin bookings
   * table is the one place a supplier is named.
   */
  label: string;
  /** Booking-reference prefix — TLAM4K7QP2 reads as an Amadeus booking. */
  refPrefix: string;
  /**
   * Badge colours. Solid rather than tinted so the code is readable at a glance
   * on a phone, where the chip sits next to the muted grey flight number.
   */
  cls: string;
}

export const FLIGHT_SOURCES: Record<FlightSource, FlightSourceMeta> = {
  AMADEUS: { code: "AM", label: "Amadeus", refPrefix: "TLAM", cls: "bg-indigo-600 text-white ring-indigo-700" },
  BENZY: { code: "AK", label: "Akbar", refPrefix: "TLAK", cls: "bg-teal-600 text-white ring-teal-700" },
};

/** Fallback prefix for bookings with no flight supplier (hotel, bus, demo). */
export const DEFAULT_REF_PREFIX = "TL";

/** Narrow an untrusted value (API body, database row) to a known supplier. */
export function toFlightSource(v: unknown): FlightSource | null {
  return v === "AMADEUS" || v === "BENZY" ? v : null;
}

/** Metadata for a supplier, or null when there is nothing to badge. */
export function sourceMeta(v: unknown): FlightSourceMeta | null {
  const s = toFlightSource(v);
  return s ? FLIGHT_SOURCES[s] : null;
}

/**
 * Booking-reference prefix for a supplier — TLAK / TLAM, else plain TL.
 * Kept to 4 characters so the reference stays the same length as before.
 */
export function refPrefix(v: unknown): string {
  return sourceMeta(v)?.refPrefix ?? DEFAULT_REF_PREFIX;
}
