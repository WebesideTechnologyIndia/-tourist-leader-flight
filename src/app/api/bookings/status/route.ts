import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Public booking / PNR status lookup.
 *
 * GET /api/bookings/status?ref=<PNR or booking ref>&q=<email or last name>
 *
 * To avoid exposing bookings to anyone who guesses a reference, the caller must
 * also supply a matching detail — the contact email OR any passenger's name.
 * Returns only a sanitized status summary (no full PII / payment ids).
 */

interface Pax { fullName?: string }

function verifyMatch(booking: { contactEmail: string; passengers: unknown }, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return false;
  if (booking.contactEmail && booking.contactEmail.toLowerCase() === needle) return true;
  const pax = Array.isArray(booking.passengers) ? (booking.passengers as Pax[]) : [];
  return pax.some((p) => typeof p?.fullName === "string" && p.fullName.toLowerCase().includes(needle));
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const ref = (sp.get("ref") || "").trim().toUpperCase();
  const q = (sp.get("q") || "").trim();

  if (!ref || !q) {
    return NextResponse.json({ error: "Enter your PNR / booking reference and your email or last name." }, { status: 400 });
  }

  const booking = await prisma.booking.findFirst({
    where: { OR: [{ bookingRef: ref }, { pnr: ref }] },
    orderBy: { createdAt: "desc" },
  });

  // Same response for "not found" and "details don't match" — no enumeration signal.
  if (!booking || !verifyMatch(booking, q)) {
    return NextResponse.json({ found: false });
  }

  const pax = Array.isArray(booking.passengers) ? (booking.passengers as Pax[]) : [];
  return NextResponse.json({
    found: true,
    bookingRef: booking.bookingRef,
    pnr: booking.pnr || null,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    bookingType: booking.bookingType,
    tripType: booking.tripType,
    origin: booking.origin,
    destination: booking.destination,
    departDate: booking.departDate,
    returnDate: booking.returnDate,
    cabinClass: booking.cabinClass,
    adults: booking.adults,
    children: booking.children,
    infants: booking.infants,
    leadPassenger: pax[0]?.fullName || null,
    totalAmount: booking.totalAmount,
    currency: booking.currency,
    bookedOn: booking.createdAt,
  });
}
