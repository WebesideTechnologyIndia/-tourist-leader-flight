/**
 * Tourist Leader — Structured JSON Logger
 *
 * Outputs one JSON line per log entry — readable in:
 *   - Vercel Functions dashboard (automatically structured)
 *   - Hostinger / PM2 logs
 *   - Any log aggregator (Datadog, Logtail, BetterStack, etc.)
 *
 * SENSITIVE FIELD MASKING:
 *   Any key matching the SENSITIVE_KEYS list is replaced with "***" before
 *   logging, so credentials never appear in log files.
 *
 * COMPLETE RESPONSES: Full response bodies are always logged — no truncation.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVEL_RANK: Record<LogLevel, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

/** Keys (case-insensitive) whose values will be replaced with "***" in logs. */
const SENSITIVE_KEYS = new Set([
  "password", "wspassword", "passwd", "secret",
  "apikey", "api_key", "key",
  "token", "securitytoken", "accesstoken", "refreshtoken",
  "cardnumber", "cvv", "cvc", "expiry",
  "authorization", "auth",
  "smtp_pass", "smtppass",
  "blob_read_write_token",
  "razorpay_key_secret",
  "database_url",
  "auth_secret",
  "cert_run_key",
  "nonce", "digest",
  "nonceb64",
  "passwordhash",
]);

/**
 * Recursively walk an object and replace sensitive key values with "***".
 * Returns a new deep-cloned object — the original is never mutated.
 */
function maskSensitive(value: unknown, depth = 0): unknown {
  if (depth > 8 || value === null || value === undefined) return value;
  if (typeof value === "string") return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => maskSensitive(v, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      result[k] = "***";
    } else {
      result[k] = maskSensitive(v, depth + 1);
    }
  }
  return result;
}

/**
 * Mask sensitive patterns inside raw strings (SOAP XML, query strings).
 */
function maskString(raw: string): string {
  return raw
    .replace(/(<(?:\w+:)?Password[^>]*>)[^<]*/gi, "$1***")
    .replace(/(<(?:\w+:)?Nonce[^>]*>)[^<]*/gi, "$1***")
    .replace(/(<(?:\w+:)?SecurityToken[^>]*>)[^<]*/gi, "$1***")
    .replace(/(Bearer\s+)[^\s"]+/gi, "$1***")
    .replace(/(Basic\s+)[^\s"]+/gi, "$1***")
    .replace(/\b(\d{4})\d{5,11}(\d{4})\b/g, "$1*****$2");
}

// ---------------------------------------------------------------------------
// Core emit
// ---------------------------------------------------------------------------

const configuredLevel: LogLevel =
  (process.env.LOG_LEVEL?.toUpperCase() as LogLevel) || "INFO";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[configuredLevel];
}

export interface LogEntry {
  ts: string;
  level: LogLevel;
  ctx?: string;
  event?: string;
  msg?: string;
  [key: string]: unknown;
}

function emit(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;
  const line = JSON.stringify(entry);
  if (entry.level === "ERROR") {
    console.error(line);
  } else if (entry.level === "WARN") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

// ---------------------------------------------------------------------------
// Public logger interface
// ---------------------------------------------------------------------------

export interface Logger {
  debug(msg: string, extra?: Record<string, unknown>): void;
  info(msg: string, extra?: Record<string, unknown>): void;
  warn(msg: string, extra?: Record<string, unknown>): void;
  error(msg: string, extra?: Record<string, unknown>): void;
  child(ctx: string): Logger;
}

function makeLogger(ctx?: string): Logger {
  function log(level: LogLevel, msg: string, extra: Record<string, unknown> = {}) {
    const masked = maskSensitive(extra) as Record<string, unknown>;
    emit({ ts: new Date().toISOString(), level, ...(ctx ? { ctx } : {}), msg, ...masked });
  }

  return {
    debug: (msg, extra) => log("DEBUG", msg, extra),
    info:  (msg, extra) => log("INFO",  msg, extra),
    warn:  (msg, extra) => log("WARN",  msg, extra),
    error: (msg, extra) => log("ERROR", msg, extra),
    child: (childCtx) => makeLogger(ctx ? `${ctx}:${childCtx}` : childCtx),
  };
}

/** Root application logger. Use .child("MODULE") for context prefixing. */
export const logger = makeLogger();

// ---------------------------------------------------------------------------
// HTTP log helpers
// ---------------------------------------------------------------------------

export interface OutgoingRequestLog {
  ctx: string;
  method: string;
  url: string;
  payload?: unknown;
  status: number;
  durationMs: number;
  responseBody?: unknown;
  error?: string;
}

/**
 * Log one completed outgoing HTTP call.
 * Full request + response always logged. Sensitive fields masked.
 */
export function logOutgoingRequest(entry: OutgoingRequestLog): void {
  const level: LogLevel = entry.status >= 500 ? "ERROR"
    : entry.status >= 400 ? "WARN"
    : entry.error ? "WARN"
    : "INFO";

  const payloadMasked = typeof entry.payload === "string"
    ? maskString(entry.payload)
    : maskSensitive(entry.payload);

  const responseMasked = typeof entry.responseBody === "string"
    ? maskString(entry.responseBody)
    : maskSensitive(entry.responseBody);

  emit({
    ts: new Date().toISOString(),
    level,
    ctx: entry.ctx,
    event: "outgoing_http",
    method: entry.method,
    url: entry.url,
    payload: payloadMasked,
    status: entry.status,
    durationMs: entry.durationMs,
    response: responseMasked,
    ...(entry.error ? { error: entry.error } : {}),
  });
}

export interface IncomingRequestLog {
  method: string;
  url: string;
  searchParams?: Record<string, string>;
  requestBody?: unknown;
  status: number;
  durationMs: number;
  responseBody?: unknown;
  userId?: string;
  error?: string;
}

/** Log one incoming API route request + response. */
export function logIncomingRequest(entry: IncomingRequestLog): void {
  const level: LogLevel = entry.status >= 500 ? "ERROR"
    : entry.status >= 400 ? "WARN"
    : entry.error ? "WARN"
    : "INFO";

  emit({
    ts: new Date().toISOString(),
    level,
    ctx: "API",
    event: "incoming_http",
    method: entry.method,
    url: entry.url,
    ...(entry.searchParams && Object.keys(entry.searchParams).length
      ? { searchParams: entry.searchParams }
      : {}),
    ...(entry.requestBody !== undefined
      ? { requestBody: maskSensitive(entry.requestBody) }
      : {}),
    status: entry.status,
    durationMs: entry.durationMs,
    ...(entry.responseBody !== undefined
      ? { responseBody: maskSensitive(entry.responseBody) }
      : {}),
    ...(entry.userId ? { userId: entry.userId } : {}),
    ...(entry.error ? { error: entry.error } : {}),
  });
}

export { maskString, maskSensitive };
