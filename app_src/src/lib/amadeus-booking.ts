/**
 * Amadeus Enterprise "1A" SOAP Web Services — STATEFUL booking-flow client.
 *
 * Companion to ./amadeus.ts (which implements the stateless shopping call,
 * Fare_MasterPricerTravelBoardSearch). This module implements the *stateful*
 * Prime booking + ticketing flow required for certification, one function per
 * Amadeus web service, message shapes modelled on the Amadeus "Air IBE" /
 * "WBS Integration Guide v3.2" reference samples.
 *
 * The end-to-end certification sequence (see the WBS guide, ch. 8–14):
 *
 *   [Session Start]
 *   1.  Air_SellFromRecommendation        sell the shopped flight (msgFunction 183)
 *        └─ on errorCode 288 / UNS (Unable to Sell) → IBP fallback (guide §13.6):
 *           Fare_InformativeBestPricingWithoutPNR re-prices the SAME flights on an
 *           AVAILABLE booking class → re-sell with that class.
 *   2.  PNR_AddMultiElements               names (NM) + contact (AP) + ticketing
 *                                          arrangement (TK) + received-from (RF) + SSRs
 *   3.  FOP_CreateFormOfPayment            form of payment (cash / credit card)
 *   4.  Fare_PricePNRWithBookingClass      price the itinerary (RP/RU/RLO/VC/FCO)
 *   5.  Ticket_CreateTSTFromPricing        create the TST from the pricing
 *   6.  PNR_AddMultiElements (optionCode 10)   end-transact / commit → record locator
 *   7.  PNR_Retrieve                       read back the committed PNR
 *   8.  DocIssuance_IssueTicket            issue the e-ticket (ET)
 *   [Session End]
 *
 *   Cancellation:  Ticket_CancelDocument (void the e-ticket) then PNR_Cancel (XE).
 *   Ancillaries:   Air_RetrieveSeatMap + PNR_AddMultiElements SSR (RQST seat, NSST/
 *                  bags, meals) ; EMD via a Ticket_CreateTSMFareElement + issue.
 *
 * STATEFUL SESSIONS. The first message carries the WS-Security <UsernameToken>
 * digest AND an empty <awsse:Session TransactionStatusCode="Start"/>. The reply
 * returns <awsse:Session> with a SessionId / SequenceNumber / SecurityToken; every
 * subsequent message echoes that session as "InSeries" with SequenceNumber+1. The
 * final message is flagged "End" to release the session.
 *
 * NOTE ON SOAP ACTION VERSIONS. Each operation's SOAPAction / message-version
 * string (e.g. "…/ITAREQ_05_2_IA") is dictated by the WSAP's WSDL. They are all
 * read from env (AMADEUS_ACTION_*) with documented defaults; align them to the
 * WSDL of WSAP 1ASIWTOUMY2 before the live run. The *message body shapes* below
 * are the shape-verified part; the action strings are pure configuration.
 *
 * Everything runs server-side only (the Amadeus gateway requires the caller's
 * static IP to be whitelisted, and booking services to be entitled on the WSAP).
 */
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const cfg = {
  endpoint: (process.env.AMADEUS_ENDPOINT || "").trim(),
  wsUser: (process.env.AMADEUS_WS_USER || "").trim(),
  wsPassword: process.env.AMADEUS_WS_PASSWORD || "",
  officeId: (process.env.AMADEUS_OFFICE_ID || "").trim(),
  debug: process.env.AMADEUS_DEBUG === "1",
  forceLive: process.env.AMADEUS_LIVE === "1",
  // Per-operation SOAPAction / message-version strings (from the WSAP WSDL).
  actions: {
    sell: env("AMADEUS_ACTION_SELL", "http://webservices.amadeus.com/ITAREQ_05_2_IA"),
    ibp: env("AMADEUS_ACTION_IBP", "http://webservices.amadeus.com/TIBNRQ_18_1_1A"),
    pnrAdd: env("AMADEUS_ACTION_PNRADD", "http://webservices.amadeus.com/PNRADD_21_1_1A"),
    fop: env("AMADEUS_ACTION_FOP", "http://webservices.amadeus.com/TFOPCQ_15_4_1A"),
    pricePnr: env("AMADEUS_ACTION_PRICEPNR", "http://webservices.amadeus.com/TPCBRQ_23_1_1A"),
    createTst: env("AMADEUS_ACTION_CREATETST", "http://webservices.amadeus.com/TAUTCQ_04_1_1A"),
    pnrRetrieve: env("AMADEUS_ACTION_PNRRETRIEVE", "http://webservices.amadeus.com/PNRRET_21_1_1A"),
    issueTicket: env("AMADEUS_ACTION_ISSUETICKET", "http://webservices.amadeus.com/TTKTIQ_15_1_1A"),
    seatMap: env("AMADEUS_ACTION_SEATMAP", "http://webservices.amadeus.com/SEATMR_09_2_1A"),
    createTsm: env("AMADEUS_ACTION_CREATETSM", "http://webservices.amadeus.com/TASMRQ_08_1_1A"),
    issueEmd: env("AMADEUS_ACTION_ISSUEEMD", "http://webservices.amadeus.com/TEMDIQ_10_1_1A"),
    cancelDoc: env("AMADEUS_ACTION_CANCELDOC", "http://webservices.amadeus.com/TRCADQ_00_1_1A"),
    pnrCancel: env("AMADEUS_ACTION_PNRCANCEL", "http://webservices.amadeus.com/PNRXCL_18_1_1A"),
    signOut: env("AMADEUS_ACTION_SIGNOUT", "http://webservices.amadeus.com/VLSSOQ_04_1_1A"),
  },
  ns: {
    sell: env("AMADEUS_NS_SELL", "http://xml.amadeus.com/ITAREQ_05_2_IA"),
    ibp: env("AMADEUS_NS_IBP", "http://xml.amadeus.com/TIBNRQ_18_1_1A"),
    pnrAdd: env("AMADEUS_NS_PNRADD", "http://xml.amadeus.com/PNRADD_21_1_1A"),
    fop: env("AMADEUS_NS_FOP", "http://xml.amadeus.com/TFOPCQ_15_4_1A"),
    pricePnr: env("AMADEUS_NS_PRICEPNR", "http://xml.amadeus.com/TPCBRQ_23_1_1A"),
    createTst: env("AMADEUS_NS_CREATETST", "http://xml.amadeus.com/TAUTCQ_04_1_1A"),
    pnrRetrieve: env("AMADEUS_NS_PNRRETRIEVE", "http://xml.amadeus.com/PNRRET_21_1_1A"),
    issueTicket: env("AMADEUS_NS_ISSUETICKET", "http://xml.amadeus.com/TTKTIQ_15_1_1A"),
    seatMap: env("AMADEUS_NS_SEATMAP", "http://xml.amadeus.com/SEATMR_09_2_1A"),
    createTsm: env("AMADEUS_NS_CREATETSM", "http://xml.amadeus.com/TASMRQ_08_1_1A"),
    issueEmd: env("AMADEUS_NS_ISSUEEMD", "http://xml.amadeus.com/TEMDIQ_10_1_1A"),
    cancelDoc: env("AMADEUS_NS_CANCELDOC", "http://xml.amadeus.com/TRCADQ_00_1_1A"),
    pnrCancel: env("AMADEUS_NS_PNRCANCEL", "http://xml.amadeus.com/PNRXCL_18_1_1A"),
    signOut: env("AMADEUS_NS_SIGNOUT", "http://xml.amadeus.com/VLSSOQ_04_1_1A"),
  },
};

