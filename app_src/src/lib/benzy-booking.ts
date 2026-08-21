/**
 * Benzy Infotech (Akbar Travels B2B) — FLIGHT BOOKING pipeline client.
 *
 * This module implements the full certification booking flow, one function per
 * Benzy operation. Payload shapes are copied verbatim from Benzy's certification
 * reference bundle (the "test-cases" Google Drive folders); each function cites
 * the reference file it was modelled on. Everything runs server-side only — the
 * Benzy endpoints require the caller's static IP to be whitelisted.
 *
 * The end-to-end sequence for one booking (see AGENTS / certification docs):
 *
 *   0. Signature            → { Token (Bearer), ClientID (encrypted), TUI }
 *   1. ExpressSearch        → master TUI            (see benzy.ts:searchFlights)
 *   2. WebSettings          → per-airline capability flags
 *   3. GetExpSearch (poll)  → journeys, each with an `Index` ("6E|74")
 *   4. SSR                  → ancillaries for the chosen journey(s); item.ID = SSID
 *   5. SmartPricer          → repriced TUI'
 *   6. GetSPricer (poll)    → confirmed fare
 *   7. GetTravelCheckList   → which passenger fields are mandatory
 *   8. CreateItinerary      → TransactionID + TUI''
 *   9. StartPay (HB)        → hold booking (paid from agent Deposit wallet)
 *  10. GetItineraryStatus   → poll until CurrentStatus is "Success" or "Failed"
 *  11. RetrieveBooking      → held PNR
 *  12. StartPay (HP)        → purchase / ticket
 *  13. RetrieveBooking      → ticketed booking (TicketNo)
 *
 * IMPORTANT — the encrypted ClientID used by every flight/payment/utils body is
 * returned *by the Signature response*, NOT stored in env. Only the raw client
 * code ("bitest" in staging = BENZY_CLIENT_ID) is configured. WebSettings is the
 * one call that uses the raw code; everything else uses the encrypted ClientID.
 */

const cfg = {
  signatureUrl: process.env.BENZY_SIGNATURE_URL || "https://b2bapiutils.benzyinfotech.com/Utils/Signature",
  flightsUrl: process.env.BENZY_FLIGHTS_URL || "https://b2bapiflights.benzyinfotech.com",
  utilsUrl: process.env.BENZY_UTILS_URL || "https://b2bapiutils.benzyinfotech.com",
  // The Payment/* host is not shown in the reference (only the path is). Defaults
  // to the flights host; override with BENZY_PAYMENT_URL once confirmed with Benzy.
  paymentUrl: process.env.BENZY_PAYMENT_URL || process.env.BENZY_FLIGHTS_URL || "https://b2bapiflights.benzyinfotech.com",
  merchantId: process.env.BENZY_MERCHANT_ID || "300",
  apiKey: process.env.BENZY_API_KEY || "",
  // Raw client code — sent to Signature and WebSettings ("bitest" in staging).
  clientCode: process.env.BENZY_CLIENT_ID || "",
  password: process.env.BENZY_PASSWORD || "",
  agentCode: process.env.BENZY_AGENT_CODE || "",
  browserKey: process.env.BENZY_BROWSER_KEY || "",
  key: process.env.BENZY_KEY || "",
};

const TIMEOUT_MS = 20000;

/* ------------------------------------------------------------------ *
 * Low-level transport + optional payload capture (for cert export).
 * ------------------------------------------------------------------ */

export interface BenzyExchange {
  name: string;
  method: "POST";
  /** Path only, e.g. "/Flights/SSR". */
  endpoint: string;
  /** Full request URL, e.g. "https://b2bapiflights.benzyinfotech.com/Flights/SSR". */
  url: string;
  /** Request headers exactly as transmitted (Authorization included). */
  headers: Record<string, string>;
  /** ISO timestamp of when the response came back. */
  at: string;
  request: unknown;
  response: unknown;
}

let captureSink: ((x: BenzyExchange) => void) | null = null;
/** Register a sink to record every request/response (used to export cert payloads). */
export function setBenzyCapture(fn: ((x: BenzyExchange) => void) | null) {
  captureSink = fn;
}

