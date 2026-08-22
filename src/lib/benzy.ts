/**
 * Benzy Infotech (Akbar Travels B2B) API client.
 *
 * Flow:
 *   1. POST /Utils/Signature  → returns a token (TUI / signature).
 *   2. Pass that token as `Authorization: Bearer <token>` to flight services
 *      (ExpressSearch, GetExpSearch, etc.).
 *
 * NOTE: The Benzy endpoints require the caller's static IP to be whitelisted.
 * Until that is done these calls will fail from a new environment, so every
 * public function degrades gracefully to locally generated data so the UI
 * remains fully functional for development & demos. Set BENZY_LIVE=1 to force
 * live calls only.
 */
import { generateFlights, generateFareCalendar } from "./mock-flights";
import { generateHotels } from "./mock-hotels";
import { DEMO_OFFERS, type Offer } from "./offers";
import type { SearchQuery, Flight } from "./types";
import type { Hotel, HotelSearchQuery } from "./hotel-types";
import { getSignature } from "./benzy-booking";
import { loggedJsonPost } from "./logged-fetch";

const cfg = {
  signatureUrl: process.env.BENZY_SIGNATURE_URL || "https://b2bapiutils.benzyinfotech.com/Utils/Signature",
  flightsUrl: process.env.BENZY_FLIGHTS_URL || "https://b2bapiflights.benzyinfotech.com",
  utilsUrl: process.env.BENZY_UTILS_URL || "https://b2bapiutils.benzyinfotech.com",
  hotelApiUrl: process.env.BENZY_HOTEL_API_URL || "https://travelportalapi.benzyinfotech.com",
  hotelItineraryUrl: process.env.BENZY_HOTEL_ITINERARY_URL || "https://b2bapihotels.benzyinfotech.com",
  merchantId: process.env.BENZY_MERCHANT_ID || "300",
  apiKey: process.env.BENZY_API_KEY || "",
  clientId: process.env.BENZY_CLIENT_ID || "",
  password: process.env.BENZY_PASSWORD || "",
  agentCode: process.env.BENZY_AGENT_CODE || "",
  browserKey: process.env.BENZY_BROWSER_KEY || "",
  key: process.env.BENZY_KEY || "",
  channelId: process.env.BENZY_CHANNEL_ID || "b2bsaudideals",
};

const TIMEOUT_MS = 12000;

async function postJson<T>(url: string, body: unknown, token?: string): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await loggedJsonPost<T>(
      "BENZY",
      url,
      body,
      token,
      undefined,
      controller.signal,
    );
  } finally {
    clearTimeout(t);
  }
}

interface SignatureResponse {
  Token?: string;
  TUI?: string;
  token?: string;
  [k: string]: unknown;
}

/** Step 1 — generate signature/token used as Bearer for subsequent calls. */
export async function getSignatureToken(): Promise<string | null> {
  try {
    const payload = {
      MerchantID: cfg.merchantId,
      ApiKey: cfg.apiKey,
      ClientID: cfg.clientId,
      Password: cfg.password,
      AgentCode: cfg.agentCode,
      BrowserKey: cfg.browserKey,
      Key: cfg.key,
    };
    const data = await postJson<SignatureResponse>(cfg.signatureUrl, payload);
    return data.Token || data.TUI || data.token || null;
  } catch (err) {
    console.warn("[benzy] signature failed, using fallback:", (err as Error).message);
    return null;
  }
}

function cabinCode(c: string) {
  return c === "Business" ? "B" : c === "Premium" ? "PE" : "E";
}

/**
 * Build the ExpressSearch request body, matching Benzy's certification reference
 * (test-cases folder, 1.ExpressSearch.json) exactly. Round-trip is a SINGLE trip entry
 * with ReturnDate set (not two trips); ClientID is the encrypted id from Signature.
 */
function buildSearchBody(q: SearchQuery, clientId: string) {
  const trip = {
    From: q.from,
    To: q.to,
    OnwardDate: q.departDate,
    ReturnDate: q.tripType === "ROUND_TRIP" && q.returnDate ? q.returnDate : "",
    TUI: "",
  };
  return {
    FareType: q.tripType === "ROUND_TRIP" ? "RT" : "ON",
    ADT: q.travellers.adults,
    CHD: q.travellers.children,
    INF: q.travellers.infants,
    Cabin: cabinCode(q.cabinClass),
    Source: "LV",
    Mode: "AS",
    ClientID: clientId,
    IsMultipleCarrier: false,
    IsRefundable: false,
    preferedAirlines: [""],
    TUI: "",
    SecType: "",
    Trips: [trip],
    Parameters: {
      Airlines: "",
      GroupType: "",
      Refundable: "",
      IsDirect: false,
      IsStudentFare: false,
      IsNearbyAirport: false,
      IsExtendedSearch: false,
      IsGDSSearch: false,
      IsLCCSearch: true,
      IsSeniorCitizen: false,
    },
  };
}

