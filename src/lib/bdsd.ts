/**
 * BDSD Technology (Travel Technology Solution) Bus API client.
 *
 * Contract source: https://stagingapi.bdsd.technology/docs/ ("Travel API
 * Documentation", v2.1), shared by the client on 2026-08-08. Verified against
 * the live server the same day — see the notes below, which record the parts
 * the docs get wrong or leave out.
 *
 * TRANSPORT (verified by probing, not documented):
 *   - Every documented path is relative to `/api`. The docs print
 *     `/busservice/rest/search`, but that 404s; `/api/busservice/rest/search`
 *     is the real route.
 *   - Auth is two plain request headers, `UserName` and `Password`. The docs
 *     do not mention authentication at all. Wrong header names come back as
 *     `{"Error":{"ErrorCode":401,"ErrorMessage":"Header Authenticate
 *     Information not Present"}}`; correct names with rejected credentials
 *     come back as `"You are not authorized to access this API"`.
 *   - The server rate-limits: rapid calls return ErrorCode 429.
 *   - Errors are returned with HTTP 200 and an `Error.ErrorCode` in the body,
 *     so status codes alone are not enough — always check `Error`.
 *
 * DOCS CAVEAT: each endpoint's "Parameters" tab is boilerplate from the docs
 * template (origin/destination/travelDate/seats/busType enums) and does NOT
 * describe this API. The "Request"/"Response" JSON samples are the real
 * contract; everything below is modelled on those.
 *
 * CITY IDS: `search` takes numeric `OriginId`/`DestinationId` and no city-list
 * endpoint exists, so the mapping comes from the master list the client emailed
 * on 2026-08-08 (14,965 cities). It ships as src/data/bus-cities.json — see
 * `./bus-cities` for lookup and the caveat that 318 names are shared by two
 * different ids, which is why callers should pass ids rather than names.
 *
 * OPEN ITEM blocking live traffic (needs the client / BDSD):
 *   Credentials are rejected on BOTH stagingapi and api hosts with "You are not
 *   authorized to access this API". Most likely our egress IP is not
 *   whitelisted. BDSD needs to whitelist the dev IP and the production egress
 *   IPs, or issue staging-specific credentials — the client asked us to use
 *   staging but only ever sent live credentials.
 *
 * SAFETY: `blockSeat`/`bookTicket`/`cancelTicket` hit the agency wallet for
 * real. They are gated behind BUS_BOOKING_LIVE=1 on top of BUS_LIVE=1 so that
 * turning on live search can never, by itself, spend money. The panel showed
 * Available Balance 0 on 2026-08-08, so a live book would fail on funds today.
 */
import { generateBuses } from "./mock-bus";
import { resolveCityId, describeCityLookup } from "./bus-cities";
import type { BusSearchQuery, BusTrip, BoardingPoint } from "./bus-types";
import { loggedJsonPostWithHeaders } from "./logged-fetch";

const cfg = {
  baseUrl: (process.env.BDSD_BASE_URL || "https://stagingapi.bdsd.technology/api").replace(/\/$/, ""),
  userName: process.env.BDSD_USER_ID || "",
  password: process.env.BDSD_PASSWORD || "",
};
const TIMEOUT = 20000;

export class BdsdError extends Error {
  constructor(readonly code: number, message: string) {
    super(`BDSD ${code}: ${message}`);
    this.name = "BdsdError";
  }
}

interface BdsdEnvelope {
  UserIp?: string;
  SearchTokenId?: string;
  Error?: { ErrorCode: number; ErrorMessage: string };
}

/**
 * POST a documented bus path (e.g. "/busservice/rest/search"). Throws BdsdError
 * when the envelope carries a non-zero ErrorCode, since BDSD reports failures
 * inside a 200 response.
 */
