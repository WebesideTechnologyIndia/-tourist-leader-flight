/**
 * Issues a real flight ticket through whichever supplier sold the fare.
 *
 * This is the bridge between checkout and the two booking pipelines that were
 * already written against the suppliers' certification docs:
 *
 *   Amadeus → `amadeus-booking.ts:runBookingFlow()`  (Sell → PNR → Price → TST →
 *             Issue), driven by the RBDs captured during search.
 *   Benzy   → `benzy-booking.ts:runBookingFlow()`    (SSR → SmartPricer →
 *             CreateItinerary → StartPay HB/HP → RetrieveBooking), driven by the
 *             master TUI + journey Index captured during search.
 *
 * Two rules this module exists to enforce:
 *
 *  1. A PNR is only ever what a supplier returned. If the supplier cannot be
 *     reached, or the fare on screen was never live (no `bookingRef`), this
 *     throws. Nothing here generates a booking code — a customer must never
 *     receive a confirmation for a seat that does not exist.
 *  2. Ticketing spends real money — Benzy's StartPay draws on the agent's
 *     Deposit wallet and Amadeus TKT issues a real e-ticket. So live ticketing
 *     needs its own opt-in (`FLIGHT_BOOKING_LIVE=1`) on top of the per-supplier
 *     live flag, mirroring how `BUS_BOOKING_LIVE` guards the bus wallet.
 */
import { paxTypes } from "./fare-rules";
import {
  runBookingFlow as amadeusBook,
  amadeusBookingConfigured,
  pnrRetrieve,
  cancelTicket as amadeusCancelTicket,
  pnrCancel,
  signOut,
  ticketNumbers as ticketNumbersFrom,
  type BookingPassenger,
} from "./amadeus-booking";
import { getSignature, runBookingFlow as benzyBook, type Traveller, type ContactInfo } from "./benzy-booking";

/** One passenger as collected by the checkout form. */
export interface BookingPax {
  fullName: string;
  dob?: string;
  gender?: string;
  nationality?: string;
}

export interface IssueTicketInput {
  flight: Flight;
  /** Return / multi-city legs chosen alongside the primary flight. */
  extraFlights?: { flight?: Flight }[];
  passengers: BookingPax[];
  travellers: TravellerCount;
  contactEmail: string;
  contactPhone: string;
  query: SearchQuery;
  /** Who made the booking, for Amadeus' Received-From element. */
  receivedFrom?: string;
}

export interface IssuedTicket {
  supplier: "AMADEUS" | "BENZY";
  /** The airline PNR / booking reference as returned by the supplier. */
  pnr: string;
  ticketNumbers: string[];
  /** Supplier-side transaction handle, kept for later retrieve / cancel. */
  supplierRef?: string;
  ticketed: boolean;
}

/**
 * A ticket could not be issued. `retryable` distinguishes a transport problem
 * (timeout, IP not whitelisted) from a rejection by the supplier, so the caller
 * can decide between "try again" and "hold for staff".
 */
export class SupplierBookingError extends Error {
  readonly supplier: string;
  readonly retryable: boolean;
  constructor(supplier: string, message: string, retryable = false) {
    super(message);
    this.name = "SupplierBookingError";
    this.supplier = supplier;
    this.retryable = retryable;
  }
}

/** Live ticketing is off unless explicitly switched on — see the note above. */
export function ticketingEnabled(): boolean {
  return process.env.FLIGHT_BOOKING_LIVE === "1";
}

/* ------------------------------------------------------------------ *
 * Passenger mapping
 * ------------------------------------------------------------------ */

