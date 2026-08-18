import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { walletTxn } from "@/lib/billing";
import { refundPayment } from "@/lib/razorpay";
import { sendCancellationEmail, bookingCancellationEmailHtml } from "@/lib/mailer";
import { cancelWithSupplier, SupplierBookingError } from "@/lib/flight-booking";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const { bookingRef } = await req.json();
  if (!bookingRef) return NextResponse.json({ error: "Missing booking" }, { status: 400 });

  const booking = await prisma.booking.findFirst({ where: { bookingRef, userId: user.id } });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.status === "CANCELLED") return NextResponse.json({ error: "Already cancelled" }, { status: 400 });

  // Release the seat with the airline FIRST. Refunding while the supplier still
  // holds a ticketed seat would leave a live ticket nobody has paid for, so a
  // failure here stops the cancellation instead of quietly refunding.
  if (booking.bookingType === "FLIGHT" && booking.pnr) {
    try {
      await cancelWithSupplier({
        supplier: booking.source,
        pnr: booking.pnr,
        ticketNumbers: Array.isArray(booking.ticketNumbers) ? (booking.ticketNumbers as string[]) : undefined,
      });
    } catch (e) {
      const err = e as SupplierBookingError;
      console.error("[cancel] supplier cancellation failed:", booking.source, err.message);
      return NextResponse.json(
        {
          error:
            "We could not cancel this ticket with the airline automatically. Our team has been notified and will complete your cancellation — your booking is unchanged for now.",
          supplier: booking.source,
        },
        { status: 202 },
      );
    }
  }

  const amount = Math.round(booking.totalAmount || 0);
  let refundMode: "wallet" | "razorpay" | "none" = "none";
  let refundAmount = 0;
  let message = "";

  if (booking.paymentSource === "wallet") {
    // money was paid from wallet → credit it straight back
    await walletTxn({ userId: user.id, type: "CREDIT", amount, reason: "REFUND", refType: "BOOKING", refId: bookingRef, note: `Refund · ${bookingRef} (cancelled)` });
    refundMode = "wallet"; refundAmount = amount;
    message = `₹${amount} refunded to your Tourist Leader wallet.`;
  } else if (booking.paymentId) {
    // paid via card / UPI / netbanking → refund to the original bank account
    const r = await refundPayment(booking.paymentId, amount);
    if (r.ok) { refundMode = "razorpay"; refundAmount = amount; message = `₹${amount} is being refunded to your original payment method (3–5 working days).`; }
    else { message = "Booking cancelled. Refund to your bank could not be initiated automatically — our team will process it manually."; }
  } else {
    message = "Booking cancelled.";
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", cancelledAt: new Date(), refundAmount, refundMode: refundMode === "none" ? null : refundMode },
  });

  // Send the cancellation email with full details + refund info (awaited so it
  // actually goes out before this serverless function suspends).
  const to = booking.contactEmail || user.email;
  if (to) {
    const travellers = (booking.adults || 0) + (booking.children || 0) + (booking.infants || 0);
    const fmtDate = (d: Date) => new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
    const cancelledAt = new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const html = bookingCancellationEmailHtml({
      name: user.name || to.split("@")[0],
      bookingRef,
      bookingType: booking.bookingType,
      origin: booking.origin,
      destination: booking.destination,
      travelDate: fmtDate(booking.departDate),
      travellers: travellers || 1,
      totalPaid: amount,
      refundAmount,
      refundMode,
      refundMessage: message,
      cancelledAt,
    });
    await sendCancellationEmail({ to, bookingRef, html }).catch((e) => console.error("[cancel] email failed:", (e as Error).message));
  }

  return NextResponse.json({ ok: true, refundMode, refundAmount, message });
}
