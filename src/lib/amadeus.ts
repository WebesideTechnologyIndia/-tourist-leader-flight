/**
 * Amadeus Enterprise "1A" SOAP Web Services client (1ASIW).
 *
 * Implements the WS-Security <UsernameToken> password-digest scheme used by the
 * Amadeus SOAP gateway — i.e. the exact algorithm from the client's "SOAP 4.0
 * Encryption" helper, ported to Node crypto:
 *
 *     PasswordDigest = Base64( SHA1( nonce_bytes + created_bytes + SHA1(password)_bytes ) )
 *
 * Flight shopping uses Fare_MasterPricerTravelBoardSearch (FMPTBQ). Every public
 * function degrades gracefully to locally-generated data (so the UI keeps working)
 * until real credentials are added to the environment.
 *
 * Required env (add to .env — never committed):
 *   AMADEUS_ENDPOINT        full SOAP endpoint URL (the "SOAP endpoint URL" from Amadeus)
 *   AMADEUS_WS_USER         WS User ID
 *   AMADEUS_WS_PASSWORD     WS password (plain; only the digest is ever sent)
 *   AMADEUS_OFFICE_ID       Office ID / PCC
 *   AMADEUS_SEARCH_ACTION   SOAP Action for the search (default FMPTBQ_12_4_1A)
 *   AMADEUS_SEARCH_NS       Message namespace for the search request body
 *   AMADEUS_LIVE=1          force live calls (otherwise auto when configured)
 *   AMADEUS_DEBUG=1         log raw SOAP response to the server console
 */
import crypto from "crypto";
import { generateFlights } from "./mock-flights";
import type { SearchQuery, Flight, FareOption } from "./types";
import { loggedSoapPost } from "./logged-fetch";

const cfg = {
  endpoint: (process.env.AMADEUS_ENDPOINT || "").trim(),
  wsUser: (process.env.AMADEUS_WS_USER || "").trim(),
  wsPassword: process.env.AMADEUS_WS_PASSWORD || "",
  officeId: (process.env.AMADEUS_OFFICE_ID || "").trim(),
  searchAction: (process.env.AMADEUS_SEARCH_ACTION || "http://webservices.amadeus.com/FMPTBQ_24_6_1A").trim(),
  searchNs: (process.env.AMADEUS_SEARCH_NS || "http://xml.amadeus.com/FMPTBQ_24_6_1A").trim(),
  debug: process.env.AMADEUS_DEBUG === "1",
  forceLive: process.env.AMADEUS_LIVE === "1",
};

const TIMEOUT_MS = 20000;

/** True when the four mandatory credentials are present. */
export function amadeusConfigured(): boolean {
  return !!(cfg.endpoint && cfg.wsUser && cfg.wsPassword && cfg.officeId);
}

// ---------------------------------------------------------------------------
// WS-Security
// ---------------------------------------------------------------------------

function sha1(buf: Buffer): Buffer {
  return crypto.createHash("sha1").update(buf).digest();
}

/** Build the WS-Security pieces. `created` is reused verbatim in the digest and the XML. */
function wsSecurity() {
  const created = new Date().toISOString(); // e.g. 2026-06-13T10:21:08.470Z
  const nonceBuf = crypto.randomBytes(16);
  const nonceB64 = nonceBuf.toString("base64");
  const pwdSha = sha1(Buffer.from(cfg.wsPassword, "utf8"));
  const digest = sha1(Buffer.concat([nonceBuf, Buffer.from(created, "utf8"), pwdSha])).toString("base64");
  return { created, nonceB64, digest };
}

