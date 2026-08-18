import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { amadeusBookingConfigured } from "@/lib/amadeus-booking";
import { buildCertCases, runCertCase } from "@/lib/amadeus-cert-cases";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Amadeus certification runner (SOAP Prime booking flow).
 *
 * POST /api/amadeus/cert-run   body: { caseId: "TC1"|"TC2"|"TC3"|"TC4", write?: boolean }
 *   Runs ONE test case end-to-end inside a stateful session (Sell → PNR → Price →
 *   TST → Issue → [SSR/EMD/Cancel]) and returns the captured numbered SOAP
 *   envelopes. With `write:true`, also writes them to ./amadeus-cert-output/<id>/.
 *
 * GET /api/amadeus/cert-run    — lists the available cases (read-only).
 *
 * GUARDED: this opens a live GDS session (and, once inventory is bookable, creates
 *   real PNRs / e-tickets), so it requires AMADEUS_LIVE=1 and header
 *   `x-cert-run-key: <CERT_RUN_KEY>`.
 */

function authorized(req: NextRequest): string | null {
  if (process.env.AMADEUS_LIVE !== "1") return "Amadeus live mode is off (set AMADEUS_LIVE=1).";
  const key = process.env.CERT_RUN_KEY;
  if (!key) return "CERT_RUN_KEY is not configured on the server.";
  if (req.headers.get("x-cert-run-key") !== key) return "Invalid or missing x-cert-run-key.";
  if (!amadeusBookingConfigured()) return "Amadeus credentials are not fully configured.";
  return null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  const cases = buildCertCases(todayIso());
  return NextResponse.json({
    cases: cases.map((c) => ({
      id: c.id,
      title: c.title,
      passengers: c.input.passengers.length,
      segments: c.input.segments.length,
      ancillaries: c.ancillaries?.length ?? 0,
      emd: !!c.emd,
      cancel: !!c.cancel,
    })),
    usage: "POST { caseId, write? } with header x-cert-run-key; requires AMADEUS_LIVE=1",
  });
}

export async function POST(req: NextRequest) {
  const denied = authorized(req);
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });

  let body: { caseId?: string; write?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON: { caseId, write? }" }, { status: 400 });
  }

  const cases = buildCertCases(todayIso());
  const testCase = cases.find((c) => c.id === body.caseId);
  if (!testCase) {
    return NextResponse.json({ error: `Unknown caseId. Valid: ${cases.map((c) => c.id).join(", ")}` }, { status: 400 });
  }

  try {
    const { result, files } = await runCertCase(testCase);

    let writtenTo: string | undefined;
    if (body.write) {
      const dir = join(process.cwd(), "amadeus-cert-output", testCase.id);
      await mkdir(dir, { recursive: true });
      await Promise.all(files.map((f) => writeFile(join(dir, f.filename), f.content, "utf8")));
      writtenTo = dir;
    }

    return NextResponse.json({
      caseId: testCase.id,
      title: testCase.title,
      pnr: result.pnr,
      ticketNumbers: result.ticketNumbers,
      sold: result.sold,
      ticketed: result.ticketed,
      emdIssued: result.emdIssued,
      cancelled: result.cancelled,
      usedIbpFallback: result.usedIbpFallback,
      finalClasses: result.finalClasses,
      errors: result.errors,
      fileCount: files.length,
      files: files.map((f) => f.filename),
      writtenTo,
    });
  } catch (err) {
    return NextResponse.json({ error: `Cert run failed: ${(err as Error).message}` }, { status: 500 });
  }
}
