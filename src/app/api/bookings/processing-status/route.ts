import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Lightweight status poll for the confirmation page right after checkout.
 * Only returns booking status + a non-PII processing note — no payment ids,
 * passenger data, or contact details.
 */
export async function GET(req: NextRequest) {
  const ref = (req.nextUrl.searchParams.get("ref") || "").trim().toUpperCase();
  if (!ref) return NextResponse.json({ found: false });

  const booking = await prisma.booking.findFirst({
    where: { bookingRef: ref },
    select: { bookingRef: true, pnr: true, status: true, supplierError: true },
  });
  if (!booking) return NextResponse.json({ found: false });

  return NextResponse.json({
    found: true,
    bookingRef: booking.bookingRef,
    pnr: booking.pnr || null,
    status: booking.status,
    note: booking.supplierError || null,
  });
}
