/**
 * Amadeus certification — SOAP envelope capture & export.
 *
 * Wire `makeAmadeusCollector()` into the booking flow (it registers itself as the
 * active `setAmadeusCapture()` sink) before running `runBookingFlow()`. Every SOAP
 * request/response envelope is collected, then `buildAmadeusBundle()` writes them
 * as the numbered submission files:
 *
 *   1.Air_SellFromRecommendation.RQ.xml
 *   1.Air_SellFromRecommendation.RS.xml
 *   2.PNR_AddMultiElements.RQ.xml
 *   … 10.Security_SignOut.RS.xml
 *
 * Each file is the raw SOAP envelope exactly as it went on / came off the wire,
 * preceded by an XML comment carrying the step metadata (operation, SOAPAction,
 * endpoint, session status). The client asked for the logs as XML rather than a
 * PDF, so the files must parse as XML — not the older "===== REQUEST =====" text
 * format that merely had an .xml extension.
 */
import type { AmadeusExchange } from "./amadeus-booking";
import { setAmadeusCapture } from "./amadeus-booking";

export interface AmadeusCollector {
  exchanges: AmadeusExchange[];
  sink: (x: AmadeusExchange) => void;
  /** Stop collecting (unregisters the global sink). */
  stop: () => void;
}

/** Create a collector and register it as the active Amadeus capture sink. */
export function makeAmadeusCollector(): AmadeusCollector {
  const exchanges: AmadeusExchange[] = [];
  const sink = (x: AmadeusExchange) => exchanges.push(x);
  setAmadeusCapture(sink);
  return { exchanges, sink, stop: () => setAmadeusCapture(null) };
}

/** Filename-safe operation label (e.g. "PNR_AddMultiElements(commit)" -> "PNR_AddMultiElements_commit"). */
export function opLabel(name: string): string {
  return name
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/** "--" terminates an XML comment, so it can never appear inside one. */
function commentSafe(v: string): string {
  return v.replace(/--+/g, (m) => m.split("").join(" "));
}

export interface EnvelopeMeta {
  case?: string;
  step: number;
  stepCount?: number;
  operation: string;
  action: string;
  endpoint?: string;
  direction: "request" | "response";
  sessionStatus?: "Start" | "InSeries" | "End";
  timestamp?: string;
  /** Free-form lines appended to the comment (preview, expected response, notes). */
  notes?: Record<string, string>;
}

/** XML comment header carrying everything the PDF used to show above the payload. */
export function envelopeHeader(meta: EnvelopeMeta): string {
  const rows: [string, string | undefined][] = [
    ["Case", meta.case],
    ["Step", meta.stepCount ? `${meta.step} of ${meta.stepCount}` : String(meta.step)],
    ["Operation", meta.operation],
    ["Direction", meta.direction === "request" ? "REQUEST (RQ)" : "RESPONSE (RS)"],
    ["SOAPAction", meta.action],
    ["Endpoint", meta.endpoint ? `POST ${meta.endpoint}` : undefined],
    ["Content-Type", meta.direction === "request" ? "text/xml; charset=utf-8" : undefined],
    ["Session", meta.sessionStatus],
    ["Timestamp", meta.timestamp],
    ...Object.entries(meta.notes || {}).map(([k, v]) => [k, v] as [string, string]),
  ];
  const width = Math.max(...rows.filter(([, v]) => v).map(([k]) => k.length));
  const body = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k.padEnd(width)} : ${commentSafe(String(v))}`)
    .join("\n");
  return `<!--\n  TouristLeader × Amadeus — IBE Prime booking certification\n${body}\n-->`;
}

/** Strip a leading XML declaration so the comment header can precede the envelope. */
function splitDeclaration(xml: string): { declaration: string; rest: string } {
  const m = xml.match(/^\s*<\?xml[^?]*\?>\s*/);
  return m ? { declaration: m[0].trim(), rest: xml.slice(m[0].length) } : { declaration: '<?xml version="1.0" encoding="UTF-8"?>', rest: xml.trimStart() };
}

/** One `.xml` submission file: declaration, comment header, then the raw envelope. */
export function renderEnvelopeFile(xml: string, meta: EnvelopeMeta): string {
  const { declaration, rest } = splitDeclaration(xml);
  return `${declaration}\n${envelopeHeader(meta)}\n${rest}\n`;
}

export interface CertFile {
  filename: string;
  content: string;
}

export interface AmadeusBundleOptions {
  /** Case id / title recorded in every file header. */
  case?: string;
  endpoint?: string;
  /** ISO timestamp per exchange. */
  timestamps?: string[];
}

/**
 * Build the numbered submission files for one captured booking run — a request and
 * a response file per SOAP message, each a standalone XML document.
 */
export function buildAmadeusBundle(exchanges: AmadeusExchange[], opts: AmadeusBundleOptions = {}): CertFile[] {
  const files: CertFile[] = [];
  exchanges.forEach((x, i) => {
    const step = i + 1;
    const label = opLabel(x.name);
    const base: Omit<EnvelopeMeta, "direction"> = {
      case: opts.case,
      step,
      stepCount: exchanges.length,
      operation: x.name,
      action: x.action,
      endpoint: opts.endpoint,
      timestamp: opts.timestamps?.[i],
    };
    files.push({
      filename: `${step}.${label}.RQ.xml`,
      content: renderEnvelopeFile(x.request, { ...base, direction: "request" }),
    });
    files.push({
      filename: `${step}.${label}.RS.xml`,
      content: renderEnvelopeFile(x.response, { ...base, direction: "response" }),
    });
  });
  return files;
}
