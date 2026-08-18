import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getSignature } from "@/lib/benzy-booking";
import { CERT_CASES, generateCertBundle } from "@/lib/benzy-cert-cases";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Benzy certification runner.
 *
 * POST /api/benzy/cert-run   body: { caseId: number, write?: boolean }
 *   Runs ONE documented test case end-to-end (real Signature → search → book →
 *   ticket, paid from the agent Deposit wallet) and returns the captured
 *   numbered submission files. With `write:true`, also writes them to
 *   ./benzy-cert-output/<id>.<name>/.
 *
 * GET /api/benzy/cert-run    — lists the available cases (read-only).
 *
 * GUARDED: this creates REAL bookings and spends deposit balance, so it requires
 *   BENZY_LIVE=1 and header `x-cert-run-key: <CERT_RUN_KEY>`.
 */

function authorized(req: NextRequest): string | null {
  if (process.env.BENZY_LIVE !== "1") return "Benzy live mode is off (set BENZY_LIVE=1).";
  const key = process.env.CERT_RUN_KEY;
  if (!key) return "CERT_RUN_KEY is not configured on the server.";
  if (req.headers.get("x-cert-run-key") !== key) return "Invalid or missing x-cert-run-key.";
  return null;
}

export async function GET() {
  return NextResponse.json({
    cases: CERT_CASES.map((c) => ({ id: c.id, name: c.name, tripType: c.tripType, routing: c.routing, baggage: c.baggage })),
    usage: "POST { caseId, write? } with header x-cert-run-key; requires BENZY_LIVE=1",
  });
}

export async function POST(req: NextRequest) {
  const denied = authorized(req);
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });

  let body: { caseId?: number; write?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON: { caseId, write? }" }, { status: 400 });
  }

  const testCase = CERT_CASES.find((c) => c.id === body.caseId);
  if (!testCase) {
    return NextResponse.json({ error: `Unknown caseId. Valid: ${CERT_CASES.map((c) => c.id).join(", ")}` }, { status: 400 });
  }

  // Pre-flight: fail with a clear 502 before any booking side-effects.
  const auth = await getSignature();
  if (!auth) return NextResponse.json({ error: "Benzy Signature failed (check credentials / IP whitelist)." }, { status: 502 });

  try {
    const bundle = await generateCertBundle(testCase, new Date());

    let writtenTo: string | undefined;
    if (body.write) {
      const dir = join(process.cwd(), "benzy-cert-output", `${testCase.id}.${testCase.name}`);
      await mkdir(dir, { recursive: true });
      await Promise.all(bundle.files.map((f) => writeFile(join(dir, f.filename), f.content, "utf8")));
      writtenTo = dir;
    }

    return NextResponse.json({
      caseId: testCase.id,
      name: testCase.name,
      transactionId: bundle.result.transactionId,
      pnrs: bundle.result.pnrs,
      isTicketed: bundle.result.isTicketed,
      netAmount: bundle.result.netAmount,
      ssrAmount: bundle.result.ssrAmount,
      fileCount: bundle.files.length,
      files: bundle.files.map((f) => f.filename),
      writtenTo,
    });
  } catch (err) {
    return NextResponse.json({ error: `Cert run failed: ${(err as Error).message}` }, { status: 500 });
  }
}