async function bdsdPost<T extends BdsdEnvelope>(path: string, body: Record<string, unknown>): Promise<T> {
  if (!cfg.userName || !cfg.password) throw new BdsdError(401, "BDSD_USER_ID/BDSD_PASSWORD not configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const data = await loggedJsonPostWithHeaders<T>(
      "BDSD",
      `${cfg.baseUrl}${path}`,
      body,
      { UserName: cfg.userName, Password: cfg.password },
      controller.signal,
    );
    const err = data.Error;
    if (err && err.ErrorCode !== 0) throw new BdsdError(err.ErrorCode, err.ErrorMessage || "unknown error");
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** The end user's IP; BDSD echoes it back and uses it for its own audit trail. */
function userIp(ip?: string): string {
  return ip || process.env.BDSD_USER_IP || "127.0.0.1";
}

// ---------------------------------------------------------------- search ----

interface BdsdCityPoint {
  CityPointIndex: number;
  CityPointName: string;
  CityPointLocation?: string;
  CityPointAddress?: string;
  CityPointLandmark?: string;
  CityPointContactNumber?: string;
  CityPointTime: string;
}

interface BdsdBusResult {
  ResultIndex: string;
  TravelName: string;
  BusType: string;
  ServiceName?: string;
  DepartureTime: string;
  ArrivalTime: string;
  AvailableSeats: number;
  MaxSeatsPerTicket?: number;
  LiveTrackingAvailable?: boolean;
  IdProofRequired?: boolean;
  BoardingPointsDetails?: BdsdCityPoint[];
  DroppingPointsDetails?: BdsdCityPoint[];
  BusPrice?: {
    BasePrice?: number;
    PublishedPrice?: number;
    OfferedPrice?: number;
    Tax?: number;
    OtherCharges?: number;
    Discount?: number;
  };
}

interface BdsdSearchResponse extends BdsdEnvelope {
  Result?: BdsdBusResult[];
}

/** "2026-04-21T04:30:00" → "04:30" for the UI's boarding-point list. */
function hhmm(iso: string): string {
  const m = /T(\d{2}:\d{2})/.exec(iso || "");
  return m ? m[1] : "";
}

function toPoints(points: BdsdCityPoint[] | undefined): BoardingPoint[] {
  return (points || []).map((p) => ({
    id: String(p.CityPointIndex),
    name: p.CityPointName || p.CityPointLocation || "",
    time: hhmm(p.CityPointTime),
  }));
}

function minutesBetween(from: string, to: string): number {
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 60000));
}

export function normalizeBuses(data: BdsdSearchResponse, q: BusSearchQuery): BusTrip[] {
  if (!Array.isArray(data.Result)) return [];
  return data.Result.map((r) => {
    const type = r.BusType || "";
    const price = r.BusPrice || {};
    // OfferedPrice is what the agency pays; PublishedPrice is the strike-through.
    const fare = Number(price.OfferedPrice ?? price.PublishedPrice ?? price.BasePrice ?? 0);
    const published = Number(price.PublishedPrice ?? fare);
    return {
      id: r.ResultIndex,
      operator: r.TravelName || r.ServiceName || "",
      busType: type,
      ac: /\ba\/?c\b/i.test(type) && !/non[\s-]?a\/?c/i.test(type),
      sleeper: /sleeper/i.test(type),
      from: q.from,
      to: q.to,
      departTime: r.DepartureTime,
      arriveTime: r.ArrivalTime,
      durationMinutes: minutesBetween(r.DepartureTime, r.ArrivalTime),
      fare,
      originalFare: published > fare ? published : fare,
      // BDSD's search response carries no ratings or amenities.
      rating: 0,
      ratingCount: 0,
      seatsAvailable: Number(r.AvailableSeats) || 0,
      windowSeats: 0,
      amenities: [],
      boardingPoints: toPoints(r.BoardingPointsDetails),
      droppingPoints: toPoints(r.DroppingPointsDetails),
      liveTracking: Boolean(r.LiveTrackingAvailable),
    };
  });
}

export interface BusSearchResult {
  buses: BusTrip[];
  live: boolean;
  searchTokenId?: string;
  /** Why we fell back to generated data, for the API route to surface. */
  reason?: string;
}

