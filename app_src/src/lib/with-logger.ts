/**
 * Tourist Leader — Route Handler Logger HOC
 *
 * Wraps a Next.js App Router route handler to log the FULL incoming request
 * (method, URL, query params, request body) + response (status, body, duration).
 *
 * Usage in any route.ts:
 *
 *   import { withLogger } from "@/lib/with-logger";
 *
 *   export const GET = withLogger(async (req) => {
 *     // ... your handler ...
 *     return NextResponse.json({ ok: true });
 *   });
 *
 *   export const POST = withLogger(async (req) => {
 *     const body = await req.json();
 *     // ...
 *     return NextResponse.json({ result });
 *   });
 *
 * The HOC clones the request before reading the body so the handler still
 * receives a readable request. Response body is read from a cloned response.
 */

import { NextRequest, NextResponse } from "next/server";
import { logIncomingRequest } from "./logger";
import { getSessionUser } from "./auth";

type RouteHandler<T = any> = (req: NextRequest, ctx?: T) => Promise<NextResponse | Response> | NextResponse | Response;

export function withLogger<T = any>(handler: RouteHandler<T>): (req: NextRequest, ctx?: T) => Promise<NextResponse | Response> {
  return async function loggedHandler(req: NextRequest, ctx?: T) {
    const start = Date.now();
    const method = req.method;
    const url = req.nextUrl.pathname + (req.nextUrl.search || "");

    // Collect search params
    const searchParams: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((v, k) => { searchParams[k] = v; });

    // Try to read request body (clone first so the handler can also read it)
    let requestBody: unknown;
    const contentType = req.headers.get("content-type") || "";
    if (["POST", "PUT", "PATCH"].includes(method)) {
      try {
        if (contentType.includes("application/json")) {
          const clonedReq = req.clone();
          requestBody = await clonedReq.json().catch(() => undefined);
        } else if (contentType.includes("text/")) {
          const clonedReq = req.clone();
          requestBody = await clonedReq.text().catch(() => undefined);
        }
      } catch {
        // Body read failed — ignore, handler will deal with it
      }
    }

    // Try to get the logged-in user for the log entry
    let userId: string | undefined;
    try {
      const user = await getSessionUser();
      if (user) userId = user.id;
    } catch {
      // Auth check not critical for logging
    }

    let status = 500;
    let responseBody: unknown;
    let errorMsg: string | undefined;

    try {
      const res = await handler(req, ctx);
      status = res.status;

      // Clone the response to read the body without consuming it
      const cloned = res.clone();
      const resContentType = res.headers.get("content-type") || "";
      try {
        if (resContentType.includes("application/json")) {
          responseBody = await cloned.json().catch(() => undefined);
        } else if (resContentType.includes("text/")) {
          responseBody = await cloned.text().catch(() => undefined);
        }
      } catch {
        // Response read failed — not critical
      }

      logIncomingRequest({
        method,
        url,
        searchParams,
        requestBody,
        status,
        durationMs: Date.now() - start,
        responseBody,
        userId,
      });

      return res;
    } catch (err) {
      errorMsg = (err as Error).message;
      logIncomingRequest({
        method,
        url,
        searchParams,
        requestBody,
        status: 500,
        durationMs: Date.now() - start,
        error: errorMsg,
        userId,
      });
      throw err;
    }
  };
}
