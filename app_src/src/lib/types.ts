import type { FlightSource } from "./flight-source";

export type TripType = "ONE_WAY" | "ROUND_TRIP" | "MULTI_CITY" | "GROUP_BOOKING";
export type CabinClass = "Economy" | "Premium" | "Business";
export type FareTypeId = "REGULAR" | "FEE_SAVER" | "COMFORT" | "YOUR_CHOICE";

export interface Airport {
  code: string;
  city: string;
  name: string;
  country: string;
}

export interface TravellerCount {
  adults: number;
  children: number;
  infants: number;
}

export interface SearchQuery {
  tripType: TripType;
  from: string;
  to: string;
  departDate: string;
  returnDate?: string;
  cabinClass: CabinClass;
  travellers: TravellerCount;
  passengerType: string;
}

export interface FareOption {
  id: FareTypeId;
  label: string;
  price: number;
  cabinBaggage: string;
  checkInBaggage: string;
  seat: string;
  meal: string;
  cancellation: string;
  badge?: string;
}

export interface FlightSegment {
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  from: string;
  to: string;
  departTime: string; // ISO
  arriveTime: string; // ISO
  durationMinutes: number;
  /** Amadeus RBD (booking class) from the shopped recommendation — needed to sell. */
  bookingClass?: string;
}

/**
 * What the supplier needs back in order to actually sell this itinerary.
 *
 * A fare on screen is not bookable on its own: each supplier requires a handle
 * that ties the seat back to the search that produced it. Search captures that
 * handle here, the checkout store carries it (the whole `Flight` object is
 * POSTed to /api/bookings), and `issueTicket()` hands it to the supplier.
 *
 * Without this the booking API has no way to issue a real PNR — which is why
 * bookings used to fall back to a locally generated code.
 */
export interface FlightBookingRef {
  supplier: FlightSource;
  /**
   * Amadeus — direct-sell segments with the RBD from the recommendation.
   * `group` is the origin-destination leg (1 = onward, 2 = return).
   */
  segments?: {
    from: string;
    to: string;
    departDate: string; // YYYY-MM-DD
    carrier: string;
    flightNumber: string; // digits only
    bookingClass: string;
    group: number;
  }[];
  /** Benzy — master TUI from ExpressSearch; every later call chains off it. */
  tui?: string;
  /** Benzy — journey `Index` for the chosen fare, e.g. "6E|74". */
  index?: string;
  /** Benzy — the journey amount that `Index` was quoted at. */
  amount?: number;
}

export interface Flight {
  id: string;
  /** Supplier the search was routed to — drives the AK / AM badge. */
  source: FlightSource;
  /** True only when this itinerary came back from a live supplier API. */
  live?: boolean;
  /**
   * Supplier handle needed to sell this fare. Present only on live itineraries —
   * a generated fare has nothing to book against, so `issueTicket()` rejects it
   * rather than inventing a PNR.
   */
  bookingRef?: FlightBookingRef;
  segments: FlightSegment[];
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  from: string;
  to: string;
  departTime: string;
  arriveTime: string;
  durationMinutes: number;
  stops: number;
  layoverAirports: string[];
  refundable: boolean;
  cabinBaggage: string;
  checkInBaggage: string;
  basePrice: number;
  fares: FareOption[];
}