async function postBenzy<T>(name: string, url: string, body: unknown, token?: string): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    if (captureSink) {
      const endpoint = url.replace(/^https?:\/\/[^/]+/, "");
      captureSink({ name, method: "POST", endpoint, url, headers, at: new Date().toISOString(), request: body, response: json });
    }
    if (process.env.BENZY_DEBUG_LOG === "1") {
      const endpoint = url.replace(/^https?:\/\/[^/]+/, "");
      console.log("[BENZY_CALL]", JSON.stringify({
        at: new Date().toISOString(),
        name,
        endpoint,
        url,
        status: res.status,
        request: body,
        response: json,
      }));
    }
    if (!res.ok) throw new Error(`Benzy ${name} -> ${res.status}`);
    return json as T;
  } finally {
    clearTimeout(t);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isTrue = (v: unknown) => v === true || v === "True" || v === "true" || v === 1;

/* ------------------------------------------------------------------ *
 * Shared response envelope.
 * ------------------------------------------------------------------ */

export interface BenzyBase {
  Code?: string;
  Msg?: string[];
  success?: boolean;
  TUI?: string;
}

function assertOk(name: string, r: BenzyBase) {
  if (r?.Code && r.Code !== "200" && r.Code !== "6033") {
    throw new Error(`Benzy ${name} -> ${r.Code} ${(r.Msg || []).join(", ")}`);
  }
  return r;
}

/* ================================================================== *
 * 0. Signature  ·  POST /Utils/Signature
 *    Ref: case-folder1.Signature.json
 * ================================================================== */

export interface BenzyAuth {
  /** JWT used as `Authorization: Bearer <token>` on every call. */
  token: string;
  /** Encrypted ClientID returned by Signature — used in all flight/payment bodies. */
  clientId: string;
  /** Raw client code ("bitest") — used only by WebSettings. */
  clientCode: string;
  /** Initial TUI from the Signature response (not usually chained). */
  tui: string;
}

interface SignatureResponse extends BenzyBase {
  Token?: string;
  token?: string;
  ClientID?: string;
}

/** Step 0 — authenticate. Returns the Bearer token + encrypted ClientID, or null. */
export async function getSignature(): Promise<BenzyAuth | null> {
  try {
    const payload = {
      MerchantID: cfg.merchantId,
      ApiKey: cfg.apiKey,
      ClientID: cfg.clientCode,
      Password: cfg.password,
      AgentCode: cfg.agentCode,
      BrowserKey: cfg.browserKey,
      Key: cfg.key,
    };
    const r = await postBenzy<SignatureResponse>("Signature", cfg.signatureUrl, payload);
    const token = r.Token || r.token;
    if (!token || !r.ClientID) return null;
    return { token, clientId: r.ClientID, clientCode: cfg.clientCode, tui: r.TUI || "" };
  } catch (err) {
    console.warn("[benzy-booking] signature failed:", (err as Error).message);
    return null;
  }
}

/* ================================================================== *
 * 2. WebSettings  ·  POST /Utils/WebSettings
 *    Ref: case-folder2.WebSettings.json  — uses the RAW client code, not encrypted.
 * ================================================================== */

export interface WebSetting {
  Key: string;
  Value: string | null;
}
export interface WebSettingsResponse extends BenzyBase {
  Settings?: WebSetting[];
}

export async function webSettings(auth: BenzyAuth, tui: string): Promise<WebSettingsResponse> {
  const body = { ClientID: auth.clientCode, TUI: tui };
  return assertOk("WebSettings", await postBenzy<WebSettingsResponse>(`WebSettings`, `${cfg.utilsUrl}/Utils/WebSettings`, body, auth.token));
}

/** Return the CSV value for a WebSettings key (e.g. "ShowSeatLayoutDom"). */
export function webSetting(res: WebSettingsResponse, key: string): string[] {
  const raw = res.Settings?.find((s) => s.Key === key)?.Value;
  return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
}
/** Does `airline` (e.g. "6E") support a capability flag from WebSettings? */
export function airlineSupports(res: WebSettingsResponse, key: string, airline: string): boolean {
  return webSetting(res, key).includes(airline);
}

/* ================================================================== *
 * 3. GetExpSearch  ·  POST /flights/GetExpSearch  (poll master search)
 *    Ref: case-folder3or4.GetExpSearch.json  — ClientID is empty here.
 * ================================================================== */

export interface SearchJourney {
  Index?: string;
  Provider?: string;
  FlightNo?: string;
  Stops?: number;
  Seats?: number;
  Duration?: string;
  DepartureTime?: string;
  ArrivalTime?: string;
  From?: string;
  To?: string;
  GrossFare?: number;
  NetFare?: number;
  Refundable?: string;
  Connections?: unknown[];
  Cabin?: string;
  FareClass?: string;
  FCType?: string;
  [k: string]: unknown;
}
export interface SearchTrip {
  Journey?: SearchJourney[];
}
export interface GetExpSearchResponse extends BenzyBase {
  Completed?: string | boolean | null;
  CurrencyCode?: string | null;
  Trips?: SearchTrip[];
}

/* 1. ExpressSearch · POST /flights/ExpressSearch — captured search kickoff.
 * (benzy.ts has its own copy for the live product; this one runs through the
 * captured transport so search appears in the cert bundle.) */
export interface CertSearchInput {
  from: string;
  to: string;
  onwardDate: string;
  returnDate?: string;
  tripType: "ON" | "RT";
  adults: number;
  children: number;
  infants: number;
  cabin?: string;
  source?: string;
}

export async function expressSearch(auth: BenzyAuth, input: CertSearchInput): Promise<GetExpSearchResponse> {
  const body = {
    FareType: input.tripType,
    ADT: input.adults,
    CHD: input.children,
    INF: input.infants,
    Cabin: input.cabin || "E",
    Source: input.source || "LV",
    Mode: "AS",
    ClientID: auth.clientId,
    IsMultipleCarrier: false,
    IsRefundable: false,
    preferedAirlines: [""],
    TUI: "",
    SecType: "",
    Trips: [
      {
        From: input.from,
        To: input.to,
        OnwardDate: input.onwardDate,
        ReturnDate: input.tripType === "RT" ? input.returnDate || "" : "",
        TUI: "",
      },
    ],
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
  return assertOk("ExpressSearch", await postBenzy<GetExpSearchResponse>("ExpressSearch", `${cfg.flightsUrl}/flights/ExpressSearch`, body, auth.token));
}

export async function getExpSearch(auth: BenzyAuth, tui: string): Promise<GetExpSearchResponse> {
  const body = { TUI: tui, ClientID: "" };
  return postBenzy<GetExpSearchResponse>("GetExpSearch", `${cfg.flightsUrl}/flights/GetExpSearch`, body, auth.token);
}

/** Poll GetExpSearch until Completed === "True" (or attempts exhausted). */
export async function pollExpSearch(auth: BenzyAuth, tui: string, attempts = 6, delayMs = 900): Promise<GetExpSearchResponse> {
  let data = await getExpSearch(auth, tui);
  let tries = 0;
  while (!isTrue(data.Completed) && tries < attempts) {
    await sleep(delayMs);
    data = await getExpSearch(auth, tui);
    tries++;
  }
  return assertOk("GetExpSearch", data);
}

/* ================================================================== *
 * A "trip reference" is how a chosen journey is passed to SSR / SmartPricer.
 * One entry per leg: OrderID 1 = onward, OrderID 2 = return (round-trip).
 * ================================================================== */

export interface TripRef {
  Amount: number;
  Index: string;
  OrderID: number;
  TUI: string;
}

/** Build TripRef[] from selected journeys. `masterTui` is the ExpressSearch TUI. */
export function tripRefs(selected: { index: string; amount: number }[], masterTui: string): TripRef[] {
  return selected.map((s, i) => ({ Amount: s.amount, Index: s.index, OrderID: i + 1, TUI: masterTui }));
}

/* ================================================================== *
 * 4. SSR  ·  POST /Flights/SSR
 *    Ref: case-folder4or5or8or9.SSR.json
 * ================================================================== */

export interface SSROption {
  Code?: string;
  Description?: string;
  Charge?: number;
  VAT?: number;
  /** "1" = meal, "2" = baggage, "8" = priority check-in. */
  Type?: string;
  Category?: string;
  PTC?: string;
  /** This ID is the SSID passed back in CreateItinerary. */
  ID?: number;
  SSRNetAmount?: number;
  IsFreeMeal?: boolean;
  [k: string]: unknown;
}
export interface SSRSegment {
  FUID?: string;
  VAC?: string;
  SSR?: SSROption[];
}
export interface SSRJourney {
  Provider?: string;
  Segments?: SSRSegment[];
}
export interface SSRTrip {
  From?: string;
  To?: string;
  Journey?: SSRJourney[];
}
export interface SSRResponse extends BenzyBase {
  CurrencyCode?: string;
  PaidSSR?: boolean;
  Trips?: SSRTrip[];
}

export async function getSSR(auth: BenzyAuth, trips: TripRef[], source = "LV"): Promise<SSRResponse> {
  const body = { PaidSSR: true, ClientID: auth.clientId, Source: source, FareType: "N", Trips: trips };
  return assertOk("SSR", await postBenzy<SSRResponse>("SSR", `${cfg.flightsUrl}/Flights/SSR`, body, auth.token));
}

/* ================================================================== *
 * 5. SmartPricer  ·  POST /flights/SmartPricer   → repriced TUI
 * 6. GetSPricer   ·  POST /Flights/GetSPricer    (poll)
 *    Ref: case-folder5or6.SmartPricer.json, 6or7.GetSPricer.json
 * ================================================================== */

export interface SmartPricerResponse extends BenzyBase {
  /** The repriced TUI to carry into GetSPricer / CreateItinerary. */
  TUI?: string;
}

export async function smartPricer(auth: BenzyAuth, trips: TripRef[], tripType: "ON" | "RT", source = "LV"): Promise<SmartPricerResponse> {
  const body = { Trips: trips, ClientID: auth.clientId, Mode: "AS", Options: "", Source: source, TripType: tripType };
  return assertOk("SmartPricer", await postBenzy<SmartPricerResponse>("SmartPricer", `${cfg.flightsUrl}/flights/SmartPricer`, body, auth.token));
}

export interface GetSPricerResponse extends BenzyBase {
  CurrencyCode?: string;
  NetAmount?: number;
  GrossAmount?: number;
  FareType?: string;
  HoldInfo?: string;
  Trips?: unknown[];
  Rules?: unknown[];
  SSR?: unknown;
}

export async function getSPricer(auth: BenzyAuth, tui: string): Promise<GetSPricerResponse> {
  // GetSPricer body is just { TUI } — no ClientID.
  return postBenzy<GetSPricerResponse>("GetSPricer", `${cfg.flightsUrl}/Flights/GetSPricer`, { TUI: tui }, auth.token);
}

/** Poll GetSPricer until it returns a priced result (NetAmount > 0). */
export async function pollSPricer(auth: BenzyAuth, tui: string, attempts = 6, delayMs = 900): Promise<GetSPricerResponse> {
  let data = await getSPricer(auth, tui);
  let tries = 0;
  while (!(data.NetAmount && data.NetAmount > 0) && tries < attempts) {
    await sleep(delayMs);
    data = await getSPricer(auth, tui);
    tries++;
  }
  return assertOk("GetSPricer", data);
}

/* ================================================================== *
 * 7. GetTravelCheckList  ·  POST /Utils/GetTravelCheckList
 *    Ref: case-folder7or8.GetTravelCheckList.json
 * ================================================================== */

export interface TravellerCheck {
  Nationality?: boolean;
  VisaType?: boolean;
  PDOE?: boolean;
  PLI?: boolean;
  PassportNo?: boolean;
  DOB?: boolean;
  PDOI?: boolean;
  Pancard?: boolean;
}
export interface FnuLnuSetting {
  AirlineCode?: string;
  TitleMandatory?: boolean;
  Fnumessage?: string;
  Lnumessage?: string;
}
export interface TravelCheckListResponse extends BenzyBase {
  TravellerCheckList?: TravellerCheck[];
  FnuLnuSettings?: FnuLnuSetting[];
  IsHRMSMandatory?: boolean;
}

export async function getTravelCheckList(auth: BenzyAuth, tui: string): Promise<TravelCheckListResponse> {
  const body = { TUI: tui, ClientID: auth.clientId };
  return assertOk("GetTravelCheckList", await postBenzy<TravelCheckListResponse>("GetTravelCheckList", `${cfg.utilsUrl}/Utils/GetTravelCheckList`, body, auth.token));
}

/* ================================================================== *
 * 8. CreateItinerary  ·  POST /Flights/CreateItinerary → TransactionID
 *    Ref: case-folder8or9or10.CreateItinerary.json
 * ================================================================== */

export interface ContactInfo {
  Title?: string;
  FName: string;
  LName: string;
  Mobile: string;
  Phone?: string;
  Email: string;
  Address?: string;
  CountryCode?: string;
  State?: string;
  City?: string;
  PIN?: string;
  GSTCompanyName?: string;
  GSTTIN?: string;
  GSTMobile?: string;
  GSTEmail?: string;
}

export interface Traveller {
  ID: number;
  Title: string;
  FName: string;
  LName: string;
  Age: number;
  DOB: string; // yyyy-mm-dd
  Gender: "M" | "F";
  PTC: "ADT" | "CHD" | "INF";
  Nationality?: string;
  PassportNo?: string;
  PLI?: string;
  PDOE?: string;
  VisaType?: string;
}

/** SSR selection: SSID = the `ID` from the SSR response, keyed by FUID + PaxID. */
export interface SSRSelection {
  FUID: number;
  PaxID: number;
  SSID: number;
}

export interface CreateItineraryInput {
  tui: string;
  bookingType?: "HB";
  contact: ContactInfo;
  travellers: Traveller[];
  ssr?: SSRSelection[];
  netAmount: number;
  ssrAmount?: number;
}

export interface CreateItineraryResponse extends BenzyBase {
  TransactionID?: number;
  NetAmount?: number;
  GrossAmount?: number;
  SSRAmount?: number;
  CurrencyCode?: string;
  Trips?: unknown[];
  SSR?: unknown[];
}

export async function createItinerary(auth: BenzyAuth, input: CreateItineraryInput): Promise<CreateItineraryResponse> {
  const body = {
    TUI: input.tui,
    BookingType: input.bookingType || "HB",
    ContactInfo: {
      Title: input.contact.Title || "",
      FName: input.contact.FName,
      LName: input.contact.LName,
      Mobile: input.contact.Mobile,
      Phone: input.contact.Phone || "",
      Email: input.contact.Email,
      Address: input.contact.Address || "",
      CountryCode: input.contact.CountryCode || "IN",
      State: input.contact.State || "",
      City: input.contact.City || "",
      PIN: input.contact.PIN || "",
      GSTCompanyName: input.contact.GSTCompanyName || "",
      GSTTIN: input.contact.GSTTIN || "",
      GSTMobile: input.contact.GSTMobile || "",
      GSTEmail: input.contact.GSTEmail || "",
      UpdateProfile: false,
      IsGuest: false,
      SaveGST: false,
    },
    Travellers: input.travellers.map((t) => ({
      ID: t.ID,
      Title: t.Title,
      FName: t.FName,
      LName: t.LName,
      Age: t.Age,
      DOB: t.DOB,
      Gender: t.Gender,
      PTC: t.PTC,
      Nationality: t.Nationality || "IN",
      PassportNo: t.PassportNo || "",
      PLI: t.PLI || "",
      PDOE: t.PDOE || "",
      VisaType: t.VisaType || "",
    })),
    PLP: [],
    SSR: (input.ssr || []).map((s) => ({ FUID: s.FUID, PaxID: s.PaxID, SSID: s.SSID })),
    CrossSell: [],
    NetAmount: input.netAmount,
    SSRAmount: input.ssrAmount || 0,
    ClientID: "",
    DeviceID: "",
    AppVersion: "",
    CrossSellAmount: 0,
  };
  return assertOk("CreateItinerary", await postBenzy<CreateItineraryResponse>("CreateItinerary", `${cfg.flightsUrl}/Flights/CreateItinerary`, body, auth.token));
}

/* ================================================================== *
 * 9/12. StartPay  ·  POST /Payment/StartPay   (HB = hold, HP = purchase)
 *    Ref: case-folder9or11.StartPay(BookingType-HB).json, 13or15.StartPay(...-HP).json
 *    Both phases pay from the agent Deposit wallet (DepositPayment: true).
 * ================================================================== */

export interface StartPayResponse extends BenzyBase {
  /** "6033" ("BOOKING INPROGRESS!") is the normal async-accepted code. */
  TransactionID?: number;
  PaymentID?: string | null;
  RedirectMode?: string;
  RedirectUrl?: string;
  CRSPNR?: string | null;
  BookStatus?: string | null;
}

export async function startPay(
  auth: BenzyAuth,
  args: { tui: string; transactionId: number; netAmount: number; bookingType: "HB" | "HP" },
): Promise<StartPayResponse> {
  const body = {
    TUI: args.tui,
    ClientID: auth.clientId,
    TransactionID: args.transactionId,
    PaymentType: "",
    PaymentAmount: 0,
    NetAmount: args.netAmount,
    BrowserKey: null,
    Hold: true,
    Promo: null,
    BankCode: "",
    GateWayCode: "",
    MerchantID: "",
    PaymentCharge: 0,
    ReleaseDate: "",
    CardType: "default",
    OnlinePayment: false,
    DepositPayment: true,
    VPA: "",
    CardAlias: "",
    QuickPay: null,
    BookingType: args.bookingType,
    RMSSignature: "",
    TargetCurrency: "",
    TargetAmount: 0,
    ServiceType: "ITI",
    Card: {
      Number: "",
      Expiry: "",
      CVV: "",
      CHName: "",
      Address: "",
      City: "",
      State: "",
      Country: "",
      PIN: "",
      International: false,
      SaveCard: false,
      FName: "",
      LName: "",
      EMIMonths: "0",
    },
  };
  return assertOk("StartPay", await postBenzy<StartPayResponse>(`StartPay(${args.bookingType})`, `${cfg.paymentUrl}/Payment/StartPay`, body, auth.token));
}

/* ================================================================== *
 * 10/11. GetItineraryStatus  ·  POST /Payment/GetItineraryStatus (poll)
 *    Ref: case-folder10..13.GetItineraryStatus.json
 * ================================================================== */

export interface ItineraryStatusResponse extends BenzyBase {
  transactionID?: string;
  /** Per Benzy docs: poll until this is "Success" or "Failed" — any other value (e.g. "") means still in progress. */
  CurrentStatus?: string;
  PaymentStatus?: string;
}

export async function getItineraryStatus(auth: BenzyAuth, tui: string, transactionId: number): Promise<ItineraryStatusResponse> {
  const body = { TUI: tui, TransactionID: transactionId };
  return postBenzy<ItineraryStatusResponse>("GetItineraryStatus", `${cfg.paymentUrl}/Payment/GetItineraryStatus`, body, auth.token);
}

/** Poll GetItineraryStatus until CurrentStatus is "Success" or "Failed" (per Benzy docs), or attempts run out. */
export async function pollItineraryStatus(
  auth: BenzyAuth,
  tui: string,
  transactionId: number,
  attempts = 15,
  delayMs = 2000,
): Promise<ItineraryStatusResponse> {
  let data = await getItineraryStatus(auth, tui, transactionId);
  let tries = 0;
  while (data.CurrentStatus !== "Success" && data.CurrentStatus !== "Failed" && tries < attempts) {
    await sleep(delayMs);
    data = await getItineraryStatus(auth, tui, transactionId);
    tries++;
  }
  return data;
}

/* ================================================================== *
 * 11/13. RetrieveBooking  ·  POST /Utils/RetrieveBooking
 *    Ref: case-folder12..16.RetrieveBooking.json  — keyed on ReferenceNumber = TransactionID.
 * ================================================================== */

export interface RetrieveTicketInfo {
  PaxID?: number;
  TicketNo?: string;
  Status?: string;
}
export interface RetrieveFlight {
  FUID?: number;
  AirlinePNR?: string;
  APNR?: string;
  CRSPNR?: string;
  FlightNo?: string;
  DepartureCode?: string;
  ArrivalCode?: string;
  DepartureTime?: string;
  ArrivalTime?: string;
  TicketInfo?: RetrieveTicketInfo[];
  [k: string]: unknown;
}
export interface RetrievePax {
  ID?: number;
  PaxID?: number;
  Title?: string;
  FName?: string;
  LName?: string;
  PTC?: string;
  [k: string]: unknown;
}
export interface RetrieveBookingResponse extends BenzyBase {
  TransactionID?: number;
  NetAmount?: number;
  GrossAmount?: number;
  Status?: string;
  PaymentStatus?: string;
  BookingType?: string; // "H" = hold
  PaymentType?: string; // "Deposit"
  From?: string;
  To?: string;
  OnwardDate?: string;
  ReturnDate?: string;
  TripType?: string;
  Trips?: { Journey?: { Segments?: { Flight?: RetrieveFlight }[] }[] }[];
  Pax?: RetrievePax[];
}

export async function retrieveBooking(auth: BenzyAuth, transactionId: number): Promise<RetrieveBookingResponse> {
  const body = { ReferenceType: "T", TUI: "", ReferenceNumber: String(transactionId), ClientID: auth.clientId };
  return assertOk("RetrieveBooking", await postBenzy<RetrieveBookingResponse>("RetrieveBooking", `${cfg.flightsUrl}/Utils/RetrieveBooking`, body, auth.token));
}

/** Pull the airline PNR(s) out of a RetrieveBooking response. */
export function pnrsFromBooking(res: RetrieveBookingResponse): string[] {
  const pnrs = new Set<string>();
  res.Trips?.forEach((tr) =>
    tr.Journey?.forEach((j) =>
      j.Segments?.forEach((s) => {
        const f = s.Flight;
        const pnr = f?.AirlinePNR || f?.APNR || f?.CRSPNR;
        if (pnr) pnrs.add(pnr);
      }),
    ),
  );
  return [...pnrs];
}
/** True once every ticket has a TicketNo (i.e. the HP/purchase step ticketed the PNR). */
export function isTicketed(res: RetrieveBookingResponse): boolean {
  const infos: RetrieveTicketInfo[] = [];
  res.Trips?.forEach((tr) => tr.Journey?.forEach((j) => j.Segments?.forEach((s) => infos.push(...(s.Flight?.TicketInfo || [])))));
  return infos.length > 0 && infos.every((i) => !!i.TicketNo);
}

/* ================================================================== *
 * End-to-end orchestrator — runs the post-search booking chain in the
 * exact certification order:
 *   SSR → SmartPricer → GetSPricer → GetTravelCheckList → CreateItinerary
 *   → StartPay(HB) → GetItineraryStatus → RetrieveBooking (held)
 *   → StartPay(HP) → GetItineraryStatus → RetrieveBooking (ticketed)
 *
 * The search step (ExpressSearch → GetExpSearch) happens first and yields the
 * `masterTui` + selected journey `Index`es passed in here. Enable capture via
 * setBenzyCapture() before calling to record every payload for cert submission.
 * ================================================================== */

export interface BookingFlowInput {
  /** Master TUI from ExpressSearch/GetExpSearch. */
  masterTui: string;
  tripType: "ON" | "RT";
  /** Selected journey(s): one leg for oneway, two (onward + return) for round-trip. */
  legs: { index: string; amount: number }[];
  travellers: Traveller[];
  contact: ContactInfo;
  /** Chosen ancillaries as {FUID, PaxID, SSID}; omit for no-baggage cases. */
  ssrSelections?: SSRSelection[];
  /** Sum of the selected ancillary charges. */
  ssrAmount?: number;
  /**
   * Pick ancillaries from the LIVE SSR response (SSIDs aren't known ahead of the
   * SSR call). If provided, overrides ssrSelections/ssrAmount. Used by the
   * "with baggage" certification cases.
   */
  selectSSR?: (ssr: SSRResponse, travellers: Traveller[]) => { selections: SSRSelection[]; amount: number };
  source?: string;
}

export interface BookingFlowResult {
  transactionId: number;
  netAmount: number;
  ssrAmount: number;
  /** Ancillary catalogue surfaced for the selected journey(s). */
  ssr: SSRResponse;
  /** RetrieveBooking after the HB (hold) phase. */
  held: RetrieveBookingResponse;
  /** RetrieveBooking after the HP (purchase/ticket) phase. */
  ticketed: RetrieveBookingResponse;
  pnrs: string[];
  isTicketed: boolean;
}

export async function runBookingFlow(auth: BenzyAuth, input: BookingFlowInput): Promise<BookingFlowResult> {
  const source = input.source || "LV";
  const refs = tripRefs(input.legs, input.masterTui); // OrderID 1 = onward, 2 = return

  // 4. SSR — ancillary catalogue for the chosen journey(s); resolve selections.
  const ssr = await getSSR(auth, refs, source);
  let ssrSelections = input.ssrSelections || [];
  let ssrAmount = input.ssrAmount || 0;
  if (input.selectSSR) {
    const picked = input.selectSSR(ssr, input.travellers);
    ssrSelections = picked.selections;
    ssrAmount = picked.amount;
  }

  // 5–6. SmartPricer → repriced TUI, then poll GetSPricer for the confirmed fare.
  const priced = await smartPricer(auth, refs, input.tripType, source);
  const repricedTui = priced.TUI;
  if (!repricedTui) throw new Error("Benzy SmartPricer returned no TUI");
  const spricer = await pollSPricer(auth, repricedTui);
  const airlineNet = spricer.NetAmount ?? input.legs.reduce((a, l) => a + l.amount, 0);

  // 7. GetTravelCheckList — mandatory passenger fields (recorded; validated in UI).
  await getTravelCheckList(auth, repricedTui);

  // 8. CreateItinerary — books the itinerary, returns the TransactionID.
  const itin = await createItinerary(auth, {
    tui: repricedTui,
    contact: input.contact,
    travellers: input.travellers,
    ssr: ssrSelections,
    netAmount: airlineNet,
    ssrAmount,
  });
  const transactionId = itin.TransactionID;
  if (!transactionId) throw new Error("Benzy CreateItinerary returned no TransactionID");
  const itinTui = itin.TUI || repricedTui;
  const payAmount = itin.NetAmount ?? airlineNet + ssrAmount;

  // 9–11. StartPay(HB) → poll status → RetrieveBooking (held PNR).
  await startPay(auth, { tui: itinTui, transactionId, netAmount: payAmount, bookingType: "HB" });
  await pollItineraryStatus(auth, itinTui, transactionId);
  const held = await retrieveBooking(auth, transactionId);

  // 12–14. StartPay(HP) → poll status → RetrieveBooking (ticketed).
  await startPay(auth, { tui: itinTui, transactionId, netAmount: payAmount, bookingType: "HP" });
  await pollItineraryStatus(auth, itinTui, transactionId);
  const ticketed = await retrieveBooking(auth, transactionId);

  return {
    transactionId,
    netAmount: payAmount,
    ssrAmount,
    ssr,
    held,
    ticketed,
    pnrs: pnrsFromBooking(ticketed),
    isTicketed: isTicketed(ticketed),
  };
}

/* ================================================================== *
 * Certification driver — the complete captured 14-step flow for one
 * test case. Wire makeCaptureCollector() (benzy-cert-export.ts) into
 * setBenzyCapture() first; every call here is recorded in order, then
 * buildCertBundle(collector.exchanges) renders the submission files.
 * ================================================================== */

export interface CertBookingInput {
  search: CertSearchInput;
  /**
   * Pick the journey(s) to book from the completed search results.
   * Receives GetExpSearch `Trips` (Trips[0] = onward, Trips[1] = return for RT);
   * return one leg for oneway, two for round-trip. `amount` is the journey NetFare.
   */
  selectLegs: (trips: SearchTrip[]) => { index: string; amount: number }[];
  travellers: Traveller[];
  contact: ContactInfo;
  ssrSelections?: SSRSelection[];
  ssrAmount?: number;
  selectSSR?: (ssr: SSRResponse, travellers: Traveller[]) => { selections: SSRSelection[]; amount: number };
}

export async function runCertBooking(auth: BenzyAuth, input: CertBookingInput): Promise<BookingFlowResult> {
  // 1. ExpressSearch → master TUI
  const kickoff = await expressSearch(auth, input.search);
  const masterTui = kickoff.TUI;
  if (!masterTui) throw new Error("Benzy ExpressSearch returned no TUI");

  // 2. WebSettings (capability flags) then 3. GetExpSearch (poll for results)
  await webSettings(auth, masterTui);
  const results = await pollExpSearch(auth, masterTui);

  const legs = input.selectLegs(results.Trips || []);
  if (!legs.length) throw new Error("Benzy cert booking: selectLegs returned no journeys");

  // 4–14. SSR → price → checklist → itinerary → hold → retrieve → purchase → retrieve
  return runBookingFlow(auth, {
    masterTui,
    tripType: input.search.tripType,
    legs,
    travellers: input.travellers,
    contact: input.contact,
    ssrSelections: input.ssrSelections,
    ssrAmount: input.ssrAmount,
    selectSSR: input.selectSSR,
  });
}