interface SearchResponse {
  TUI?: string;
  Completed?: string | boolean; // Benzy returns "True"/"False"
  Trips?: BenzyTrip[];
  [k: string]: unknown;
}
interface BenzyTrip {
  Journey?: BenzyJourney[];
}
interface BenzyJourney {
  Provider?: string;
  AirlineCode?: string;
  /** Journey handle, e.g. "6E|74" — required by SSR / SmartPricer / CreateItinerary. */
  Index?: string;
  FlightNo?: string;
  Stops?: number;
  Duration?: string | number;
  GrossFare?: number;
  NetFare?: number;
  Fares?: number;
  Refundable?: string | boolean;
  Connections?: BenzySegment[];
  Segments?: BenzySegment[];
  FCType?: string;
  DepartureTime?: string;
  ArrivalTime?: string;
}
interface BenzySegment {
  MAC?: string; // marketing airline code
  OAC?: string; // operating airline code
  FlightNo?: string;
  FNo?: string;
  AAC?: string; // arrival airport
  DAC?: string; // departure airport
  From?: string;
  To?: string;
  DepartureTime?: string;
  ArrivalTime?: string;
  DTime?: string;
  ATime?: string;
  Duration?: string | number;
  Cabin?: string;
}

/** Step 2 — flight search: ExpressSearch then poll GetExpSearch. Falls back to generated data. */
export async function searchFlights(q: SearchQuery): Promise<{ flights: Flight[]; live: boolean }> {
  // The Benzy endpoints only accept whitelisted static IPs. Until the server IP
  // is whitelisted the calls time out, so live attempts are gated behind a flag.
  // Set BENZY_LIVE=1 (once your IP is whitelisted) to enable real API calls.
  if (process.env.BENZY_LIVE !== "1") {
    return { flights: generateFlights(q, "BENZY"), live: false };
  }

  const auth = await getSignature();
  if (!auth) return { flights: generateFlights(q, "BENZY"), live: false };

  try {
    const body = buildSearchBody(q, auth.clientId);
    let data = await postJson<SearchResponse>(`${cfg.flightsUrl}/flights/ExpressSearch`, body, auth.token);
    const tui = data.TUI || "";

    // Benzy search is async: poll GetExpSearch until Completed === "True".
    // ClientID is empty on the poll, per the reference GetExpSearch payload.
    let tries = 0;
    while (!isCompleted(data.Completed) && tries < 5) {
      await sleep(900);
      data = await postJson<SearchResponse>(`${cfg.flightsUrl}/flights/GetExpSearch`, { TUI: tui, ClientID: "" }, auth.token);
      tries++;
    }

    // The master TUI is what every downstream booking call chains off, so it is
    // captured onto each itinerary here — by checkout time the search is gone.
    const flights = normalizeBenzyFlights(data, q, tui || data.TUI || "");
    if (flights.length) return { flights, live: true };
    console.warn("[benzy] live search returned 0 mapped flights, using fallback");
  } catch (err) {
    console.warn("[benzy] search failed, using fallback:", (err as Error).message);
  }
  return { flights: generateFlights(q, "BENZY"), live: false };
}

