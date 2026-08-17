/**
 * Amadeus certification — the client's booking test cases.
 *
 * These mirror the four scenarios the client's Amadeus analyst asked us to cover:
 *
 *   TC1  One-way, 1 ADT              Sell → PNR → Price → TST → Issue → Cancel(void)
 *   TC2  Round-trip, 2 ADT + 1 CHD   + seat / meal / baggage SSRs
 *   TC3  One-way, 1 ADT              + paid seat with EMD issuance
 *   TC4  One-way, 1 ADT              Fare-family / booking-class upsell
 *
 * The passenger names, routes and dates below are representative test data — plug
 * in the client's exact test-sheet values before the certified run. Everything is
 * derived through the same builders as production (src/lib/amadeus-booking.ts), so
 * what we shape-verify here is exactly what the live flow will send.
 */
import type {
  BookingInput,
  BookingPassenger,
  BookingContact,
  SellSegment,
  FormOfPayment,
  AncillarySelection,
  PlannedMessage,
  BookingFlowResult,
} from "./amadeus-booking";
import { planBookingMessages, runBookingFlow } from "./amadeus-booking";
import { makeAmadeusCollector, buildAmadeusBundle, type CertFile } from "./amadeus-cert-export";

const CONTACT: BookingContact = {
  email: "test.traveller@touristleader.com",
  phone: "9876543210",
  phoneCountry: "91",
};

const CASH: FormOfPayment = { type: "CASH" };

const CARD: FormOfPayment = {
  type: "CARD",
  vendor: "VI",
  cardNumber: "4111111111111111",
  expiry: "1230",
  holder: "TEST TRAVELLER",
};

