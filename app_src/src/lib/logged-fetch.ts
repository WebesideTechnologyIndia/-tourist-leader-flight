/**
 * Tourist Leader — Logged HTTP Fetch Wrapper
 *
 * Drop-in replacement for native fetch() that automatically logs:
 *   - URL, method, request body (payload)
 *   - HTTP status code
 *   - Full response body (never truncated)
 *   - Duration in ms
 *
 * Sensitive fields in payloads are masked by the logger automatically.
 *
 * Usage:
 *   import { loggedJsonPost, loggedJsonPostWithHeaders, loggedSoapPost } from "@/lib/logged-fetch";
 */

import { logOutgoingRequest } from "./logger";

const DEFAULT_TIMEOUT_MS = 30000;

// ---------------------------------------------------------------------------
// Core internal helper — does the fetch, reads body once, logs, returns text
// ---------------------------------------------------------------------------

interface FetchAndLogOpts {
  ctx: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  payloadForLog: unknown;
  signal?: AbortSignal;
}

async function fetchAndLog(opts: FetchAndLogOpts): Promise<{ status: number; text: string; ok: boolean }> {
  const { ctx, method, url, headers, body, payloadForLog, signal } = opts;
  const start = Date.now();

  let status = 0;
  let text = "";
  let responseJson: unknown;
  let errorMsg: string | undefined;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal,
      cache: "no-store",
    });

    status = res.status;
    text = await res.text();

    // Try to parse as JSON for structured log output
    try {
      responseJson = text ? JSON.parse(text) : undefined;
    } catch {
      responseJson = undefined;
    }

    logOutgoingRequest({
      ctx,
      method,
      url,
      payload: payloadForLog,
      status,
      durationMs: Date.now() - start,
      responseBody: responseJson !== undefined ? responseJson : text,
    });

    return { status, text, ok: res.ok };
  } catch (err) {
    errorMsg = (err as Error).message;
    logOutgoingRequest({
      ctx,
      method,
      url,
      payload: payloadForLog,
      status: status || 0,
      durationMs: Date.now() - start,
      error: errorMsg,
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * POST JSON to a REST endpoint with optional Bearer auth.
 * Returns the parsed JSON response. Throws on network or HTTP error.
 */
export async function loggedJsonPost<T>(
  ctx: string,
  url: string,
  body: unknown,
  bearerToken?: string,
  extraHeaders?: Record<string, string>,
  signal?: AbortSignal,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    ...extraHeaders,
  };

  const { status, text, ok } = await fetchAndLog({
    ctx,
    method: "POST",
    url,
    headers,
    body: JSON.stringify(body),
    payloadForLog: body,
    signal,
  });

  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!ok) throw new Error(`${ctx} ${url} -> ${status}`);
  return json as T;
}

/**
 * POST JSON with plain request headers (BDSD-style: UserName / Password headers).
 */
export async function loggedJsonPostWithHeaders<T>(
  ctx: string,
  url: string,
  body: unknown,
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<T> {
  const { status, text, ok } = await fetchAndLog({
    ctx,
    method: "POST",
    url,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
    body: JSON.stringify(body),
    payloadForLog: body,
    signal,
  });

  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!ok) throw new Error(`${ctx} ${url} -> ${status}`);
  return json as T;
}

/**
 * POST a SOAP/XML envelope. Returns the raw XML response string.
 * Throws on network or HTTP error.
 */
export async function loggedSoapPost(
  ctx: string,
  endpoint: string,
  envelope: string,
  soapAction: string,
  signal?: AbortSignal,
): Promise<string> {
  const { status, text, ok } = await fetchAndLog({
    ctx,
    method: "POST",
    url: endpoint,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: soapAction,
    },
    body: envelope,
    payloadForLog: envelope,  // maskString() strips Password/Nonce/SecurityToken
    signal,
  });

  if (!ok) throw new Error(`${ctx} SOAP ${soapAction} -> ${status}`);
  return text;
}

export { DEFAULT_TIMEOUT_MS };