/** "Priya Ramesh Nair" → first "Priya Ramesh", last "Nair". Single word → both. */
function splitName(fullName: string): { first: string; last: string } {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function isFemale(gender?: string): boolean {
  return (gender || "").trim().toUpperCase().startsWith("F");
}

/** Airline title conventions differ for minors, so type drives it as much as gender. */
function title(gender: string | undefined, ptc: "ADT" | "CHD" | "INF"): string {
  if (ptc === "ADT") return isFemale(gender) ? "MS" : "MR";
  return isFemale(gender) ? "MISS" : "MSTR";
}

/** Same titles in the mixed case Benzy's certification payloads use. */
function benzyTitle(gender: string | undefined, ptc: "ADT" | "CHD" | "INF"): string {
  if (ptc === "ADT") return isFemale(gender) ? "Ms" : "Mr";
  return isFemale(gender) ? "Miss" : "Mstr";
}

function ptcOf(type: string): "ADT" | "CHD" | "INF" {
  return type === "Child" ? "CHD" : type === "Infant" ? "INF" : "ADT";
}

/** Whole years between a DOB and the travel date — Benzy wants an explicit Age. */
function ageOn(dob: string | undefined, onDate: string): number {
  if (!dob) return 0;
  const d = new Date(dob), ref = new Date(onDate);
  if (Number.isNaN(+d) || Number.isNaN(+ref)) return 0;
  let age = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age--;
  return Math.max(0, age);
}

/* ------------------------------------------------------------------ *
 * Amadeus
 * ------------------------------------------------------------------ */

function amadeusPassengers(pax: BookingPax[], types: string[]): BookingPassenger[] {
  // Infants travel on an adult's booking, so each is attached to one — in form
  // order, the first infant to the first adult, and so on.
  const adultRefs = types.map((t, i) => (t === "Adult" ? i + 1 : 0)).filter(Boolean);
  let infantSeen = 0;
  return pax.map((p, i) => {
    const ptc = ptcOf(types[i] || "Adult");
    const { first, last } = splitName(p.fullName);
    const passenger: BookingPassenger = {
      ref: i + 1,
      type: ptc,
      title: title(p.gender, ptc),
      firstName: first,
      lastName: last,
      dateOfBirth: p.dob || undefined,
    };
    if (ptc === "INF") passenger.attachedToRef = adultRefs[infantSeen++] || adultRefs[0] || 1;
    return passenger;
  });
}

async function issueViaAmadeus(input: IssueTicketInput, ref: FlightBookingRef, extra: FlightBookingRef[]): Promise<IssuedTicket> {
  if (!amadeusBookingConfigured()) {
    throw new SupplierBookingError("AMADEUS", "Amadeus credentials are not configured", true);
  }
  // Later legs continue the OD numbering so Amadeus reads them as one journey.
  const segments = [...(ref.segments || [])];
  extra.forEach((r, legIdx) => {
    (r.segments || []).forEach((s) => segments.push({ ...s, group: legIdx + 2 }));
  });
  if (!segments.length) {
    throw new SupplierBookingError("AMADEUS", "No sellable segments on the selected fare");
  }

  const types = paxTypes(input.travellers);
  const result = await amadeusBook({
    passengers: amadeusPassengers(input.passengers, types),
    contact: { email: input.contactEmail, phone: (input.contactPhone || "").replace(/\D/g, ""), phoneCountry: "91" },
    segments,
    fop: { type: "CASH" },
    receivedFrom: input.receivedFrom || "TOURISTLEADER",
  });

  if (!result.pnr) {
    throw new SupplierBookingError("AMADEUS", result.errors.join("; ") || "Amadeus returned no PNR");
  }
  return {
    supplier: "AMADEUS",
    pnr: result.pnr,
    ticketNumbers: result.ticketNumbers || [],
    supplierRef: result.pnr,
    ticketed: result.ticketed,
  };
}

/* ------------------------------------------------------------------ *
 * Benzy (Akbar Travels)
 * ------------------------------------------------------------------ */

function benzyTravellers(pax: BookingPax[], types: string[], travelDate: string): Traveller[] {
  return pax.map((p, i) => {
    const ptc = ptcOf(types[i] || "Adult");
    const { first, last } = splitName(p.fullName);
    return {
      ID: i + 1,
      Title: benzyTitle(p.gender, ptc),
      FName: first.toUpperCase(),
      LName: last.toUpperCase(),
      Age: ageOn(p.dob, travelDate),
      DOB: p.dob || "",
      Gender: isFemale(p.gender) ? "F" : "M",
      PTC: ptc,
      Nationality: p.nationality || "IN",
    };
  });
}

async function issueViaBenzy(input: IssueTicketInput, ref: FlightBookingRef, extra: FlightBookingRef[]): Promise<IssuedTicket> {
  const auth = await getSignature();
  if (!auth) {
    throw new SupplierBookingError("BENZY", "Benzy signature failed — is the server IP whitelisted?", true);
  }

  // Every leg must belong to the same search: the TUI is what ties them together.
  const mismatched = extra.find((r) => r.tui && ref.tui && r.tui !== ref.tui);
  if (mismatched) {
    throw new SupplierBookingError("BENZY", "Itinerary legs came from different searches; please search again");
  }
  const legs = [ref, ...extra]
    .filter((r) => r.index)
    .map((r) => ({ index: r.index!, amount: r.amount || 0 }));
  if (!legs.length) {
    throw new SupplierBookingError("BENZY", "No journey index on the selected fare");
  }

  const types = paxTypes(input.travellers);
  const { first, last } = splitName(input.passengers[0]?.fullName || "");
  const contact: ContactInfo = {
    FName: first,
    LName: last,
    Mobile: (input.contactPhone || "").replace(/\D/g, ""),
    Email: input.contactEmail,
    CountryCode: "IN",
  };

  const result = await benzyBook(auth, {
    masterTui: ref.tui!,
    tripType: legs.length > 1 ? "RT" : "ON",
    legs,
    travellers: benzyTravellers(input.passengers, types, input.query.departDate),
    contact,
  });

  const pnr = result.pnrs?.[0] || "";
  if (!pnr) {
    throw new SupplierBookingError("BENZY", "Benzy returned no PNR");
  }
  return {
    supplier: "BENZY",
    pnr,
    ticketNumbers: result.pnrs.slice(1),
    supplierRef: String(result.transactionId),
    ticketed: result.isTicketed,
  };
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

/**
 * Book and ticket the selected itinerary with its supplier.
 * Throws `SupplierBookingError` rather than returning a placeholder — the caller
 * is responsible for holding the booking and telling the customer the truth.
 */
export async function issueTicket(input: IssueTicketInput): Promise<IssuedTicket> {
  const ref = input.flight?.bookingRef;
  if (!ref) {
    throw new SupplierBookingError(
      String(input.flight?.source || "UNKNOWN"),
      "This fare was not returned by a live supplier search, so it cannot be ticketed",
    );
  }
  if (!ticketingEnabled()) {
    throw new SupplierBookingError(ref.supplier, "Live ticketing is off (set FLIGHT_BOOKING_LIVE=1)", true);
  }

  const extra = (input.extraFlights || [])
    .map((e) => e.flight?.bookingRef)
    .filter((r): r is FlightBookingRef => !!r);
  if (extra.length !== (input.extraFlights || []).length) {
    throw new SupplierBookingError(ref.supplier, "One of the selected legs cannot be ticketed");
  }

  try {
    return ref.supplier === "AMADEUS"
      ? await issueViaAmadeus(input, ref, extra)
      : await issueViaBenzy(input, ref, extra);
  } catch (err) {
    if (err instanceof SupplierBookingError) throw err;
    // Network/timeout/parse failures are retryable — the seat may still be free.
    throw new SupplierBookingError(ref.supplier, (err as Error).message || "Supplier booking failed", true);
  }
}

/* ------------------------------------------------------------------ *
 * Cancellation
 * ------------------------------------------------------------------ */

/**
 * Release a ticketed booking with the supplier.
 *
 * Refunding the customer while the airline still holds the seat leaves a live
 * ticket nobody is paying for, so the caller must land this before refunding.
 * Throws if the supplier could not be told — the booking then stays open for
 * staff instead of being marked cancelled on our side alone.
 */
export async function cancelWithSupplier(opts: { supplier: string; pnr: string; ticketNumbers?: string[] }): Promise<void> {
  if (!opts.pnr) throw new SupplierBookingError(opts.supplier, "Booking has no supplier PNR to cancel");
  if (!ticketingEnabled()) {
    throw new SupplierBookingError(opts.supplier, "Live ticketing is off (set FLIGHT_BOOKING_LIVE=1)", true);
  }

  if (opts.supplier === "AMADEUS") {
    if (!amadeusBookingConfigured()) {
      throw new SupplierBookingError("AMADEUS", "Amadeus credentials are not configured", true);
    }
    // Retrieve into a session, void each e-ticket, then cancel the PNR itself.
    const retrieved = await pnrRetrieve(opts.pnr, null);
    let session = retrieved.session;
    try {
      if (retrieved.fault) {
        throw new SupplierBookingError("AMADEUS", `PNR_Retrieve: ${retrieved.fault}`, true);
      }
      const tickets = opts.ticketNumbers?.length ? opts.ticketNumbers : ticketNumbersFrom(retrieved.xml);
      for (const tn of tickets) {
        const res = await amadeusCancelTicket(tn, session);
        session = res.session;
        if (res.fault) throw new SupplierBookingError("AMADEUS", `Ticket_CancelDocument ${tn}: ${res.fault}`);
      }
      const cancelled = await pnrCancel(session, true);
      session = cancelled.session;
      if (cancelled.fault) throw new SupplierBookingError("AMADEUS", `PNR_Cancel: ${cancelled.fault}`);
      session = null; // PNR_Cancel closed the series
    } finally {
      if (session) await signOut(session).catch(() => { });
    }
    return;
  }

  // Benzy's cancellation service is documented in the WRC portal but is not
  // implemented here yet — pretending to cancel would be worse than refusing.
  throw new SupplierBookingError(
    opts.supplier,
    "Cancellation with Akbar/Benzy is not wired up yet — cancel this booking in the supplier portal and mark it here",
  );
}