function uuid(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// SOAP envelope
// ---------------------------------------------------------------------------

function buildEnvelope(action: string, bodyXml: string): string {
  const { created, nonceB64, digest } = wsSecurity();
  const mid = uuid();
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header>
    <add:MessageID xmlns:add="http://www.w3.org/2005/08/addressing">${mid}</add:MessageID>
    <add:Action xmlns:add="http://www.w3.org/2005/08/addressing">${action}</add:Action>
    <add:To xmlns:add="http://www.w3.org/2005/08/addressing">${xmlEscape(cfg.endpoint)}</add:To>
    <link:TransactionFlowLink xmlns:link="http://wsdl.amadeus.com/2010/06/ws/Link_v1"/>
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
    </AMA_SecurityHostedUser>
  </soapenv:Header>
  <soapenv:Body>${bodyXml}</soapenv:Body>
</soapenv:Envelope>`;
}

async function soapCall(action: string, bodyXml: string): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const envelope = buildEnvelope(action, bodyXml);
    return await loggedSoapPost("AMADEUS", cfg.endpoint, envelope, action, controller.signal);
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------------------
// Fare_MasterPricerTravelBoardSearch (flight shopping)
// ---------------------------------------------------------------------------

const CABIN_CODE: Record<string, string> = { Economy: "Y", Premium: "W", Business: "C" };

/** YYYY-MM-DD -> ddMMyy (Amadeus date format). */
function iataDate(iso: string): string {
  const d = new Date((iso || "").length === 10 ? iso + "T00:00:00Z" : iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(2);
  return `${dd}${mm}${yy}`;
}

function itinerarySegment(ref: number, from: string, to: string, dateIso: string): string {
  return `
    <itinerary>
      <requestedSegmentRef><segRef>${ref}</segRef></requestedSegmentRef>
      <departureLocalization><departurePoint><locationId>${xmlEscape(from)}</locationId></departurePoint></departureLocalization>
      <arrivalLocalization><arrivalPointDetails><locationId>${xmlEscape(to)}</locationId></arrivalPointDetails></arrivalLocalization>
      <timeDetails><firstDateTimeDetail><date>${iataDate(dateIso)}</date></firstDateTimeDetail></timeDetails>
    </itinerary>`;
}

function buildFmptbRequest(q: SearchQuery): string {
  const adults = Math.max(1, q.travellers.adults || 1);
  const children = q.travellers.children || 0;
  const infants = q.travellers.infants || 0;
  const pax = adults + children; // infants don't occupy a seat unit
  const cabin = CABIN_CODE[q.cabinClass] || "Y";

  // paxReference blocks per PTC
  let refNo = 0;
  const paxBlocks: string[] = [];
  const block = (ptc: string, count: number) => {
    if (count <= 0) return;
    const refs = Array.from({ length: count }, () => `<traveller><ref>${++refNo}</ref></traveller>`).join("");
    paxBlocks.push(`<paxReference><ptc>${ptc}</ptc>${refs}</paxReference>`);
  };
  block("ADT", adults);
  block("CH", children);
  block("INF", infants);

  const itineraries = [itinerarySegment(1, q.from, q.to, q.departDate)];
  if (q.tripType === "ROUND_TRIP" && q.returnDate) {
    itineraries.push(itinerarySegment(2, q.to, q.from, q.returnDate));
  }

  return `<Fare_MasterPricerTravelBoardSearch xmlns="${cfg.searchNs}">
    <numberOfUnit>
      <unitNumberDetail><numberOfUnits>${pax}</numberOfUnits><typeOfUnit>PX</typeOfUnit></unitNumberDetail>
      <unitNumberDetail><numberOfUnits>200</numberOfUnits><typeOfUnit>RC</typeOfUnit></unitNumberDetail>
    </numberOfUnit>
    ${paxBlocks.join("\n    ")}
    <fareOptions>
      <pricingTickInfo>
        <pricingTicketing><priceType>RP</priceType><priceType>RU</priceType><priceType>ET</priceType></pricingTicketing>
      </pricingTickInfo>
    </fareOptions>
    <travelFlightInfo>
      <cabinId><cabinQualifier>RC</cabinQualifier><cabin>${cabin}</cabin></cabinId>
    </travelFlightInfo>${itineraries.join("")}
  </Fare_MasterPricerTravelBoardSearch>`;
}

// ---------------------------------------------------------------------------
// Response parsing (namespace-agnostic, defensive)
// ---------------------------------------------------------------------------

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

/** ddMMyy + hhmm -> ISO string. */
function toIso(date: string, time: string): string {
  if (!/^\d{6}$/.test(date)) return "";
  const dd = +date.slice(0, 2), mm = +date.slice(2, 4), yy = 2000 + +date.slice(4, 6);
  const hh = time.length >= 4 ? +time.slice(0, 2) : 0;
  const min = time.length >= 4 ? +time.slice(2, 4) : 0;
  return new Date(Date.UTC(yy, mm - 1, dd, hh, min)).toISOString();
}

/**
 * Booking classes (RBDs) for one recommendation, in segment order.
 *
 * Air_Sell needs the RBD the fare was quoted in — the price on screen is only
 * held for that class. FMPTB nests it per passenger type, so we read the first
 * `paxFareProduct` (the adult) and take each `groupOfFares` in order; the Nth
 * group corresponds to the Nth segment of the referenced flight group.
 */
function rbdsFromRecommendation(rec: string): string[] {
  const pax = blocks(rec, "paxFareProduct")[0] || rec;
  const details = blocks(pax, "fareDetails");
  const out: string[] = [];
  for (const fd of details) {
    for (const gof of blocks(fd, "groupOfFares")) {
      const prod = blocks(gof, "productInformation")[0] || gof;
      const cabin = blocks(prod, "cabinProduct")[0] || prod;
      const rbd = val(cabin, "rbd");
      if (rbd) out.push(rbd);
    }
  }
  return out;
}

/** ISO timestamp -> YYYY-MM-DD, as Air_Sell expects the departure date. */
function isoDate(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : "";
}

/**
 * Parse an FMPTB response into Flight[]. Best-effort: returns [] on anything
 * unexpected so the caller falls back to generated data.
 */
function parseFmptb(xml: string, q: SearchQuery): Flight[] {
  // 1) Build the flight groups index (1-based: each <flightIndex>/<groupOfFlights>).
  const groups: { segments: Flight["segments"] }[] = [];
  for (const fi of blocks(xml, "flightIndex")) {
    for (const g of blocks(fi, "groupOfFlights")) {
      const segments: Flight["segments"] = [];
      for (const fd of blocks(g, "flightDetails")) {
        const info = blocks(fd, "flightInformation")[0] || fd;
        const pdt = blocks(info, "productDateTime")[0] || info;
        const locs = blocks(info, "location");
        const from = val(locs[0] || "", "locationId");
        const to = val(locs[1] || "", "locationId");
        const carrier = val(blocks(info, "companyId")[0] || info, "marketingCompany") || val(info, "marketingCompany");
        const fno = val(info, "flightOrtrainNumber");
        const dep = toIso(val(pdt, "dateOfDeparture"), val(pdt, "timeOfDeparture"));
        const arr = toIso(val(pdt, "dateOfArrival"), val(pdt, "timeOfArrival"));
        if (from && to) {
          segments.push({
            airlineCode: carrier,
            airlineName: airlineName(carrier),
            flightNumber: `${carrier} ${fno}`.trim(),
            from, to, departTime: dep, arriveTime: arr,
            durationMinutes: dep && arr ? Math.max(0, Math.round((+new Date(arr) - +new Date(dep)) / 60000)) : 0,
          });
        }
      }
      if (segments.length) groups.push({ segments });
    }
  }
  if (!groups.length) return [];

  // 2) Recommendations -> price + referenced group(s). Map to a Flight.
  const out: Flight[] = [];
  const recs = blocks(xml, "recommendation");
  recs.forEach((rec, i) => {
    try {
      const priceInfo = blocks(rec, "recPriceInfo")[0] || rec;
      const amount = parseFloat(val(blocks(priceInfo, "monetaryDetail")[0] || priceInfo, "amount") || "0");
      if (!amount) return;

      // first referenced flight group (segref order matches itinerary)
      const ref = parseInt(val(blocks(rec, "referencingDetail")[0] || rec, "refNumber") || "0", 10);
      const group = groups[ref - 1] || groups[i] || groups[0];
      if (!group) return;

      // RBDs are positional against the group's segments; if the response gives
      // fewer than expected the last one repeats (single-class recommendation).
      const rbds = rbdsFromRecommendation(rec);
      const segs = group.segments.map((s, si) => ({ ...s, bookingClass: rbds[si] || rbds[rbds.length - 1] || "" }));
      const first = segs[0], last = segs[segs.length - 1];

      // Everything Air_Sell needs to re-sell exactly this itinerary at checkout.
      // Built only when every segment resolved an RBD and a departure date —
      // a partial ref would fail mid-sell, after the customer has paid.
      const sellSegments = segs.map((s) => ({
        from: s.from,
        to: s.to,
        departDate: isoDate(s.departTime),
        carrier: s.airlineCode,
        flightNumber: s.flightNumber.replace(/\D/g, ""),
        bookingClass: s.bookingClass || "",
        // One OD group per direction: segments returning toward the origin are leg 2.
        group: q.tripType === "ROUND_TRIP" && s.from !== q.from && s.to === q.from ? 2 : 1,
      }));
      const bookable = sellSegments.every((s) => s.bookingClass && s.departDate && s.flightNumber && s.carrier);

      out.push({
        id: `AM-${i}-${first.flightNumber}`.replace(/\s+/g, ""),
        source: "AMADEUS",
        live: true,
        bookingRef: bookable ? { supplier: "AMADEUS" as const, segments: sellSegments } : undefined,
        airlineCode: first.airlineCode,
        airlineName: first.airlineName,
        flightNumber: first.flightNumber,
        from: first.from,
        to: last.to,
        departTime: first.departTime,
        arriveTime: last.arriveTime,
        durationMinutes: segs.reduce((a, s) => a + s.durationMinutes, 0),
        stops: Math.max(0, segs.length - 1),
        layoverAirports: segs.slice(0, -1).map((s) => s.to).filter(Boolean),
        refundable: false,
        cabinBaggage: "7 kg",
        checkInBaggage: "15 kg",
        basePrice: Math.round(amount),
        fares: buildFaresFromBase(Math.round(amount)),
        segments: segs,
      });
    } catch {
      /* skip malformed recommendation */
    }
  });

  return out.filter((f) => f.basePrice > 0 && f.departTime).sort((a, b) => a.basePrice - b.basePrice);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function searchFlights(q: SearchQuery): Promise<{ flights: Flight[]; live: boolean }> {
  // Live calls require the credentials AND an explicit AMADEUS_LIVE=1 switch
  // (so dev/preview never hits the live GDS by accident). Otherwise demo data.
  if (!amadeusConfigured() || !cfg.forceLive) return { flights: generateFlights(q, "AMADEUS"), live: false };
  try {
    const xml = await soapCall(cfg.searchAction, buildFmptbRequest(q));
    if (/<(?:\w+:)?Fault\b/.test(xml)) {
      console.warn("[amadeus] SOAP fault:", val(xml, "faultstring") || val(xml, "Reason") || "unknown");
      return { flights: generateFlights(q, "AMADEUS"), live: false };
    }
    const flights = parseFmptb(xml, q);
    if (flights.length) return { flights, live: true };
    console.warn("[amadeus] search returned 0 mapped flights, using fallback");
  } catch (err) {
    console.warn("[amadeus] search failed, using fallback:", (err as Error).message);
  }
  return { flights: generateFlights(q, "AMADEUS"), live: false };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function xmlEscape(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function airlineName(code: string): string {
  const map: Record<string, string> = {
    AI: "Air India", "6E": "IndiGo", UK: "Vistara", SG: "SpiceJet", QP: "Akasa Air",
    I5: "AIX Connect", G8: "Go First", EK: "Emirates", EY: "Etihad Airways", QR: "Qatar Airways",
    SQ: "Singapore Airlines", TG: "Thai Airways", BA: "British Airways", LH: "Lufthansa",
  };
  return map[code] || code || "Airline";
}

function buildFaresFromBase(base: number): FareOption[] {
  const mult = [
    { id: "FEE_SAVER", label: "Fee Saver", m: 0.92, badge: "Lowest", seat: "Chargeable", meal: "Chargeable", cancel: "Restrictive", checkin: "15 kg" },
    { id: "REGULAR", label: "Regular", m: 1, seat: "Paid selection", meal: "Paid", cancel: "Standard", checkin: "15 kg" },
    { id: "COMFORT", label: "Comfort", m: 1.18, badge: "Popular", seat: "Free standard seat", meal: "Free veg/non-veg", cancel: "Lower fees", checkin: "15 kg" },
    { id: "YOUR_CHOICE", label: "Your Choice", m: 1.42, badge: "Customisable", seat: "Free preferred seat", meal: "Free meals", cancel: "Free cancellation", checkin: "25 kg" },
  ] as const;
  return mult.map((f) => ({
    id: f.id as FareOption["id"],
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
