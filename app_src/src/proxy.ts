/**
 * Tourist Leader — Next.js Proxy (Incoming Request Logger)
 *
 * Intercepts every /api/** request and logs:
 *   - method, URL, query params
 *   - response status
 *   - duration in ms
 *
 * NOTE: Proxy runs in the Edge runtime and cannot read/write response
 * bodies (that requires the Node runtime inside route handlers). For full
 * request + response body logging, use the withLogger() HOC in your route
 * handlers in addition to this.
 */
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: "/api/:path*",
};

export default function proxy(req: NextRequest) {
  const start = Date.now();
  const url = req.nextUrl.pathname + (req.nextUrl.search || "");
  const method = req.method;

  // Collect query params for the log
  const searchParams: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => {
    searchParams[k] = v;
  });

  // Continue to the route handler
  const res = NextResponse.next();

  const durationMs = Date.now() - start;
  const status = res.status;

  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    level: status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO",
    ctx: "PROXY",
    event: "incoming_http",
    method,
    url,
    ...(Object.keys(searchParams).length ? { searchParams } : {}),
    status,
    durationMs,
  });

  if (status >= 500) {
    console.error(entry);
  } else if (status >= 400) {
    console.warn(entry);
  } else {
    console.log(entry);
  }

  return res;
}