/** A city the caller already picked from the master list, by BDSD id. */
export interface BusSearchIds {
  fromId?: number;
  toId?: number;
}

/** Prefer the picked id; fall back to resolving the display name. */
function pickCityId(id: number | undefined, name: string): { id: number | null; why: string } {
  if (typeof id === "number" && Number.isFinite(id) && id > 0) return { id, why: "ok" };
  const resolved = resolveCityId(name);
  return { id: resolved, why: resolved ? "ok" : describeCityLookup(name) };
}

/**
 * Search available trips. Falls back to generated data whenever live search is
 * off, the cities cannot be resolved to BDSD ids, or the call fails, so the UI
 * always has something to render.
 */
export async function searchBuses(q: BusSearchQuery & BusSearchIds, ip?: string): Promise<BusSearchResult> {
  if (process.env.BUS_LIVE !== "1") {
    return { buses: generateBuses(q), live: false, reason: "BUS_LIVE is off" };
  }
  const origin = pickCityId(q.fromId, q.from);
  const destination = pickCityId(q.toId, q.to);
  if (!origin.id || !destination.id) {
    // "ambiguous" means the name is shared by several ids — the picker has to
    // send fromId/toId for those, we must never pick one at random.
    const missing = [
      !origin.id && `${q.from} (${origin.why})`,
      !destination.id && `${q.to} (${destination.why})`,
    ].filter(Boolean).join(", ");
    console.warn(`[bdsd] could not resolve city to a BDSD id: ${missing}`);
    return { buses: generateBuses(q), live: false, reason: `unresolved city: ${missing}` };
  }
  const originId = String(origin.id);
  const destinationId = String(destination.id);
  try {
    const data = await bdsdPost<BdsdSearchResponse>("/busservice/rest/search", {
      UserIp: userIp(ip),
      DateOfJourney: q.date,
      OriginId: originId,
      DestinationId: destinationId,
    });
    const buses = normalizeBuses(data, q);
    if (buses.length) return { buses, live: true, searchTokenId: data.SearchTokenId };
    return { buses: [], live: true, searchTokenId: data.SearchTokenId };
  } catch (err) {
    const message = (err as Error).message;
    console.warn("[bdsd] search failed, using fallback:", message);
    return { buses: generateBuses(q), live: false, reason: message };
  }
}

// ------------------------------------------------- post-search (read-only) ----

interface SeatLayoutResponse extends BdsdEnvelope {
  Result?: { AvailableSeats?: string; HTMLLayout?: string; SeatDetails?: unknown };
}

/** Seat layout for one trip. Read-only: safe to call without the booking gate. */
export async function getSeatLayout(searchTokenId: string, resultIndex: string, ip?: string) {
  const data = await bdsdPost<SeatLayoutResponse>("/busservice/rest/seatlayout", {
    UserIp: userIp(ip),
    SearchTokenId: searchTokenId,
    ResultIndex: resultIndex,
  });
  return data.Result ?? null;
}

interface BoardingPointResponse extends BdsdEnvelope {
  Result?: { BoardingPointsDetails?: BdsdCityPoint[]; DroppingPointsDetails?: BdsdCityPoint[] };
}

/** Boarding/dropping points for one trip. Read-only. */
export async function getBoardingPoints(searchTokenId: string, resultIndex: string, ip?: string) {
  const data = await bdsdPost<BoardingPointResponse>("/busservice/rest/boardingpoint", {
    UserIp: userIp(ip),
    SearchTokenId: searchTokenId,
    ResultIndex: resultIndex,
  });
  return {
    boardingPoints: toPoints(data.Result?.BoardingPointsDetails),
    droppingPoints: toPoints(data.Result?.DroppingPointsDetails),
  };
}

interface BookingDetailResponse extends BdsdEnvelope {
  Result?: Record<string, unknown>;
}

/** Retrieve a booking by BDSD BookingId. Read-only. */
export async function getBookingDetail(searchTokenId: string, bookingId: number, ip?: string) {
  const data = await bdsdPost<BookingDetailResponse>("/busservice/rest/getbookingdetail", {
    UserIp: userIp(ip),
    SearchTokenId: searchTokenId,
    BookingId: bookingId,
  });
  return data.Result ?? null;
}