const TIMEOUT_MS = 30000;
const SESSION_NS = "http://xml.amadeus.com/2010/06/Session_v3";

function env(key: string, fallback: string): string {
  return (process.env[key] || fallback).trim();
}

/** True when the four mandatory credentials are present. */
export function amadeusBookingConfigured(): boolean {
  return !!(cfg.endpoint && cfg.wsUser && cfg.wsPassword && cfg.officeId);
}

// ---------------------------------------------------------------------------
// Shared helpers (mirrors ./amadeus.ts)
// ---------------------------------------------------------------------------

function sha1(buf: Buffer): Buffer {
  return crypto.createHash("sha1").update(buf).digest();
}

function uuid(): string {
  return crypto.randomUUID();
}

function xmlEscape(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** YYYY-MM-DD -> ddMMyy (Amadeus date format). */
export function iataDate(iso: string): string {
  const d = new Date((iso || "").length === 10 ? iso + "T00:00:00Z" : iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(2);
  return `${dd}${mm}${yy}`;
}

/** YYYY-MM-DD -> ddMMMyy uppercase (e.g. 15AUG26) — used by NM date-of-birth SSR / TK. */
export function iataDateAlpha(iso: string): string {
  const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const d = new Date((iso || "").length === 10 ? iso + "T00:00:00Z" : iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(2);
  return `${dd}${MON[d.getUTCMonth()]}${yy}`;
}

// --- best-effort XML readers (namespace-agnostic, defensive) ---------------

function blocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}
function val(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`));
  return m ? m[1].trim() : "";
}

// ---------------------------------------------------------------------------
// WS-Security (Start message only)
// ---------------------------------------------------------------------------

/** PasswordDigest = Base64( SHA1( nonce + created + SHA1(password) ) ). */
function wsSecurity() {
  const created = new Date().toISOString();
  const nonceBuf = crypto.randomBytes(16);
  const nonceB64 = nonceBuf.toString("base64");
  const pwdSha = sha1(Buffer.from(cfg.wsPassword, "utf8"));
  const digest = sha1(Buffer.concat([nonceBuf, Buffer.from(created, "utf8"), pwdSha])).toString("base64");
  return { created, nonceB64, digest };
}

// ---------------------------------------------------------------------------
// Stateful session transport
// ---------------------------------------------------------------------------

export interface AmadeusSession {
  sessionId: string;
  sequenceNumber: number;
  securityToken: string;
}

/** Recorded request/response pair — used to export certification payloads. */
export interface AmadeusExchange {
  name: string;
  action: string;
  request: string;
  response: string;
}

let captureSink: ((x: AmadeusExchange) => void) | null = null;
/** Register a sink to record every SOAP request/response (for cert-log export). */
export function setAmadeusCapture(fn: ((x: AmadeusExchange) => void) | null) {
  captureSink = fn;
}

/** Header session element. Start = empty; InSeries/End = echo the live session. */
function sessionHeader(session: AmadeusSession | null, close: boolean): string {
  if (!session) {
    return `<awsse:Session TransactionStatusCode="Start" xmlns:awsse="${SESSION_NS}"/>`;
  }
  const status = close ? "End" : "InSeries";
  return `<awsse:Session TransactionStatusCode="${status}" xmlns:awsse="${SESSION_NS}">
      <awsse:SessionId>${xmlEscape(session.sessionId)}</awsse:SessionId>
      <awsse:SequenceNumber>${session.sequenceNumber + 1}</awsse:SequenceNumber>
      <awsse:SecurityToken>${xmlEscape(session.securityToken)}</awsse:SecurityToken>
    </awsse:Session>`;
}

function buildEnvelope(action: string, bodyXml: string, session: AmadeusSession | null, close: boolean): string {
  const mid = uuid();
  // WS-Security + hosted-user go on the FIRST (Start) message only; after that the
  // session's SecurityToken authenticates each in-series message.
  let securityBlock = "";
  if (!session) {
    const { created, nonceB64, digest } = wsSecurity();
    securityBlock = `
    <oas:Security xmlns:oas="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <oas:UsernameToken oas1:Id="UsernameToken-1" xmlns:oas1="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
        <oas:Username>${xmlEscape(cfg.wsUser)}</oas:Username>
        <oas:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${nonceB64}</oas:Nonce>
        <oas:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${digest}</oas:Password>
        <oas1:Created>${created}</oas1:Created>
      </oas:UsernameToken>
    </oas:Security>
    <AMA_SecurityHostedUser xmlns="http://xml.amadeus.com/2010/06/Security_v1">
      <UserID AgentDutyCode="SU" POS_Type="1" PseudoCityCode="${xmlEscape(cfg.officeId)}" RequestorType="U"/>
    </AMA_SecurityHostedUser>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header>
    <add:MessageID xmlns:add="http://www.w3.org/2005/08/addressing">${mid}</add:MessageID>
    <add:Action xmlns:add="http://www.w3.org/2005/08/addressing">${action}</add:Action>
    <add:To xmlns:add="http://www.w3.org/2005/08/addressing">${xmlEscape(cfg.endpoint)}</add:To>
    <link:TransactionFlowLink xmlns:link="http://wsdl.amadeus.com/2010/06/ws/Link_v1"/>${securityBlock}
    ${sessionHeader(session, close)}
  </soapenv:Header>
  <soapenv:Body>${bodyXml}</soapenv:Body>
</soapenv:Envelope>`;
}

/** Parse the <awsse:Session> the gateway returns so the next message can chain. */
function parseSession(xml: string): AmadeusSession | null {
  const s = blocks(xml, "Session")[0];
  if (!s) return null;
  const sessionId = val(s, "SessionId");
  const securityToken = val(s, "SecurityToken");
  const sequenceNumber = parseInt(val(s, "SequenceNumber") || "0", 10);
  if (!sessionId || !securityToken) return null;
  return { sessionId, sequenceNumber, securityToken };
}

export interface SoapResult {
  xml: string;
  session: AmadeusSession | null;
  fault?: string;
}

/**
 * Send one SOAP message inside the stateful session.
 * @param session  null → open a new session (Start); otherwise chain (InSeries).
 * @param close    true → flag this message "End" to release the session.
 */
async function send(
  name: string,
  action: string,
  bodyXml: string,
  session: AmadeusSession | null,
  close = false,
): Promise<SoapResult> {
  const request = buildEnvelope(action, bodyXml, session, close);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: action },
      body: request,
      signal: controller.signal,
      cache: "no-store",
    });
    const xml = await res.text();
    if (cfg.debug) console.log(`[amadeus-booking] ${name} -> ${res.status}\n${xml.slice(0, 4000)}`);
    if (captureSink) captureSink({ name, action, request, response: xml });
    const fault = (xml.match(/<faultstring>([\s\S]*?)<\/faultstring>/) || [])[1]?.trim();
    if (!res.ok && !fault) throw new Error(`Amadeus ${name} -> HTTP ${res.status}`);
    return { xml, session: parseSession(xml) ?? session, fault };
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------------------
// Application-level error detection
// ---------------------------------------------------------------------------

/** True when Air_SellFromRecommendation reports the class is unavailable (288 / UNS). */
export function isUnableToSell(xml: string): boolean {
  // <statusCode>UNS</statusCode> at flight level, or errorCode 288 in an error group.
  if (/<(?:\w+:)?statusCode>\s*UNS\s*<\/(?:\w+:)?statusCode>/i.test(xml)) return true;
  for (const err of blocks(xml, "errorOrWarningCodeDetails")) {
    if (val(err, "errorDetails").includes("288") || /\b288\b/.test(err)) return true;
  }
  return /\b288\b/.test(val(xml, "errorCode"));
}

/** Collect any application error/warning free-text (for surfacing + logs). */
export function collectErrors(xml: string): string[] {
  const out: string[] = [];
  for (const t of blocks(xml, "errorMessageText")) {
    const m = val(t, "freeText") || t.trim();
    if (m) out.push(m);
  }
  for (const t of blocks(xml, "errorWarningDescription")) {
    const m = val(t, "freeText") || t.trim();
    if (m) out.push(m);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type PaxType = "ADT" | "CHD" | "INF";

export interface BookingPassenger {
  ref: number; // traveller ref, 1-based; matches the shopping paxReference refs
  type: PaxType;
  title: string; // MR / MRS / MS / MSTR / MISS
  firstName: string;
  lastName: string;
  dateOfBirth?: string; // YYYY-MM-DD (mandatory for CHD/INF)
  /** Traveller ref of the accompanying adult (INF only). */
  attachedToRef?: number;
}

export interface BookingContact {
  email: string;
  phone: string; // E.164-ish, digits; country code separate
  phoneCountry?: string; // e.g. "91"
}

export interface SellSegment {
  from: string;
  to: string;
  departDate: string; // YYYY-MM-DD
  carrier: string; // marketing carrier, e.g. "6E"
  flightNumber: string; // digits only, e.g. "2034"
  bookingClass: string; // RBD from the shopped recommendation, e.g. "M"
  /**
   * Origin-destination group (1-based). Segments sharing a group form one leg of
   * the journey; >1 segment in a group = a connecting flight. Onward = 1,
   * return = 2, etc. Defaults to 1 (single leg) when omitted.
   */
  group?: number;
  /** Slice&Dice / flight indicator (e.g. "1" direct sell). Optional. */
  flightIndicator?: string;
  /** Optional: departure/arrival time hhmm — improves the sell match when present. */
  departTime?: string;
  arriveTime?: string;
}

export interface FormOfPayment {
  type: "CASH" | "CARD";
  /** CARD only */
  vendor?: string; // VI / CA / AX ...
  cardNumber?: string;
  expiry?: string; // MMYY
  holder?: string;
}

export interface BookingInput {
  passengers: BookingPassenger[];
  contact: BookingContact;
  segments: SellSegment[];
  fop: FormOfPayment;
  /** Agent/booker identity for the Received-From (RF) element. */
  receivedFrom?: string;
  /** Ticketing office date, YYYY-MM-DD; defaults to today (delayed ticketing TK OK). */
  ticketDate?: string;
}

// ---------------------------------------------------------------------------
// 1 · Air_SellFromRecommendation
// ---------------------------------------------------------------------------

/** Group segments into origin-destination legs (round trips + connections), order-preserving. */
function groupByOD(segments: SellSegment[]): SellSegment[][] {
  const map = new Map<number, SellSegment[]>();
  segments.forEach((s) => {
    const g = s.group ?? 1;
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(s);
  });
  return [...map.values()];
}

function buildSellBody(segments: SellSegment[]): string {
  let item = 0; // running segment reference across the whole itinerary
  const ods = groupByOD(segments)
    .map((segs) => {
      const segInfos = segs
        .map((s) => {
          item++;
          const indicator = s.flightIndicator
            ? `<flightTypeDetails><flightIndicator>${xmlEscape(s.flightIndicator)}</flightIndicator></flightTypeDetails>`
            : "";
          return `
        <segmentInformation>
          <travelProductInformation>
            <flightDate><departureDate>${iataDate(s.departDate)}</departureDate></flightDate>
            <boardPointDetails><trueLocationId>${xmlEscape(s.from)}</trueLocationId></boardPointDetails>
            <offpointDetails><trueLocationId>${xmlEscape(s.to)}</trueLocationId></offpointDetails>
            <companyDetails><marketingCompany>${xmlEscape(s.carrier)}</marketingCompany></companyDetails>
            <flightIdentification><flightNumber>${xmlEscape(s.flightNumber)}</flightNumber><bookingClass>${xmlEscape(s.bookingClass)}</bookingClass></flightIdentification>
            ${indicator}<itemNumber>${item}</itemNumber>
          </travelProductInformation>
          <relatedproductInformation><quantity>${sellSeatCount}</quantity><statusCode>NN</statusCode></relatedproductInformation>
        </segmentInformation>`;
        })
        .join("");
      return `
    <itineraryDetails>
      <originDestinationDetails><origin>${xmlEscape(segs[0].from)}</origin><destination>${xmlEscape(segs[segs.length - 1].to)}</destination></originDestinationDetails>
      <message><messageFunctionDetails><messageFunction>183</messageFunction></messageFunctionDetails></message>${segInfos}
    </itineraryDetails>`;
    })
    .join("");
  return `<Air_SellFromRecommendation xmlns="${cfg.ns.sell}">
    <messageActionDetails><messageFunctionDetails><messageFunction>183</messageFunction></messageFunctionDetails></messageActionDetails>${ods}
  </Air_SellFromRecommendation>`;
}

/** Sell quantity = number of seat-occupying pax (ADT+CHD). Set by the orchestrator/planner. */
let sellSeatCount = 1;

export async function airSell(segments: SellSegment[], session: AmadeusSession | null): Promise<SoapResult> {
  return send("Air_SellFromRecommendation", cfg.actions.sell, buildSellBody(segments), session);
}

// ---------------------------------------------------------------------------
// 1b · Fare_InformativeBestPricingWithoutPNR (IBP — the 288/UNS fallback)
// ---------------------------------------------------------------------------

/**
 * IBP re-prices the SAME flights and returns the best AVAILABLE booking class.
 * On Air_Sell → 288/UNS we call this, read the substituted RBD per segment, and
 * re-sell with the corrected class (WBS guide §13.6 "Fall back mechanism").
 */
function buildIbpBody(passengers: BookingPassenger[], segments: SellSegment[]): string {
  const paxByType = groupBy(passengers, (p) => p.type);
  const paxRefs = Object.entries(paxByType)
    .map(([ptc, list]) => {
      const refs = list.map((p) => `<traveller><ref>${p.ref}</ref></traveller>`).join("");
      return `<passengersID><discountPtc><valueQualifier>${ptc}</valueQualifier></discountPtc>${refs}</passengersID>`;
    })
    .join("");
  const segs = segments
    .map((s, i) => `
      <segmentGroup>
        <segmentInformation>
          <flightDate><departureDate>${iataDate(s.departDate)}</departureDate></flightDate>
          <boardPointDetails><trueLocationId>${xmlEscape(s.from)}</trueLocationId></boardPointDetails>
          <offpointDetails><trueLocationId>${xmlEscape(s.to)}</trueLocationId></offpointDetails>
          <companyDetails><marketingCompany>${xmlEscape(s.carrier)}</marketingCompany></companyDetails>
          <flightIdentification><flightNumber>${xmlEscape(s.flightNumber)}</flightNumber></flightIdentification>
          <itemNumber>${i + 1}</itemNumber>
        </segmentInformation>
      </segmentGroup>`)
    .join("");
  return `<Fare_InformativeBestPricingWithoutPNR xmlns="${cfg.ns.ibp}">
    <passengersGroup>${paxRefs}</passengersGroup>
    <segmentGroup>${segs}</segmentGroup>
  </Fare_InformativeBestPricingWithoutPNR>`;
}

export async function informativeBestPricing(
  passengers: BookingPassenger[],
  segments: SellSegment[],
  session: AmadeusSession | null,
): Promise<SoapResult> {
  return send("Fare_InformativeBestPricingWithoutPNR", cfg.actions.ibp, buildIbpBody(passengers, segments), session);
}

/** Read the substituted booking class per segment from an IBP response. */
export function bookingClassesFromIbp(xml: string): string[] {
  const classes: string[] = [];
  for (const fare of blocks(xml, "fareComponentDetailsGroup")) {
    const rbd = val(fare, "bookingClassDetails") ? val(blocks(fare, "bookingClassDetails")[0], "designator") : "";
    if (rbd) classes.push(rbd);
  }
  // Fallback: any <bookingClass>/<designator> in itinerary order.
  if (!classes.length) {
    for (const seg of blocks(xml, "segmentInformation")) {
      const rbd = val(seg, "classOfService") || val(seg, "bookingClass");
      if (rbd) classes.push(rbd);
    }
  }
  return classes;
}

/** Apply IBP-substituted classes back onto the sell segments (index-aligned). */
export function applyClasses(segments: SellSegment[], classes: string[]): SellSegment[] {
  return segments.map((s, i) => (classes[i] ? { ...s, bookingClass: classes[i] } : s));
}

// ---------------------------------------------------------------------------
// 2 · PNR_AddMultiElements  (names + contact + ticketing + received-from + SSR)
// ---------------------------------------------------------------------------

function dobBlock(iso?: string): string {
  return iso ? `<dateOfBirth><dateAndTimeDetails><date>${iataDateAlpha(iso)}</date></dateAndTimeDetails></dateOfBirth>` : "";
}

/**
 * Build the NM traveller elements. An infant is nested under the adult it is
 * attached to (traveller quantity 2 + a second passengerData carrying
 * <infantIndicator> and the infant DOB), matching the Amadeus cryptic
 * NM1SURNAME/ADULT(INF/BABY/ddMMMyy) form. Infants get no separate PR reference.
 */
function buildNameElements(passengers: BookingPassenger[]): string {
  const infants = passengers.filter((p) => p.type === "INF");
  const seated = passengers.filter((p) => p.type !== "INF");
  const takenInfants = new Set<number>();
  return seated
    .map((p) => {
      const inf =
        infants.find((i) => i.attachedToRef === p.ref && !takenInfants.has(i.ref)) ??
        (p.type === "ADT" ? infants.find((i) => i.attachedToRef == null && !takenInfants.has(i.ref)) : undefined);
      if (inf) takenInfants.add(inf.ref);
      const qty = inf ? 2 : 1;
      const infData = inf
        ? `
        <passengerData>
          <travellerInformation>
            <passenger><firstName>${xmlEscape(inf.firstName)}</firstName><type>INF</type><infantIndicator>1</infantIndicator></passenger>
          </travellerInformation>
          ${dobBlock(inf.dateOfBirth)}
        </passengerData>`
        : "";
      return `
    <travellerInfo>
      <elementManagementPassenger>
        <reference><qualifier>PR</qualifier><number>${p.ref}</number></reference>
        <segmentName>NM</segmentName>
      </elementManagementPassenger>
      <passengerData>
        <travellerInformation>
          <traveller><surname>${xmlEscape(p.lastName)}</surname><quantity>${qty}</quantity></traveller>
          <passenger><firstName>${xmlEscape(p.firstName)}</firstName><type>${p.type}</type></passenger>
        </travellerInformation>
        ${dobBlock(p.dateOfBirth)}
      </passengerData>${infData}
    </travellerInfo>`;
    })
    .join("");
}

/** SSR INFT (one per infant), referencing the accompanying adult's PR number. */
function infantSsrElements(passengers: BookingPassenger[], carrier: string, startRef: number): string {
  const infants = passengers.filter((p) => p.type === "INF");
  const firstAdultRef = passengers.find((p) => p.type === "ADT")?.ref ?? 1;
  return infants
    .map((inf, i) => {
      const adultRef = inf.attachedToRef ?? firstAdultRef;
      const freetext = `${inf.firstName} ${inf.lastName} ${inf.dateOfBirth ? iataDateAlpha(inf.dateOfBirth) : ""}`.trim();
      return `
    <dataElementsIndiv>
      <elementManagementData><reference><qualifier>OT</qualifier><number>${startRef + i}</number></reference><segmentName>SSR</segmentName></elementManagementData>
      <serviceRequest><ssr><type>INFT</type><status>HK</status><quantity>1</quantity><companyId>${xmlEscape(carrier)}</companyId><freetext>${xmlEscape(freetext)}</freetext></ssr></serviceRequest>
      <referenceForDataElement><reference><qualifier>PT</qualifier><number>${adultRef}</number></reference></referenceForDataElement>
    </dataElementsIndiv>`;
    })
    .join("");
}

function contactElements(c: BookingContact, startRef: number): string {
  // AP contact: e-mail (APE) + mobile (APM), then a ticketing arrangement (TK).
  const email = `
    <dataElementsIndiv>
      <elementManagementData><reference><qualifier>OT</qualifier><number>${startRef}</number></reference><segmentName>AP</segmentName></elementManagementData>
      <freetextData><freetextDetail><subjectQualifier>3</subjectQualifier><type>P02</type></freetextDetail><longFreetext>${xmlEscape(c.email)}</longFreetext></freetextData>
    </dataElementsIndiv>`;
  const phone = `
    <dataElementsIndiv>
      <elementManagementData><reference><qualifier>OT</qualifier><number>${startRef + 1}</number></reference><segmentName>AP</segmentName></elementManagementData>
      <freetextData><freetextDetail><subjectQualifier>3</subjectQualifier><type>P01</type></freetextDetail><longFreetext>${xmlEscape((c.phoneCountry ? c.phoneCountry + " " : "") + c.phone)}</longFreetext></freetextData>
    </dataElementsIndiv>`;
  return email + phone;
}

function ticketingElement(ref: number, ticketDate?: string): string {
  const date = ticketDate ? iataDate(ticketDate) : iataDate(new Date().toISOString().slice(0, 10));
  return `
    <dataElementsIndiv>
      <elementManagementData><reference><qualifier>OT</qualifier><number>${ref}</number></reference><segmentName>TK</segmentName></elementManagementData>
      <ticketElement><ticket><indicator>TL</indicator><date>${date}</date></ticket></ticketElement>
    </dataElementsIndiv>`;
}

/** CTCE (email) / CTCM (mobile) SSR — carrier contact, mandated by many LCCs. */
function contactSsrElements(c: BookingContact, carrier: string, startRef: number): string {
  const ctce = `
    <dataElementsIndiv>
      <elementManagementData><reference><qualifier>OT</qualifier><number>${startRef}</number></reference><segmentName>SSR</segmentName></elementManagementData>
      <serviceRequest><ssr><type>CTCE</type><status>HK</status><quantity>1</quantity><companyId>${xmlEscape(carrier)}</companyId><freetext>${xmlEscape(c.email.replace(/@/g, "//"))}</freetext></ssr></serviceRequest>
    </dataElementsIndiv>`;
  const ctcm = `
    <dataElementsIndiv>
      <elementManagementData><reference><qualifier>OT</qualifier><number>${startRef + 1}</number></reference><segmentName>SSR</segmentName></elementManagementData>
      <serviceRequest><ssr><type>CTCM</type><status>HK</status><quantity>1</quantity><companyId>${xmlEscape(carrier)}</companyId><freetext>${xmlEscape((c.phoneCountry || "") + c.phone)}</freetext></ssr></serviceRequest>
    </dataElementsIndiv>`;
  return ctce + ctcm;
}

function receivedFromElement(ref: number, who: string): string {
  return `
    <dataElementsIndiv>
      <elementManagementData><reference><qualifier>OT</qualifier><number>${ref}</number></reference><segmentName>RF</segmentName></elementManagementData>
      <freetextData><freetextDetail><subjectQualifier>3</subjectQualifier><type>P22</type></freetextDetail><longFreetext>${xmlEscape(who)}</longFreetext></freetextData>
    </dataElementsIndiv>`;
}

/**
 * Build the "add pax + contact + ticketing" PNR_AddMultiElements.
 * `optionCode` 10 on the final call commits (end-transact) the PNR.
 */
function buildPnrAddBody(input: BookingInput, opts: { commit?: boolean } = {}): string {
  const carrier = input.segments[0]?.carrier || "";
  const names = buildNameElements(input.passengers);
  const infantCount = input.passengers.filter((p) => p.type === "INF").length;
  let ref = 1;
  const contacts = contactElements(input.contact, ref);
  ref += 2;
  const ssrs = contactSsrElements(input.contact, carrier, ref);
  ref += 2;
  const infts = infantSsrElements(input.passengers, carrier, ref);
  ref += infantCount;
  const tk = ticketingElement(ref, input.ticketDate);
  ref += 1;
  const rf = receivedFromElement(ref, input.receivedFrom || "TOURISTLEADER");
  const option = opts.commit
    ? `<pnrActions><optionCode>10</optionCode></pnrActions>`
    : `<pnrActions><optionCode>0</optionCode></pnrActions>`;
  return `<PNR_AddMultiElements xmlns="${cfg.ns.pnrAdd}">
    ${option}
    ${names}
    <dataElementsMaster>
      <marker1/>${contacts}${ssrs}${infts}${tk}${rf}
    </dataElementsMaster>
  </PNR_AddMultiElements>`;
}

export async function pnrAddElements(
  input: BookingInput,
  session: AmadeusSession | null,
  opts: { commit?: boolean } = {},
): Promise<SoapResult> {
  return send(
    opts.commit ? "PNR_AddMultiElements(commit)" : "PNR_AddMultiElements",
    cfg.actions.pnrAdd,
    buildPnrAddBody(input, opts),
    session,
  );
}

/** Commit an existing PNR (end-transact only, no new elements). */
export async function pnrCommit(session: AmadeusSession | null): Promise<SoapResult> {
  const body = `<PNR_AddMultiElements xmlns="${cfg.ns.pnrAdd}"><pnrActions><optionCode>10</optionCode></pnrActions></PNR_AddMultiElements>`;
  return send("PNR_AddMultiElements(commit)", cfg.actions.pnrAdd, body, session);
}

/** Extract the 6-char record locator (PNR) from any PNR reply. */
export function recordLocator(xml: string): string {
  const ctrl = blocks(xml, "reservation")[0] || blocks(xml, "controlNumber")[0] || xml;
  return val(ctrl, "controlNumber") || val(xml, "reservation") || "";
}

// ---------------------------------------------------------------------------
// 3 · FOP_CreateFormOfPayment
// ---------------------------------------------------------------------------

function buildFopBody(fop: FormOfPayment): string {
  const detail =
    fop.type === "CARD"
      ? `<mopDescription>
          <paymentModule>
            <paymentData>
              <billingAddress/>
              <creditCardData>
                <cardInformation><vendorCode>${xmlEscape(fop.vendor || "VI")}</vendorCode><cardNumber>${xmlEscape(fop.cardNumber || "")}</cardNumber><expiryDate>${xmlEscape(fop.expiry || "")}</expiryDate><ccHolderName>${xmlEscape(fop.holder || "")}</ccHolderName></cardInformation>
              </creditCardData>
            </paymentData>
            <mopDetails><fopPNRDetails><fopDetails><fopCode>CC</fopCode></fopDetails></fopPNRDetails></mopDetails>
          </paymentModule>
        </mopDescription>`
      : `<mopDescription>
          <paymentModule>
            <mopDetails><fopPNRDetails><fopDetails><fopCode>CA</fopCode></fopDetails></fopPNRDetails></mopDetails>
          </paymentModule>
        </mopDescription>`;
  return `<FOP_CreateFormOfPayment xmlns="${cfg.ns.fop}">
    <transactionContext><transactionDetails><code>FP</code></transactionDetails></transactionContext>
    <fopGroup><fopReference><referenceType>FP</referenceType></fopReference><mopDescription>${detail}</mopDescription></fopGroup>
  </FOP_CreateFormOfPayment>`;
}

export async function createFormOfPayment(fop: FormOfPayment, session: AmadeusSession | null): Promise<SoapResult> {
  return send("FOP_CreateFormOfPayment", cfg.actions.fop, buildFopBody(fop), session);
}

// ---------------------------------------------------------------------------
// 4 · Fare_PricePNRWithBookingClass
// ---------------------------------------------------------------------------

function buildPricePnrBody(): string {
  // RP = price with the booking class already in the PNR; RU = published fares.
  return `<Fare_PricePNRWithBookingClass xmlns="${cfg.ns.pricePnr}">
    <pricingOptionGroup>
      <pricingOptionKey><pricingOptionKey>RP</pricingOptionKey></pricingOptionKey>
    </pricingOptionGroup>
    <pricingOptionGroup>
      <pricingOptionKey><pricingOptionKey>RU</pricingOptionKey></pricingOptionKey>
    </pricingOptionGroup>
  </Fare_PricePNRWithBookingClass>`;
}

export async function pricePnr(session: AmadeusSession | null): Promise<SoapResult> {
  return send("Fare_PricePNRWithBookingClass", cfg.actions.pricePnr, buildPricePnrBody(), session);
}

// ---------------------------------------------------------------------------
// 5 · Ticket_CreateTSTFromPricing
// ---------------------------------------------------------------------------

function buildCreateTstBody(tstCount: number): string {
  const items = Array.from({ length: Math.max(1, tstCount) }, (_, i) => `<itemReference><referenceType>TST</referenceType><uniqueReference>${i + 1}</uniqueReference></itemReference>`).join("");
  return `<Ticket_CreateTSTFromPricing xmlns="${cfg.ns.createTst}">
    <psaList><itemReference>${items}</itemReference></psaList>
  </Ticket_CreateTSTFromPricing>`;
}

export async function createTst(tstCount: number, session: AmadeusSession | null): Promise<SoapResult> {
  return send("Ticket_CreateTSTFromPricing", cfg.actions.createTst, buildCreateTstBody(tstCount), session);
}

// ---------------------------------------------------------------------------
// 6 · PNR_Retrieve
// ---------------------------------------------------------------------------

function buildPnrRetrieveBody(pnr: string): string {
  return `<PNR_Retrieve xmlns="${cfg.ns.pnrRetrieve}">
    <retrievalFacts><retrieve><type>2</type></retrieve><reservationOrProfileIdentifier><reservation><controlNumber>${xmlEscape(pnr)}</controlNumber></reservation></reservationOrProfileIdentifier></retrievalFacts>
  </PNR_Retrieve>`;
}

export async function pnrRetrieve(pnr: string, session: AmadeusSession | null): Promise<SoapResult> {
  return send("PNR_Retrieve", cfg.actions.pnrRetrieve, buildPnrRetrieveBody(pnr), session);
}

// ---------------------------------------------------------------------------
// 7 · DocIssuance_IssueTicket
// ---------------------------------------------------------------------------

function buildIssueTicketBody(): string {
  // ITY / ET = issue electronic ticket for all TSTs in the PNR.
  return `<DocIssuance_IssueTicket xmlns="${cfg.ns.issueTicket}">
    <optionGroup><switches><statusDetails><indicator>ET</indicator></statusDetails></switches></optionGroup>
  </DocIssuance_IssueTicket>`;
}

export async function issueTicket(session: AmadeusSession | null, close = false): Promise<SoapResult> {
  return send("DocIssuance_IssueTicket", cfg.actions.issueTicket, buildIssueTicketBody(), session, close);
}

/** Pull ticket numbers (e-ticket 13-digit) out of a DocIssuance / PNR_Retrieve reply. */
export function ticketNumbers(xml: string): string[] {
  const out = new Set<string>();
  for (const t of blocks(xml, "documentDetails")) {
    const n = val(t, "number") || val(t, "documentNumber");
    if (n) out.add(n);
  }
  for (const m of xml.match(/\b\d{3}-?\d{10}\b/g) || []) out.add(m);
  return [...out];
}

// ---------------------------------------------------------------------------
// Ancillaries — Air_RetrieveSeatMap + SSR seat/bag/meal
// ---------------------------------------------------------------------------

function buildSeatMapBody(segments: SellSegment[]): string {
  const flights = segments
    .map((s) => `
      <flightInfo>
        <flightDetails><departureDate>${iataDate(s.departDate)}</departureDate><boardPoint>${xmlEscape(s.from)}</boardPoint><offPoint>${xmlEscape(s.to)}</offPoint><company>${xmlEscape(s.carrier)}</company><flightNumber>${xmlEscape(s.flightNumber)}</flightNumber><bookingClass>${xmlEscape(s.bookingClass)}</bookingClass></flightDetails>
      </flightInfo>`)
    .join("");
  return `<Air_RetrieveSeatMap xmlns="${cfg.ns.seatMap}"><seatRequestParameters/>${flights}</Air_RetrieveSeatMap>`;
}

export async function retrieveSeatMap(segments: SellSegment[], session: AmadeusSession | null): Promise<SoapResult> {
  return send("Air_RetrieveSeatMap", cfg.actions.seatMap, buildSeatMapBody(segments), session);
}

export interface AncillarySelection {
  paxRef: number;
  segmentRef: number; // 1-based itinerary segment
  /** RQST = seat request (with `seat`), or an SSR code like NSST/BAGS/AVML/VGML. */
  ssrType: string;
  seat?: string; // e.g. "12A" for RQST
  quantity?: number;
  carrier: string;
  freetext?: string;
}

function ancillarySsr(a: AncillarySelection, ref: number): string {
  const seatFt = a.seat ? `<freetext>${xmlEscape(a.seat)}</freetext>` : a.freetext ? `<freetext>${xmlEscape(a.freetext)}</freetext>` : "";
  return `
    <dataElementsIndiv>
      <elementManagementData><reference><qualifier>OT</qualifier><number>${ref}</number></reference><segmentName>SSR</segmentName></elementManagementData>
      <serviceRequest><ssr>
        <type>${xmlEscape(a.ssrType)}</type><status>NN</status><quantity>${a.quantity || 1}</quantity>
        <companyId>${xmlEscape(a.carrier)}</companyId>${seatFt}
      </ssr></serviceRequest>
      <referenceForDataElement><reference><qualifier>PT</qualifier><number>${a.paxRef}</number></reference><reference><qualifier>ST</qualifier><number>${a.segmentRef}</number></reference></referenceForDataElement>
    </dataElementsIndiv>`;
}

function buildAncillaryBody(selections: AncillarySelection[]): string {
  let ref = 1;
  const els = selections.map((a) => ancillarySsr(a, ref++)).join("");
  return `<PNR_AddMultiElements xmlns="${cfg.ns.pnrAdd}"><pnrActions><optionCode>0</optionCode></pnrActions><dataElementsMaster><marker1/>${els}</dataElementsMaster></PNR_AddMultiElements>`;
}

/** Add seat/bag/meal SSRs to the PNR (not committed until pnrCommit). */
export async function addAncillaries(selections: AncillarySelection[], session: AmadeusSession | null): Promise<SoapResult> {
  return send("PNR_AddMultiElements(SSR)", cfg.actions.pnrAdd, buildAncillaryBody(selections), session);
}

// ---------------------------------------------------------------------------
// EMD — Ticket_CreateTSMFareElement then DocIssuance (EMD issue)
// ---------------------------------------------------------------------------

function buildTsmBody(): string {
  return `<Ticket_CreateTSMFareElement xmlns="${cfg.ns.createTsm}"><selection><selectionDetails><option>TSM</option></selectionDetails></selection></Ticket_CreateTSMFareElement>`;
}

function buildEmdBody(): string {
  return `<DocIssuance_IssueMiscellaneousDocuments xmlns="${cfg.ns.issueEmd}"><optionGroup><switches><statusDetails><indicator>EMD</indicator></statusDetails></switches></optionGroup></DocIssuance_IssueMiscellaneousDocuments>`;
}

export async function createTsm(session: AmadeusSession | null): Promise<SoapResult> {
  return send("Ticket_CreateTSMFareElement", cfg.actions.createTsm, buildTsmBody(), session);
}

export async function issueEmd(session: AmadeusSession | null): Promise<SoapResult> {
  return send("DocIssuance_IssueMiscellaneousDocuments", cfg.actions.issueEmd, buildEmdBody(), session);
}

// ---------------------------------------------------------------------------
// Cancellation — Ticket_CancelDocument (void e-ticket) + PNR_Cancel (XE)
// ---------------------------------------------------------------------------

function buildCancelDocBody(ticketNumber: string): string {
  return `<Ticket_CancelDocument xmlns="${cfg.ns.cancelDoc}">
    <ticketNumber><documentDetails><number>${xmlEscape(ticketNumber)}</number></documentDetails></ticketNumber>
    <actionDetails><actionRequest><actionDetail><otherDataFreetext><freeText>CANX</freeText></otherDataFreetext></actionDetail></actionRequest></actionDetails>
  </Ticket_CancelDocument>`;
}

function buildPnrCancelBody(): string {
  // optionCode 10 = end-transact the cancellation; ITY = cancel all itinerary elements.
  return `<PNR_Cancel xmlns="${cfg.ns.pnrCancel}">
    <pnrActions><optionCode>10</optionCode></pnrActions>
    <cancelElements><entryType>E</entryType><element><identifier>ITY</identifier></element></cancelElements>
  </PNR_Cancel>`;
}

function buildSignOutBody(): string {
  return `<Security_SignOut xmlns="${cfg.ns.signOut}"><SessionId/></Security_SignOut>`;
}

export async function cancelTicket(ticketNumber: string, session: AmadeusSession | null): Promise<SoapResult> {
  return send("Ticket_CancelDocument", cfg.actions.cancelDoc, buildCancelDocBody(ticketNumber), session);
}

export async function pnrCancel(session: AmadeusSession | null, close = true): Promise<SoapResult> {
  return send("PNR_Cancel", cfg.actions.pnrCancel, buildPnrCancelBody(), session, close);
}

/** Explicit session teardown (VLSSOQ) — used if the flow aborts mid-series. */
export async function signOut(session: AmadeusSession | null): Promise<SoapResult> {
  return send("Security_SignOut", cfg.actions.signOut, buildSignOutBody(), session, true);
}

// ---------------------------------------------------------------------------
// Orchestrator — full certification booking flow with IBP-on-288 fallback
// ---------------------------------------------------------------------------

export interface BookingFlowOptions {
  /** Seat / meal / baggage SSRs — added after names, before pricing. */
  ancillaries?: AncillarySelection[];
  /** Issue an EMD (createTSM + DocIssuance) after the e-ticket. */
  emd?: boolean;
  /** Void the e-ticket + cancel the PNR at the end (TC1-style teardown). */
  cancel?: boolean;
}

export interface BookingFlowResult {
  pnr: string;
  ticketNumbers: string[];
  sold: boolean;
  ticketed: boolean;
  emdIssued: boolean;
  cancelled: boolean;
  usedIbpFallback: boolean;
  finalClasses: string[];
  errors: string[];
}

/**
 * Runs the full certification flow inside a single stateful session:
 *   Sell → [SSR] → PNR names/contact → FOP → Price → TST → commit → Retrieve →
 *   Issue → [EMD] → [Cancel] → SignOut.
 * On Air_Sell 288/UNS it runs the IBP fallback once, substitutes the available
 * booking class(es), and re-sells. The session is always released via
 * Security_SignOut, so the flow never leaves a session dangling on the gateway.
 */
export async function runBookingFlow(input: BookingInput, opts: BookingFlowOptions = {}): Promise<BookingFlowResult> {
  const errors: string[] = [];
  let usedIbpFallback = false;
  let segments = input.segments;
  sellSeatCount = input.passengers.filter((p) => p.type !== "INF").length || 1;

  // 1 · Sell (with one IBP-driven retry on UNS) — opens the session.
  let sell = await airSell(segments, null);
  let session = sell.session;
  if (sell.fault) errors.push(`Air_Sell fault: ${sell.fault}`);

  if (isUnableToSell(sell.xml)) {
    usedIbpFallback = true;
    errors.push("Air_Sell returned 288/UNS — running IBP fallback");
    const ibp = await informativeBestPricing(input.passengers, segments, session);
    session = ibp.session;
    const classes = bookingClassesFromIbp(ibp.xml);
    if (classes.length) {
      segments = applyClasses(segments, classes);
      sell = await airSell(segments, session);
      session = sell.session;
      if (isUnableToSell(sell.xml)) errors.push("Still UNS after IBP re-price — no available class in test inventory");
    } else {
      errors.push("IBP returned no substitute booking class");
    }
  }
  const sold = !isUnableToSell(sell.xml) && !!session;

  if (!sold) {
    if (session) await signOut(session).catch(() => {});
    return { pnr: "", ticketNumbers: [], sold: false, ticketed: false, emdIssued: false, cancelled: false, usedIbpFallback, finalClasses: segments.map((s) => s.bookingClass), errors: errors.concat(collectErrors(sell.xml)) };
  }

  // 2 · Names + contact + ticketing (no commit yet).
  const add = await pnrAddElements(input, session);
  session = add.session;
  errors.push(...collectErrors(add.xml));

  // 2b · Ancillaries (seat / meal / baggage) — added before pricing so they price.
  if (opts.ancillaries?.length) {
    const anc = await addAncillaries(opts.ancillaries, session);
    session = anc.session;
    errors.push(...collectErrors(anc.xml));
  }

  // 3 · Form of payment.
  const fop = await createFormOfPayment(input.fop, session);
  session = fop.session;
  errors.push(...collectErrors(fop.xml));

  // 4 · Price the PNR.
  const priced = await pricePnr(session);
  session = priced.session;
  errors.push(...collectErrors(priced.xml));

  // 5 · Create the TST(s) — one per seat-occupying passenger.
  const tst = await createTst(input.passengers.filter((p) => p.type !== "INF").length || 1, session);
  session = tst.session;
  errors.push(...collectErrors(tst.xml));

  // 6 · Commit (end-transact) → record locator.
  const commit = await pnrCommit(session);
  session = commit.session;
  const pnr = recordLocator(commit.xml);
  errors.push(...collectErrors(commit.xml));

  // 7 · Retrieve the committed PNR.
  const retrieved = await pnrRetrieve(pnr, session);
  session = retrieved.session;

  // 8 · Issue the e-ticket.
  const issued = await issueTicket(session);
  session = issued.session;
  const tickets = ticketNumbers(issued.xml).concat(ticketNumbers(retrieved.xml));
  const ticketed = tickets.length > 0 && !issued.fault;
  errors.push(...collectErrors(issued.xml));

  // 9 · EMD (ancillary document) — optional.
  let emdIssued = false;
  if (opts.emd) {
    const tsm = await createTsm(session);
    session = tsm.session;
    errors.push(...collectErrors(tsm.xml));
    const emd = await issueEmd(session);
    session = emd.session;
    emdIssued = !emd.fault && ticketNumbers(emd.xml).length > 0;
    errors.push(...collectErrors(emd.xml));
  }

  // 10 · Cancel (void e-ticket + cancel PNR) — optional teardown.
  let cancelled = false;
  if (opts.cancel) {
    for (const tn of [...new Set(tickets)]) {
      const cx = await cancelTicket(tn, session);
      session = cx.session;
      errors.push(...collectErrors(cx.xml));
    }
    const xc = await pnrCancel(session, false);
    session = xc.session;
    cancelled = !xc.fault;
    errors.push(...collectErrors(xc.xml));
  }

  // Release the session.
  if (session) await signOut(session).catch(() => {});

  return {
    pnr,
    ticketNumbers: [...new Set(tickets)],
    sold: true,
    ticketed,
    emdIssued,
    cancelled,
    usedIbpFallback,
    finalClasses: segments.map((s) => s.bookingClass),
    errors: errors.filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// Shape inspection / cert documentation
// ---------------------------------------------------------------------------

export interface PlannedMessage {
  step: number;
  name: string;
  action: string;
  sessionStatus: "Start" | "InSeries" | "End";
  body: string;
  /** Full SOAP envelope as it would go on the wire (sample session for InSeries). */
  envelope: string;
  /** Set when the message is only sent under a condition (e.g. the IBP fallback). */
  conditional?: string;
}

const SAMPLE_SESSION: AmadeusSession = {
  sessionId: "SESSION-SAMPLE-0001",
  sequenceNumber: 0,
  securityToken: "SECURITY-TOKEN-SAMPLE",
};

/**
 * The ordered request messages for a booking case — no network I/O. Mirrors the
 * exact sequence runBookingFlow() sends for the same options, so it is used to
 * (a) shape-verify every envelope against the WBS guide and (b) render the
 * "Headers / Payload / Envelope / Flow Chart" per test case for the client.
 * The IBP message is included but flagged `conditional` (sent only on 288/UNS);
 * the PNR record locator isn't known ahead of the live reply, so Retrieve uses a
 * placeholder.
 */
export function planBookingMessages(input: BookingInput, opts: BookingFlowOptions = {}): PlannedMessage[] {
  const seats = input.passengers.filter((p) => p.type !== "INF").length || 1;
  sellSeatCount = seats;

  type Step = { name: string; action: string; body: string; conditional?: string };
  const steps: Step[] = [];
  steps.push({ name: "Air_SellFromRecommendation", action: cfg.actions.sell, body: buildSellBody(input.segments) });
  steps.push({
    name: "Fare_InformativeBestPricingWithoutPNR",
    action: cfg.actions.ibp,
    body: buildIbpBody(input.passengers, input.segments),
    conditional: "Sent only if Air_Sell returns errorCode 288 / UNS — re-prices the same flights on an available class, then Air_Sell is retried with that class.",
  });
  steps.push({ name: "PNR_AddMultiElements", action: cfg.actions.pnrAdd, body: buildPnrAddBody(input) });
  if (opts.ancillaries?.length) {
    steps.push({ name: "Air_RetrieveSeatMap", action: cfg.actions.seatMap, body: buildSeatMapBody(input.segments) });
    steps.push({ name: "PNR_AddMultiElements(SSR)", action: cfg.actions.pnrAdd, body: buildAncillaryBody(opts.ancillaries) });
  }
  steps.push({ name: "FOP_CreateFormOfPayment", action: cfg.actions.fop, body: buildFopBody(input.fop) });
  steps.push({ name: "Fare_PricePNRWithBookingClass", action: cfg.actions.pricePnr, body: buildPricePnrBody() });
  steps.push({ name: "Ticket_CreateTSTFromPricing", action: cfg.actions.createTst, body: buildCreateTstBody(seats) });
  steps.push({ name: "PNR_AddMultiElements(commit)", action: cfg.actions.pnrAdd, body: buildPnrAddBody(input, { commit: true }) });
  steps.push({ name: "PNR_Retrieve", action: cfg.actions.pnrRetrieve, body: buildPnrRetrieveBody("XXXXXX") });
  steps.push({ name: "DocIssuance_IssueTicket", action: cfg.actions.issueTicket, body: buildIssueTicketBody() });
  if (opts.emd) {
    steps.push({ name: "Ticket_CreateTSMFareElement", action: cfg.actions.createTsm, body: buildTsmBody() });
    steps.push({ name: "DocIssuance_IssueMiscellaneousDocuments", action: cfg.actions.issueEmd, body: buildEmdBody() });
  }
  if (opts.cancel) {
    steps.push({ name: "Ticket_CancelDocument", action: cfg.actions.cancelDoc, body: buildCancelDocBody("0002412345678") });
    steps.push({ name: "PNR_Cancel", action: cfg.actions.pnrCancel, body: buildPnrCancelBody() });
  }
  steps.push({ name: "Security_SignOut", action: cfg.actions.signOut, body: buildSignOutBody() });

  // Session status: the first real (non-conditional) message opens with Start; the
  // last message closes with End; everything between is InSeries.
  const firstRealIdx = steps.findIndex((s) => !s.conditional);
  const lastIdx = steps.length - 1;
  return steps.map((s, i) => {
    const status: "Start" | "InSeries" | "End" = i === firstRealIdx ? "Start" : i === lastIdx ? "End" : "InSeries";
    return {
      step: i + 1,
      name: s.name,
      action: s.action,
      sessionStatus: status,
      body: s.body,
      conditional: s.conditional,
      envelope: buildEnvelope(s.action, s.body, status === "Start" ? null : SAMPLE_SESSION, status === "End"),
    };
  });
}

// ---------------------------------------------------------------------------
// small utils
// ---------------------------------------------------------------------------

function groupBy<T>(arr: T[], key: (t: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of arr) (out[key(item)] ||= []).push(item);
  return out;
}
