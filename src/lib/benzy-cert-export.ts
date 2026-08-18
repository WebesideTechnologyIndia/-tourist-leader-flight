/**
 * Benzy certification — payload capture & export.
 *
 * Wire `makeCaptureCollector()` into `setBenzyCapture()` before running a booking
 * (search → runBookingFlow). Every request/response is collected, then
 * `buildCertBundle()` renders them into the numbered per-call files Benzy expects
 * for submission:  1.Signature.json, 2.ExpressSearch.json, … 15.RetrieveBooking.json
 *
 * Each file is a single valid JSON document describing ONE API call:
 *
 *   { step, operation, method, url, endpoint, timestamp, headers, request, response }
 *
 * (The client asked for one .json file per API instead of a combined PDF, so the
 * files must parse as JSON — not the older "Request Body: …" text format.)
 */
import type { BenzyExchange } from "./benzy-booking";
import { setBenzyCapture } from "./benzy-booking";

export interface CaptureCollector {
  exchanges: BenzyExchange[];
  /** Pass to setBenzyCapture(). */
  sink: (x: BenzyExchange) => void;
  /** Stop collecting (unregisters the global sink). */
  stop: () => void;
}

/** Create a collector and register it as the active Benzy capture sink. */
export function makeCaptureCollector(): CaptureCollector {
  const exchanges: BenzyExchange[] = [];
  const sink = (x: BenzyExchange) => exchanges.push(x);
  setBenzyCapture(sink);
  return { exchanges, sink, stop: () => setBenzyCapture(null) };
}

/** Derive the operation label used in the submission filename (e.g. "SmartPricer"). */
export function opLabel(x: BenzyExchange): string {
  if (/StartPay/i.test(x.name)) return /HP/i.test(x.name) ? "StartPay(BookingType-HP)" : "StartPay(BookingType-HB)";
  // Fall back to the last path segment of the endpoint (e.g. /Flights/SSR -> SSR).
  return x.endpoint.split("/").filter(Boolean).pop() || x.name;
}

/** A JWT is a live credential; show only enough to identify it. */
function truncateBearer(v: string): string {
  const m = v.match(/^Bearer\s+(.+)$/);
  if (!m) return v;
  const jwt = m[1];
  return jwt.length <= 24 ? v : `Bearer ${jwt.slice(0, 24)}…${jwt.slice(-3)}`;
}

function renderHeaders(headers: Record<string, string>, fullToken: boolean): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = !fullToken && k.toLowerCase() === "authorization" ? truncateBearer(v) : v;
  }
  return out;
}

/** One captured call, as written to `<n>.<Operation>.json`. */
export interface CertCallDocument {
  step: number;
  operation: string;
  method: "POST";
  url: string;
  endpoint: string;
  timestamp: string;
  headers: Record<string, string>;
  request: unknown;
  response: unknown;
  /** Provenance, set by the offline generator; absent on live captures. */
  _note?: string;
}

export interface CertFile {
  filename: string;
  content: string;
  /** Parsed form of `content` — handy for callers that return the bundle over HTTP. */
  doc: CertCallDocument;
}

export interface BundleOptions {
  /** ISO timestamp per exchange; overrides the capture time recorded on the exchange. */
  timestamps?: string[];
  /** Emit the complete Bearer JWT instead of a truncated one. Default false. */
  fullToken?: boolean;
  /** Provenance line added to every file (used by the offline generator). */
  note?: string;
}

/** Build one per-call JSON document from a captured exchange. */
export function buildCallDocument(x: BenzyExchange, step: number, opts: BundleOptions = {}): CertCallDocument {
  return {
    step,
    operation: opLabel(x),
    method: x.method,
    url: x.url,
    endpoint: x.endpoint,
    timestamp: opts.timestamps?.[step - 1] ?? x.at ?? "",
    headers: renderHeaders(x.headers, opts.fullToken ?? false),
    request: x.request,
    response: x.response,
    ...(opts.note ? { _note: opts.note } : {}),
  };
}

/**
 * Build the numbered submission files for one captured booking run — one file per
 * API call, each a standalone JSON document.
 */
export function buildCertBundle(exchanges: BenzyExchange[], opts: BundleOptions = {}): CertFile[] {
  return exchanges.map((x, i) => {
    const doc = buildCallDocument(x, i + 1, opts);
    return { filename: `${i + 1}.${doc.operation}.json`, content: `${JSON.stringify(doc, null, 2)}\n`, doc };
  });
}