/** ddMMyy offset helper — N days from `base` (YYYY-MM-DD). */
export function plusDays(base: string, days: number): string {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const ADT = (ref: number, title: string, first: string, last: string): BookingPassenger => ({
  ref,
  type: "ADT",
  title,
  firstName: first,
  lastName: last,
});
const CHD = (ref: number, title: string, first: string, last: string, dob: string): BookingPassenger => ({
  ref,
  type: "CHD",
  title,
  firstName: first,
  lastName: last,
  dateOfBirth: dob,
});
const INF = (ref: number, title: string, first: string, last: string, dob: string, attachedToRef: number): BookingPassenger => ({
  ref,
  type: "INF",
  title,
  firstName: first,
  lastName: last,
  dateOfBirth: dob,
  attachedToRef,
});

export interface AmadeusCertCase {
  id: string;
  title: string;
  input: BookingInput;
  ancillaries?: AncillarySelection[];
  emd?: boolean;
  cancel?: boolean;
}

/**
 * Build all four cert cases relative to a base date, matching the Amadeus IBE
 * certification scenario sheet exactly:
 *
 *   TC1  1 ADT + 1 CHD + 1 INF   One Way      book + ticket issuance
 *   TC2  2 ADT + 1 CHD + 1 INF   Round Trip   ≥1 connecting flight, then CANCEL
 *   TC3  1 ADT + 1 CHD + 1 INF   Round Trip   ≥1 connecting flight, seat/bag/meal + EMD
 *   TC4  1 ADT + 1 CHD           Round Trip   Fare Family / Upsell fares
 */
export function buildCertCases(baseDate: string): AmadeusCertCase[] {
  const dep = plusDays(baseDate, 30);
  const ret = plusDays(baseDate, 37);
  const chdDob = plusDays(baseDate, -2555); // ~7 years
  const infDob = plusDays(baseDate, -540); // ~18 months

  const seg = (
    from: string,
    to: string,
    date: string,
    flightNumber: string,
    bookingClass: string,
    group = 1,
    carrier = "AI",
  ): SellSegment => ({ from, to, departDate: date, carrier, flightNumber, bookingClass, group });

  // A connecting onward leg DEL→BLR via HYD (OD group 1) + a direct return BLR→DEL (OD group 2).
  const connectingRoundTrip = (): SellSegment[] => [
    seg("DEL", "HYD", dep, "559", "M", 1),
    seg("HYD", "BLR", dep, "542", "M", 1),
    seg("BLR", "DEL", ret, "804", "M", 2),
  ];

  // TC1 — one way, 1 ADT + 1 CHD + 1 INF, book + ticket issuance.
  const tc1: AmadeusCertCase = {
    id: "TC1",
    title: "One Way · 1 ADT + 1 CHD + 1 INF · booking + ticket issuance",
    input: {
      passengers: [
        ADT(1, "MR", "ARJUN", "SHARMA"),
        CHD(2, "MSTR", "AARAV", "SHARMA", chdDob),
        INF(3, "MISS", "AADHYA", "SHARMA", infDob, 1),
      ],
      contact: CONTACT,
      segments: [seg("DEL", "BOM", dep, "805", "M", 1)],
      fop: CASH,
      receivedFrom: "TOURISTLEADER",
    },
  };

  // TC2 — round trip w/ ≥1 connecting flight, 2 ADT + 1 CHD + 1 INF, book + ticket then CANCEL.
  const tc2: AmadeusCertCase = {
    id: "TC2",
    title: "Round Trip (connecting) · 2 ADT + 1 CHD + 1 INF · booking + ticketing → cancellation",
    input: {
      passengers: [
        ADT(1, "MR", "ARJUN", "SHARMA"),
        ADT(2, "MRS", "PRIYA", "SHARMA"),
        CHD(3, "MSTR", "AARAV", "SHARMA", chdDob),
        INF(4, "MISS", "AADHYA", "SHARMA", infDob, 1),
      ],
      contact: CONTACT,
      segments: connectingRoundTrip(),
      fop: CARD,
      receivedFrom: "TOURISTLEADER",
    },
    cancel: true,
  };

  // TC3 — round trip w/ ≥1 connecting flight, 1 ADT + 1 CHD + 1 INF, seat/bag/meal + EMD.
  const tc3: AmadeusCertCase = {
    id: "TC3",
    title: "Round Trip (connecting) · 1 ADT + 1 CHD + 1 INF · ancillaries (seat/bag/meal) + EMD",
    input: {
      passengers: [
        ADT(1, "MR", "ROHAN", "GUPTA"),
        CHD(2, "MISS", "SAANVI", "GUPTA", chdDob),
        INF(3, "MSTR", "VIVAAN", "GUPTA", infDob, 1),
      ],
      contact: CONTACT,
      segments: connectingRoundTrip(),
      fop: CARD,
      receivedFrom: "TOURISTLEADER",
    },
    ancillaries: [
      { paxRef: 1, segmentRef: 1, ssrType: "RQST", seat: "12A", carrier: "AI" }, // seat, onward seg 1 (DEL-HYD)
      { paxRef: 1, segmentRef: 2, ssrType: "RQST", seat: "14C", carrier: "AI" }, // seat, onward seg 2 (HYD-BLR)
      { paxRef: 1, segmentRef: 1, ssrType: "VGML", carrier: "AI" }, // vegetarian meal
      { paxRef: 2, segmentRef: 1, ssrType: "CHML", carrier: "AI" }, // child meal
      { paxRef: 1, segmentRef: 1, ssrType: "BAGS", quantity: 1, carrier: "AI", freetext: "1PC" }, // extra baggage
    ],
    emd: true,
  };

  // TC4 — round trip, 1 ADT + 1 CHD, Fare Family / Upsell fares (flex booking class).
  const tc4: AmadeusCertCase = {
    id: "TC4",
    title: "Round Trip · 1 ADT + 1 CHD · Fare Family / Upsell fares",
    input: {
      passengers: [ADT(1, "MR", "KARAN", "MEHTA"), CHD(2, "MSTR", "REYANSH", "MEHTA", chdDob)],
      contact: CONTACT,
      // Upsell / flexible fare-family booking class (e.g. "S") vs the lowest "M".
      segments: [seg("DEL", "BOM", dep, "805", "S", 1), seg("BOM", "DEL", ret, "888", "S", 2)],
      fop: CASH,
      receivedFrom: "TOURISTLEADER",
    },
  };

  return [tc1, tc2, tc3, tc4];
}

/** Convenience: planned request envelopes for one case (for cert docs / shape checks). */
export function planCase(c: AmadeusCertCase): PlannedMessage[] {
  return planBookingMessages(c.input, { ancillaries: c.ancillaries, emd: c.emd, cancel: c.cancel });
}

export interface CertRunResult {
  result: BookingFlowResult;
  files: CertFile[];
}

/**
 * Run ONE cert case live (opens a stateful session), capturing every SOAP
 * request/response into the numbered submission bundle. Requires a whitelisted
 * IP + booking-service entitlements on the WSAP — otherwise the flow returns
 * `sold:false` with the gateway fault recorded in `result.errors` (and the
 * captured envelopes still export, so the fault is fully documented).
 */
export async function runCertCase(c: AmadeusCertCase): Promise<CertRunResult> {
  const collector = makeAmadeusCollector();
  try {
    const result = await runBookingFlow(c.input, { ancillaries: c.ancillaries, emd: c.emd, cancel: c.cancel });
    return { result, files: buildAmadeusBundle(collector.exchanges, { case: `${c.id} · ${c.title}` }) };
  } finally {
    collector.stop();
  }
}
