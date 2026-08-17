/**
 * Benzy certification — the 9 documented flight test cases as runnable configs.
 *
 * Each case knows its route/trip-type/routing/baggage; the selectors pick a
 * matching journey (and baggage SSRs) from the live search/SSR responses.
 * `generateCertBundle()` runs one case end-to-end with capture on and returns
 * the numbered submission files.
 *
 * Passenger + contact data mirror Benzy's reference bundle (2 ADT / 2 CHD / 2 INF).
 * Dates are computed from a caller-supplied `today` so bookings are always in the
 * future (no hard-coded past dates).
 */
import {
  getSignature,
  runCertBooking,
  type CertBookingInput,
  type CertSearchInput,
  type ContactInfo,
  type Traveller,
  type SearchTrip,
  type SearchJourney,
  type SSRResponse,
  type SSRSelection,
  type BookingFlowResult,
} from "./benzy-booking";
import { makeCaptureCollector, buildCertBundle, type BundleOptions, type CertFile } from "./benzy-cert-export";

/* ---- reference passengers & contact (2 ADT / 2 CHD / 2 INF) ---- */

/** Shift a date by whole years, formatted yyyy-mm-dd. */
function shiftYears(from: Date, years: number): string {
  const d = new Date(from.getTime());
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/**
 * The reference passenger set, with every date derived from `today`.
 *
 * Names / passport numbers / place-of-issue mirror Benzy's reference bundle, but
 * DOB and passport expiry MUST float with the run date: a fixed infant DOB ages
 * past 2 years and the airline then rejects it as an infant, and fixed expiry
 * dates eventually lapse. `Age` stays consistent with the generated DOB.
 */
export function certTravellers(today: Date): Traveller[] {
  return [
    { ID: 1, Title: "Mr", FName: "MAX", LName: "AMINI", Age: 25, DOB: shiftYears(today, -25), Gender: "M", PTC: "ADT", Nationality: "IN", PassportNo: "KJ9284M5L2", PLI: "Cochin", PDOE: shiftYears(today, 4), VisaType: "Visiting Visa" },
    { ID: 2, Title: "Mr", FName: "VAIBHAV", LName: "PUNDIR", Age: 40, DOB: shiftYears(today, -40), Gender: "M", PTC: "ADT", Nationality: "IN", PassportNo: "Z6591729", PLI: "DEHRADUN", PDOE: shiftYears(today, 6), VisaType: "Visiting Visa" },
    { ID: 3, Title: "Mstr", FName: "K", LName: "CHETHAN", Age: 10, DOB: shiftYears(today, -10), Gender: "M", PTC: "CHD", Nationality: "IN", PassportNo: "PL4471B8X9", PLI: "Cochin", PDOE: shiftYears(today, 3), VisaType: "Visiting Visa" },
    { ID: 4, Title: "Miss", FName: "C", LName: "LEKHANA", Age: 10, DOB: shiftYears(today, -10), Gender: "F", PTC: "CHD", Nationality: "IN", PassportNo: "PL4471B8X9", PLI: "Cochin", PDOE: shiftYears(today, 5), VisaType: "Visiting Visa" },
    // Infants must still be under 2 on the travel date, so their DOB tracks `today`.
    { ID: 5, Title: "Miss", FName: "ISHIKA", LName: "SEN", Age: 1, DOB: shiftYears(today, -1), Gender: "F", PTC: "INF", Nationality: "IN", PassportNo: "PL4471B8X9", PLI: "Cochin", PDOE: shiftYears(today, 4), VisaType: "Visiting Visa" },
    { ID: 6, Title: "Mstr", FName: "ISHAN", LName: "SAINI", Age: 1, DOB: shiftYears(today, -1), Gender: "M", PTC: "INF", Nationality: "IN", PassportNo: "KJ9284M5L2", PLI: "Cochin", PDOE: shiftYears(today, 3), VisaType: "Visiting Visa" },
  ];
}

export const CERT_CONTACT: ContactInfo = {
  Title: "",
  FName: "Nithin",
  LName: "Tn",
  Mobile: "9999999999",
  Phone: "",
  Email: "nithin@example.com",
  Address: "Test Street",
  CountryCode: "IN",
  State: "Karnataka",
  City: "Bangalore",
  PIN: "560001",
};

/* ---- the 9 cases ---- */

export interface CertCase {
  id: number;
  name: string; // matches Benzy's folder naming
  tripType: "ON" | "RT";
  from: string;
  to: string;
  onwardOffsetDays: number;
  returnOffsetDays?: number;
  routing: "direct" | "connection";
  baggage: boolean;
}

// BLR–BOM has both non-stop and connecting inventory, so it covers every case.
export const CERT_CASES: CertCase[] = [
  { id: 1, name: "Oneway Booking without Baggage - Direct Flight", tripType: "ON", from: "BLR", to: "BOM", onwardOffsetDays: 30, routing: "direct", baggage: false },
  { id: 2, name: "Round Trip Booking without Baggage - Direct Flight", tripType: "RT", from: "BLR", to: "BOM", onwardOffsetDays: 30, returnOffsetDays: 37, routing: "direct", baggage: false },
  { id: 3, name: "Oneway Booking with Baggage - Direct Flight", tripType: "ON", from: "BLR", to: "BOM", onwardOffsetDays: 30, routing: "direct", baggage: true },
  { id: 4, name: "Round Trip Booking with Baggage - Direct Flight", tripType: "RT", from: "BLR", to: "BOM", onwardOffsetDays: 30, returnOffsetDays: 37, routing: "direct", baggage: true },
  { id: 5, name: "Oneway Booking without Baggage - Connection Flight", tripType: "ON", from: "BLR", to: "BOM", onwardOffsetDays: 30, routing: "connection", baggage: false },
  { id: 6, name: "Round Trip Booking without Baggage - Connection Flight", tripType: "RT", from: "BLR", to: "BOM", onwardOffsetDays: 30, returnOffsetDays: 37, routing: "connection", baggage: false },
  { id: 7, name: "Oneway Booking with Baggage - Connection Flight", tripType: "ON", from: "BLR", to: "BOM", onwardOffsetDays: 30, routing: "connection", baggage: true },
  { id: 8, name: "Round Trip Booking with Baggage - Connection Flight", tripType: "RT", from: "BLR", to: "BOM", onwardOffsetDays: 30, returnOffsetDays: 37, routing: "connection", baggage: true },
  { id: 9, name: "Same day round trip booking", tripType: "RT", from: "BLR", to: "BOM", onwardOffsetDays: 30, returnOffsetDays: 30, routing: "direct", baggage: false },
];

/* ---- journey & SSR selectors ---- */

function stopsOf(j: SearchJourney): number {
  if (typeof j.Stops === "number") return j.Stops;
  return Array.isArray(j.Connections) ? j.Connections.length : 0;
}

function cheapestMatch(journeys: SearchJourney[], routing: "direct" | "connection"): SearchJourney | undefined {
  const want = (j: SearchJourney) => (routing === "direct" ? stopsOf(j) === 0 : stopsOf(j) >= 1);
  return journeys
    .filter((j) => j.Index && want(j))
    .sort((a, b) => (a.NetFare ?? a.GrossFare ?? 0) - (b.NetFare ?? b.GrossFare ?? 0))[0];
}

/** Pick onward (and return, for RT) journeys matching the case's routing. */
export function selectLegs(trips: SearchTrip[], c: CertCase): { index: string; amount: number }[] {
  const onward = cheapestMatch(trips[0]?.Journey || [], c.routing);
  if (!onward?.Index) throw new Error(`Case ${c.id}: no ${c.routing} onward journey found`);
  const legs = [{ index: onward.Index, amount: onward.NetFare ?? onward.GrossFare ?? 0 }];
  if (c.tripType === "RT") {
    const ret = cheapestMatch(trips[1]?.Journey || [], c.routing);
    if (!ret?.Index) throw new Error(`Case ${c.id}: no ${c.routing} return journey found`);
    legs.push({ index: ret.Index, amount: ret.NetFare ?? ret.GrossFare ?? 0 });
  }
  return legs;
}

/**
 * "With baggage": assign the cheapest PAID baggage (SSR Type "2", Charge > 0) on
 * each segment to every adult & child (infants get no paid baggage).
 * NOTE: the FUID/PaxID mapping here should be confirmed against a real SSR
 * response once the IP is whitelisted — it's the one part not runtime-verified.
 */
export function pickBaggageForPax(ssr: SSRResponse, travellers: Traveller[]): { selections: SSRSelection[]; amount: number } {
  const payingPax = travellers.filter((t) => t.PTC !== "INF");
  const selections: SSRSelection[] = [];
  let amount = 0;
  ssr.Trips?.forEach((tr) =>
    tr.Journey?.forEach((j) =>
      j.Segments?.forEach((seg) => {
        const fuid = Number(seg.FUID);
        const bag = (seg.SSR || [])
          .filter((s) => s.Type === "2" && (s.Charge ?? 0) > 0 && s.ID != null)
          .sort((a, b) => (a.Charge ?? 0) - (b.Charge ?? 0))[0];
        if (!bag || bag.ID == null || Number.isNaN(fuid)) return;
        for (const t of payingPax) {
          selections.push({ FUID: fuid, PaxID: t.ID, SSID: bag.ID });
          amount += bag.Charge ?? 0;
        }
      }),
    ),
  );
  return { selections, amount };
}

/* ---- date helper & input builders ---- */

function addDaysISO(today: Date, days: number): string {
  return new Date(today.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

export function certSearchInput(c: CertCase, today: Date): CertSearchInput {
  return {
    from: c.from,
    to: c.to,
    onwardDate: addDaysISO(today, c.onwardOffsetDays),
    returnDate: c.tripType === "RT" ? addDaysISO(today, c.returnOffsetDays ?? c.onwardOffsetDays) : undefined,
    tripType: c.tripType,
    adults: 2,
    children: 2,
    infants: 2,
  };
}

export function certBookingInput(c: CertCase, today: Date): CertBookingInput {
  return {
    search: certSearchInput(c, today),
    selectLegs: (trips) => selectLegs(trips, c),
    travellers: certTravellers(today),
    contact: CERT_CONTACT,
    selectSSR: c.baggage ? pickBaggageForPax : undefined,
  };
}

/* ---- driver ---- */

export interface CertBundle {
  case: CertCase;
  result: BookingFlowResult;
  files: CertFile[];
}

/**
 * Run one certification case end-to-end with capture on and return the numbered
 * submission files. Run cases SEQUENTIALLY (capture uses a single global sink).
 *
 * Signature is called INSIDE the capture window so it lands in the bundle as
 * file 1 — Benzy's reference bundle numbers it the same way.
 */
export async function generateCertBundle(c: CertCase, today: Date, opts: BundleOptions = {}): Promise<CertBundle> {
  const collector = makeCaptureCollector();
  try {
    const auth = await getSignature();
    if (!auth) throw new Error("Benzy Signature failed (check credentials / IP whitelist).");
    const result = await runCertBooking(auth, certBookingInput(c, today));
    return { case: c, result, files: buildCertBundle(collector.exchanges, opts) };
  } finally {
    collector.stop();
  }
}
