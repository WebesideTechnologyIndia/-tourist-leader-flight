import { NextResponse } from "next/server";
import { getBillingConfig } from "@/lib/billing";

export const dynamic = "force-dynamic";

/** Public, read-only billing config so booking pages can show the service charge + GST. */
export async function GET() {
  const cfg = await getBillingConfig();
  return NextResponse.json({ config: cfg });
}