function isCompleted(v: unknown) {
  return v === true || v === "True" || v === "true" || v === 1;
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function parseDuration(d: string | number | undefined): number {
  if (typeof d === "number") return d;
  if (!d) return 0;
  // "02:35" or "155"
  if (d.includes(":")) {
    const [h, m] = d.split(":").map(Number);
    return h * 60 + (m || 0);
  }
  const n = Number(d);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Map a Benzy ExpressSearch/GetExpSearch response into our Flight[] shape.
 * Defensive against schema variants; returns [] on anything unexpected so the
 * caller falls back to generated data.
 */
function normalizeBenzyFlights(data: SearchResponse, q: SearchQuery, masterTui: string): Flight[] {
  const trips = data?.Trips;
  if (!Array.isArray(trips) || !trips.length) return [];
  const journeys = trips[0]?.Journey;
  if (!Array.isArray(journeys)) return [];

  const out: Flight[] = [];
  journeys.forEach((j, idx) => {
    try {
      const segs = (j.Connections || j.Segments || []) as BenzySegment[];
      if (!segs.length) return;
      const first = segs[0];
      const last = segs[segs.length - 1];
      const airlineCode = j.AirlineCode || first.MAC || first.OAC || "";
      const flightNo = `${airlineCode} ${first.FlightNo || first.FNo || ""}`.trim();
      const depart = j.DepartureTime || first.DepartureTime || first.DTime || "";
      const arrive = j.ArrivalTime || last.ArrivalTime || last.ATime || "";
      const duration = parseDuration(j.Duration) || segs.reduce((a, s) => a + parseDuration(s.Duration), 0);
      const base = j.NetFare || j.GrossFare || j.Fares || 0;

      out.push({
        id: `${airlineCode}${first.FlightNo || idx}-${idx}`,
        source: "BENZY",
        live: true,
        // Bookable only with both halves: the search-wide TUI and this journey's
        // Index. Missing either means no booking call can be made for this fare.
        bookingRef: masterTui && j.Index ? { supplier: "BENZY" as const, tui: masterTui, index: j.Index, amount: base } : undefined,
        airlineCode,
        airlineName: airlineName(airlineCode),
        flightNumber: flightNo,
        from: first.DAC || first.From || q.from,
        to: last.AAC || last.To || q.to,
        departTime: depart,
        arriveTime: arrive,
        durationMinutes: duration,
        stops: typeof j.Stops === "number" ? j.Stops : Math.max(0, segs.length - 1),
        layoverAirports: segs.slice(0, -1).map((s) => s.AAC || s.To || "").filter(Boolean),
        refundable: isCompleted(j.Refundable),
        cabinBaggage: "7 kg",
        checkInBaggage: "15 kg",
        basePrice: base,
        fares: buildFaresFromBase(base),
        segments: segs.map((s) => ({
          airlineCode: s.MAC || airlineCode,
          airlineName: airlineName(s.MAC || airlineCode),
          flightNumber: `${s.MAC || airlineCode} ${s.FlightNo || s.FNo || ""}`.trim(),
          from: s.DAC || s.From || "",
          to: s.AAC || s.To || "",
          departTime: s.DepartureTime || s.DTime || "",
          arriveTime: s.ArrivalTime || s.ATime || "",
          durationMinutes: parseDuration(s.Duration),
        })),
      });
    } catch {
      /* skip malformed journey */
    }
  });
  return out.filter((f) => f.basePrice > 0 && f.departTime).sort((a, b) => a.basePrice - b.basePrice);
}

function airlineName(code: string) {
  const map: Record<string, string> = { AI: "Air India", "6E": "IndiGo", UK: "Vistara", SG: "SpiceJet", QP: "Akasa Air", I5: "AIX Connect", G8: "Go First" };
  return map[code] || code;
}

function buildFaresFromBase(base: number) {
  const mult = [
    { id: "FEE_SAVER", label: "Fee Saver", m: 0.92, badge: "Lowest", seat: "Chargeable", meal: "Chargeable", cancel: "Restrictive", checkin: "15 kg" },
    { id: "REGULAR", label: "Regular", m: 1, seat: "Paid selection", meal: "Paid", cancel: "Standard", checkin: "15 kg" },
    { id: "COMFORT", label: "Comfort", m: 1.18, badge: "Popular", seat: "Free standard seat", meal: "Free veg/non-veg", cancel: "Lower fees", checkin: "15 kg" },
    { id: "YOUR_CHOICE", label: "Your Choice", m: 1.42, badge: "Customisable", seat: "Free preferred seat", meal: "Free meals", cancel: "Free cancellation", checkin: "25 kg" },
  ] as const;
  return mult.map((f) => ({
    id: f.id as Flight["fares"][number]["id"],
    label: f.label,
    price: Math.round((base * f.m) / 10) * 10,
    cabinBaggage: "7 kg",
    checkInBaggage: f.checkin,
    seat: f.seat,
    meal: f.meal,
    cancellation: f.cancel,
    badge: "badge" in f ? f.badge : undefined,
  }));
}

export function fareCalendar(q: SearchQuery) {
  return generateFareCalendar(q);
}

/**
 * Hotel search via Benzy (Akbar Travels B2B).
 * Flow per docs: Signature (b2bapiutils) → Bearer token → Hotel Search
 * (travelportalapi) → Itinerary (b2bapihotels) → StartPay/RetrieveBooking.
 * Gated behind BENZY_LIVE (IP whitelist pending); falls back to generated data.
 */
export async function searchHotels(q: HotelSearchQuery): Promise<{ hotels: Hotel[]; live: boolean }> {
  if (process.env.BENZY_LIVE !== "1") {
    return { hotels: generateHotels(q), live: false };
  }
  const token = await getSignatureToken();
  if (token) {
    try {
      const body = {
        ClientID: cfg.clientId,
        ChannelID: cfg.channelId,
        City: q.city,
        CheckIn: q.checkIn,
        CheckOut: q.checkOut,
        Rooms: [{ Adults: q.adults, Children: q.children }],
        RoomCount: q.rooms,
        TUI: token,
      };
      const data = await postJson<{ Hotels?: unknown[] }>(`${cfg.hotelApiUrl}/hotels/Search`, body, token);
      const hotels = normalizeHotels(data, q);
      if (hotels.length) return { hotels, live: true };
    } catch (err) {
      console.warn("[benzy] hotel search failed, using fallback:", (err as Error).message);
    }
  }
  return { hotels: generateHotels(q), live: false };
}

function normalizeHotels(data: { Hotels?: unknown[] }, _q: HotelSearchQuery): Hotel[] {
  // The live hotel schema is documented in the WRC portal; map once a real
  // response sample is available. Returns [] to trigger the fallback for now.
  if (!Array.isArray(data?.Hotels)) return [];
  return [];
}

/**
 * Offers/promotions from Benzy. Documented under the WRC portal services
 * (Signature → Bearer token → offers endpoint). Gated behind BENZY_LIVE since
 * the endpoints require IP whitelisting; falls back to curated demo offers.
 * Set BENZY_OFFERS_URL once the exact path is confirmed from the docs.
 */
export async function getOffers(): Promise<{ offers: Offer[]; live: boolean }> {
  if (process.env.BENZY_LIVE !== "1") {
    return { offers: DEMO_OFFERS, live: false };
  }
  const token = await getSignatureToken();
  if (token) {
    try {
      const url = process.env.BENZY_OFFERS_URL || `${cfg.utilsUrl}/Utils/GetOffers`;
      const data = await postJson<{ Offers?: unknown[] }>(url, { ClientID: cfg.clientId, ChannelID: cfg.channelId }, token);
      const offers = normalizeOffers(data);
      if (offers.length) return { offers, live: true };
    } catch (err) {
      console.warn("[benzy] offers failed, using fallback:", (err as Error).message);
    }
  }
  return { offers: DEMO_OFFERS, live: false };
}

interface BenzyOffer {
  PromoCode?: string; Code?: string;
  Title?: string; Name?: string;
  Description?: string; SubTitle?: string;
  Discount?: string | number;
  Category?: string;
  ValidTill?: string; ExpiryDate?: string;
  TnC?: string[] | string;
}
function normalizeOffers(data: { Offers?: unknown[] }): Offer[] {
  const list = data?.Offers;
  if (!Array.isArray(list)) return [];
  const grads = ["from-rose-500 to-pink-600", "from-indigo-500 to-blue-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600", "from-violet-500 to-purple-600"];
  return list.map((raw, i) => {
    const o = raw as BenzyOffer;
    const cat = (o.Category || "").toUpperCase();
    return {
      id: String(i + 1),
      code: o.PromoCode || o.Code || "",
      title: o.Title || o.Name || "Special Offer",
      subtitle: o.Description || o.SubTitle || "",
      category: (["BANK", "WALLET", "FLIGHT", "HOTEL", "SEASONAL"].includes(cat) ? cat : "SEASONAL") as Offer["category"],
      discount: typeof o.Discount === "number" ? `₹${o.Discount} OFF` : o.Discount || "",
      validTill: o.ValidTill || o.ExpiryDate,
      bg: grads[i % grads.length],
      terms: Array.isArray(o.TnC) ? o.TnC : o.TnC ? [o.TnC] : [],
    } as Offer;
  }).filter((o) => o.code || o.title);
}