// --------------------------------------------------- money-spending calls ----

export interface BdsdPassenger {
  LeadPassenger: boolean;
  Title: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phoneno: string;
  /** BDSD sends gender as a numeric string ("1" male / "2" female). */
  Gender: string;
  Age: string;
  SeatName: string;
  Address: string;
  IdType?: string | null;
  IdNumber?: string | null;
}

export interface BlockOrBookRequest {
  searchTokenId: string;
  resultIndex: string;
  boardingPointId: number;
  droppingPointId: number;
  passengers: BdsdPassenger[];
  ip?: string;
}

/**
 * BookTicket and friends debit the agency wallet for real, so they need an
 * explicit second opt-in beyond BUS_LIVE. Never relax this to reuse BUS_LIVE.
 */
function assertBookingEnabled(op: string) {
  if (process.env.BUS_LIVE !== "1" || process.env.BUS_BOOKING_LIVE !== "1") {
    throw new BdsdError(403, `${op} blocked: set BUS_LIVE=1 and BUS_BOOKING_LIVE=1 to spend real wallet funds`);
  }
}

function blockOrBookBody(req: BlockOrBookRequest) {
  return {
    UserIp: userIp(req.ip),
    SearchTokenId: req.searchTokenId,
    ResultIndex: req.resultIndex,
    BoardingPointId: req.boardingPointId,
    DroppingPointId: req.droppingPointId,
    Passenger: req.passengers,
  };
}

interface BlockSeatResponse extends BdsdEnvelope {
  Result?: { IsPriceChanged?: boolean; DepartureTime?: string; ArrivalTime?: string; BusType?: string; TravelName?: string; [k: string]: unknown };
}

/** Hold the selected seats and re-confirm the price before booking. */
export async function blockSeat(req: BlockOrBookRequest) {
  assertBookingEnabled("blockSeat");
  const data = await bdsdPost<BlockSeatResponse>("/busservice/rest/blockseat", blockOrBookBody(req));
  return data.Result ?? null;
}

export interface BdsdBookResult {
  BookingStatus: string;
  BookingID: number;
  TicketNo: string;
  TravelOperatorPNR: string;
  InvoiceAmount: number;
  InvoiceNumber: string;
}

interface BookResponse extends BdsdEnvelope {
  Result?: BdsdBookResult;
}

/** Confirm the booking. This spends money — see assertBookingEnabled. */
export async function bookTicket(req: BlockOrBookRequest): Promise<BdsdBookResult | null> {
  assertBookingEnabled("bookTicket");
  const data = await bdsdPost<BookResponse>("/busservice/rest/book", blockOrBookBody(req));
  return data.Result ?? null;
}

interface CancelResponse extends BdsdEnvelope {
  SendChangeRequestResult?: {
    ResponseStatus: number;
    Error?: { ErrorCode: number; ErrorMessage: string };
    TraceId?: string;
    BusCRInfo?: unknown[];
  };
}

/**
 * Raise a cancellation change-request. Note this endpoint answers with a
 * `SendChangeRequestResult` wrapper instead of the usual `Result`/`Error`
 * envelope, so its errors are checked separately.
 */
export async function cancelTicket(
  searchTokenId: string,
  bookingId: number,
  seatId: string,
  remarks = "Cancel Bus Ticket",
  ip?: string
) {
  assertBookingEnabled("cancelTicket");
  const data = await bdsdPost<CancelResponse>("/busservice/rest/cancelrequest", {
    UserIp: userIp(ip),
    SearchTokenId: searchTokenId,
    BookingId: bookingId,
    SeatId: seatId,
    Remarks: remarks,
  });
  const result = data.SendChangeRequestResult;
  const err = result?.Error;
  if (err && err.ErrorCode !== 0) throw new BdsdError(err.ErrorCode, err.ErrorMessage);
  return result ?? null;
}
