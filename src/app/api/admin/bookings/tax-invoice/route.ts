import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { attachBillTo } from "@/lib/invoice-billing";
import { buildAgentTaxInvoiceHtml, type BookingLike } from "@/lib/invoice";
import { companyIdentity, taxInvoiceNo } from "@/lib/company";

export const dynamic = "force-dynamic";

/**
 * The platform's GST tax invoice to an agent for one booking, rendered
 * server-side.
 *
 * Server-side on purpose: the company GSTIN/PAN/CIN come from the environment
 * and must not be shipped to a browser bundle, and the amounts on a statutory
 * document should not be assembled from client state.
 */
export async function GET(req: NextRequest) {
  const { ok, permissions, tier, user } = await isAdmin();
  if (!ok || !permissions.includes("bookings.view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ref = (req.nextUrl.searchParams.get("ref") || "").trim();
  if (!ref) return NextResponse.json({ error: "Missing booking ref" }, { status: 400 });

  const booking = await prisma.booking.findFirst({ where: { bookingRef: ref } });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // An agent may only print the invoice for their own bookings.
  if (tier !== "admin" && booking.bookedByAgentId !== user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!booking.bookedByAgentId) {
    return NextResponse.json({ error: "This booking was not made by an agent, so there is no agent invoice." }, { status: 400 });
  }

  const [withBillTo] = await attachBillTo([booking as unknown as Parameters<typeof attachBillTo>[0][0]]);
  const html = buildAgentTaxInvoiceHtml(
    withBillTo as unknown as BookingLike,
    req.nextUrl.origin,
    companyIdentity(),
    taxInvoiceNo(booking.bookingRef)
  );

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
