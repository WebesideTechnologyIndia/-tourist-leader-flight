import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genBookingRef, genPNR } from "@/lib/utils";
import { DEMO_SOURCE, refPrefix, toFlightSource } from "@/lib/flight-source";
import { issueTicket, SupplierBookingError, type IssuedTicket } from "@/lib/flight-booking";
import { sendBookingEmail, bookingEmailHtml, hotelBookingEmailHtml, busBookingEmailHtml } from "@/lib/mailer";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getBillingConfig, walletTxn } from "@/lib/billing";
import { computeCommission } from "@/lib/billing-core";
import { attachBillTo } from "@/lib/invoice-billing";
import { fareBreakdown, paxTypes } from "@/lib/fare-rules";
import { MEALS } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * Which API/data source produced this booking, for display in the admin panel.
 * The search response tags every itinerary with the supplier it was routed to
 * (`source`) and whether it came from a real API call (`live`); only a live one
 * is recorded against the supplier, so demo fares stay marked DEMO.
 * Hotels use Benzy, bus uses BDSD.
 */
function flightSource(flight: { source?: unknown; live?: unknown } | null | undefined): string {
  const supplier = toFlightSource(flight?.source);
  if (supplier && flight?.live === true) return supplier;
  return DEMO_SOURCE;
}

/**
 * Supplier the itinerary was routed to, used for the TLAK / TLAM booking
 * reference. Unlike `flightSource()` this does not require a live response —
 * the reference should still say which desk the booking belongs to.
 */
function flightRefPrefix(flight: { source?: unknown } | null | undefined): string {
  return refPrefix(flight?.source);
}
const hotelSource = () => (process.env.BENZY_LIVE === "1" ? "BENZY" : "DEMO");
const busSource = () => (process.env.BUS_LIVE === "1" ? "BDSD" : "DEMO");

/**
 * If the booker is an agent, attribute the booking and credit their earnings to
 * their wallet as PENDING (settled by an admin): platform commission (+GST) plus
 * any service charge (markup) the agent added at checkout. Commission is computed
 * on the fare total excluding the agent's own markup.
 */
async function attributeAgentCommission(bookingRef: string, bookingTotal: number, agentMarkup = 0) {
  try {
    const { tier, user } = await isAdmin();
    if (tier !== "agent" || !user) return;
    const cfg = await getBillingConfig();
    const dbu = await prisma.user.findUnique({ where: { id: user.id }, select: { state: true } });
    const { commission, gst, credit } = computeCommission(Math.max(0, bookingTotal - agentMarkup), dbu?.state, cfg);
    await prisma.booking.updateMany({ where: { bookingRef }, data: { bookedByAgentId: user.id, commission, commissionGst: gst.total } });
    if (credit > 0) {
      await walletTxn({ userId: user.id, type: "CREDIT", amount: credit, reason: "COMMISSION", status: "PENDING", refType: "BOOKING", refId: bookingRef, note: `Commission · ${bookingRef}` });
    }
    if (agentMarkup > 0) {
      await walletTxn({ userId: user.id, type: "CREDIT", amount: agentMarkup, reason: "COMMISSION", status: "PENDING", refType: "BOOKING", refId: bookingRef, note: `Service charge · ${bookingRef}` });
    }
  } catch (e) {
    console.warn("[bookings] commission attribution failed:", (e as Error).message);
  }
}

/** Service charge + GST breakdown sent from the payment page (added on top of existing fees). */
function billingFields(body: Record<string, unknown>) {
  const g = (body.gst || {}) as { type?: string; igst?: number; cgst?: number; sgst?: number };
  return {
    customerState: (body.customerState as string) || null,
    serviceCharge: Number(body.serviceCharge) || 0,
    gstType: g.type && g.type !== "NONE" ? g.type : null,
    igst: Number(g.igst) || 0,
    cgst: Number(g.cgst) || 0,
    sgst: Number(g.sgst) || 0,
  };
}

/** List the signed-in user's bookings (for My Trips). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ bookings: [] }, { status: 200 });
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ bookings: await attachBillTo(bookings) });
  } catch {
    return NextResponse.json({ bookings: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    // Payment must verify before any booking is confirmed.
    const verifyPayment = () => {
      if (!razorpayPaymentId && !razorpayOrderId) return true; // test/no-payment path
      return !!(razorpayOrderId && razorpayPaymentId && razorpaySignature &&
        verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature));
    };

    // ---- Pay from wallet: debit upfront (covers all booking types) ----
    if (body.paymentSource === "wallet") {
      const su = await getSessionUser();
      if (!su) return NextResponse.json({ error: "Please log in" }, { status: 401 });
      const debit = await walletTxn({ userId: su.id, type: "DEBIT", amount: Math.round(Number(body.total) || 0), reason: "BOOKING", refType: "BOOKING", note: "Booking payment from wallet" });
      if (!debit) return NextResponse.json({ error: "Insufficient wallet balance. Please add money or choose another payment method." }, { status: 400 });
    }

    // ---- Hotel booking ----
    if (body.type === "HOTEL") {
      return await createHotelBooking(body, verifyPayment());
    }
    // ---- Bus booking ----
    if (body.type === "BUS") {
      return await createBusBooking(body, verifyPayment());
    }

    const { flight, fare, query, passengers, seats, meals, contactEmail, contactPhone, total } = body;
    const extraFlights = Array.isArray(body.extraFlights) ? body.extraFlights : []; // return / multi-city legs
    if (!flight || !fare || !query || !contactEmail) {
      return NextResponse.json({ error: "Missing booking details" }, { status: 400 });
    }
    if (!verifyPayment()) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    const bookingRef = genBookingRef(flightRefPrefix(flight));
    const lead = passengers?.[0]?.fullName || "Traveller";
    const sessionUser = await getSessionUser();

    // ---- Ticket with the supplier BEFORE confirming anything ----------------
    // The PNR must come from Amadeus / Benzy. If ticketing fails the money has
    // already been taken, so the booking is parked as PENDING for staff to
    // resolve and the customer is told plainly — never a generated PNR against
    // a seat that was never sold.
    let issued: IssuedTicket;
    try {
      issued = await issueTicket({
        flight,
        extraFlights,
        passengers: Array.isArray(passengers) ? passengers : [],
        travellers: query.travellers,
        contactEmail,
        contactPhone: contactPhone || "",
        query,
        receivedFrom: sessionUser?.email || undefined,
      });
    } catch (e) {
      const err = e as SupplierBookingError;
      console.error("[bookings] ticketing failed:", err.supplier, err.message);
      await prisma.booking
        .create({
          data: {
            userId: sessionUser?.id || null,
            bookingRef,
            pnr: null,
            source: flightSource(flight),
            status: "PENDING",
            tripType: query.tripType,
            passengerType: query.passengerType,
            fareType: fare.id,
            origin: flight.from,
            destination: flight.to,
            departDate: new Date(flight.departTime),
            returnDate: query.returnDate ? new Date(query.returnDate) : null,
            cabinClass: query.cabinClass,
            adults: query.travellers.adults,
            children: query.travellers.children,
            infants: query.travellers.infants,
            totalAmount: total || fare.price,
            paymentSource: body.paymentSource || (razorpayPaymentId ? "razorpay" : "test"),
            paymentId: razorpayPaymentId || null,
            paymentOrderId: razorpayOrderId || null,
            paymentStatus: (razorpayPaymentId || body.paymentSource === "wallet") ? "PAID" : "TEST",
            contactEmail,
            contactPhone: contactPhone || "",
            flightData: extraFlights.length ? { ...flight, extraFlights } : flight,
            passengers: Array.isArray(passengers) ? passengers : [],
            supplierError: `${err.supplier}: ${err.message}`,
          },
        })
        .catch((dbErr) => console.error("[bookings] could not park pending booking:", (dbErr as Error).message));

      return NextResponse.json(
        {
          error: "We could not confirm your ticket with the airline immediately. Your payment is safe and our team is completing the booking — reference " + bookingRef + ".",
          bookingRef,
          status: "PENDING",
        },
        { status: 202 },
      );
    }
    const pnr = issued.pnr;

    // Combined per-passenger fare across every leg (return / multi-city), and the
    // adult/child/infant breakdown — the single source of truth for stored & emailed fares.
    const perPaxAll = (fare.price || 0) + extraFlights.reduce((s: number, e: { fare?: { price?: number } }) => s + (e.fare?.price || 0), 0);
    const fb = fareBreakdown(query.travellers, perPaxAll);
    const types = paxTypes(query.travellers);
    // Per-leg SSR: seats/meals are legIndex → paxIndex → id (leg 0 = onward,
    // legs 1..N = return / multi-city). Label each leg for the ticket & invoice.
    const seatMap = (seats || {}) as Record<number, Record<number, string>>;
    const mealMap = (meals || {}) as Record<number, Record<number, string>>;
    const legCount = 1 + extraFlights.length;
    const multiLeg = extraFlights.length > 0;
    const legLabel = (leg: number) =>
      !multiLeg ? "" : query.tripType === "ROUND_TRIP" ? (leg === 0 ? "Onward" : "Return") : `Flight ${leg + 1}`;
    // Carry each traveller's chosen seat & meal — per leg — on the passenger record so
    // the ticket / invoice / My Trips can show seats & meals for BOTH flights. `seat`/`meal`
    // stay as the onward selection for backward-compatible single-value rendering.
    const enrichedPassengers = (Array.isArray(passengers) ? passengers : []).map((p: { fullName?: string; [k: string]: unknown }, i: number) => {
      const ssr = Array.from({ length: legCount }, (_, leg) => ({
        leg,
        label: legLabel(leg),
        seat: seatMap[leg]?.[i] || null,
        meal: mealMap[leg]?.[i] || null,
      })).filter((x) => x.seat || x.meal);
      return {
        ...p,
        type: types[i] || "Adult",
        seat: seatMap[0]?.[i] || null,
        meal: mealMap[0]?.[i] || null,
        ssr,
      };
    });

    let saved = true;
    try {
      await prisma.booking.create({
        data: {
          userId: sessionUser?.id || null,
          bookingRef,
          pnr,
          ticketNumbers: issued.ticketNumbers,
          supplierRef: issued.supplierRef || null,
          source: flightSource(flight),
          // Sold but not yet ticketed is a real supplier state (e.g. a hold);
          // it is not a confirmed ticket, so it waits for staff rather than
          // telling the customer they are ready to fly.
          status: issued.ticketed ? "CONFIRMED" : "PENDING",
          tripType: query.tripType,
          passengerType: query.passengerType,
          fareType: fare.id,
          origin: flight.from,
          destination: flight.to,
          departDate: new Date(flight.departTime),
          returnDate: query.returnDate ? new Date(query.returnDate) : null,
          cabinClass: query.cabinClass,
          adults: query.travellers.adults,
          children: query.travellers.children,
          infants: query.travellers.infants,
          // Per-passenger unit base/taxes across all legs (combined for round-trip / multi-city).
          baseFare: Math.round(perPaxAll * 0.82),
          taxes: Math.round(perPaxAll * 0.18),
          addOns: body.addOns || 0,
          agentMarkup: Math.max(0, Number(body.agentMarkup) || 0),
          ...billingFields(body),
          totalAmount: total || fare.price,
          paymentSource: body.paymentSource || (razorpayPaymentId ? "razorpay" : "test"),
          paymentId: razorpayPaymentId || null,
          paymentOrderId: razorpayOrderId || null,
          paymentMethod: razorpayPaymentId ? "razorpay" : body.paymentSource === "wallet" ? "wallet" : "test",
          paymentStatus: (razorpayPaymentId || body.paymentSource === "wallet") ? "PAID" : "TEST",
          contactEmail,
          contactPhone: contactPhone || "",
          flightData: extraFlights.length ? { ...flight, extraFlights } : flight,
          passengers: enrichedPassengers,
          seats: seats || {},
          meals: meals || {},
        },
      });
    } catch (dbErr) {
      console.error("[bookings] DB save failed:", (dbErr as Error).message);
      saved = false;
    }

    // The supplier sold the seat but stopped short of issuing the ticket (a hold).
    // The PNR is real and stored, but the customer is not ticketed — so no
    // confirmation goes out and the journey ends with staff, not a "Confirmed!" page.
    if (!issued.ticketed) {
      await attributeAgentCommission(bookingRef, total || fare.price, Math.max(0, Number(body.agentMarkup) || 0));
      return NextResponse.json(
        {
          error: `Your seat is held with the airline (PNR ${pnr}) but the ticket is still being issued. Our team is completing it — reference ${bookingRef}.`,
          bookingRef,
          pnr,
          status: "PENDING",
          saved,
        },
        { status: 202 },
      );
    }

    // fire-and-forget email (full details)
    const travellers = query.travellers.adults + query.travellers.children + query.travellers.infants;
    const addOnsAmt = body.addOns || 0;
    const grand = total || fb.fareTotal;
    // Remaining over the air fare + add-ons is the convenience fee (+ any service charge / GST).
    const convenience = Math.max(0, grand - fb.fareTotal - addOnsAmt);
    const tm = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    const dur = flight.durationMinutes ? `${Math.floor(flight.durationMinutes / 60)}h ${String(flight.durationMinutes % 60).padStart(2, "0")}m` : "";

    sendBookingEmail({
      to: contactEmail,
      bookingRef,
      pnr,
      html: bookingEmailHtml({
        bookingRef, pnr,
        origin: flight.from, destination: flight.to,
        dateLabel: new Date(flight.departTime).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }),
        departTime: tm(flight.departTime), arriveTime: tm(flight.arriveTime),
        airline: flight.airlineName, flightNumber: flight.flightNumber,
        stops: flight.stops || 0, durationLabel: dur,
        passengerName: lead, travellers, cabin: query.cabinClass, fareLabel: fare.label,
        passengers: enrichedPassengers.map((p) => ({
          name: (p.fullName as string) || "Traveller",
          type: (p.type as string) || "Adult",
          seat: (p.seat as string) || "",
          meal: MEALS.find((m) => m.id === p.meal)?.label || "",
        })),
        cabinBaggage: flight.cabinBaggage || "7 kg", checkInBaggage: flight.checkInBaggage || "15 kg",
        source: flight.source,
        base: fb.base, taxes: fb.taxes, infantFare: fb.infantTotal, infants: fb.infants,
        addOns: addOnsAmt, convenience, total: grand,
      }),
    }).catch(() => {});

    await attributeAgentCommission(bookingRef, grand, Math.max(0, Number(body.agentMarkup) || 0));
    return NextResponse.json({ bookingRef, pnr, saved });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

interface HotelBookingBody {
  hotel?: { name: string; area: string; city: string; image: string; starRating: number };
  roomName?: string;
  roomPrice?: number;
  nights?: number;
  query?: { city: string; checkIn: string; checkOut: string; rooms: number; adults: number; children: number };
  guest?: { fullName: string; email: string; phone?: string; requests?: string };
  total?: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentSource?: string;
}

async function createHotelBooking(body: HotelBookingBody, paymentOk: boolean) {
  const { hotel, roomName, roomPrice = 0, nights = 1, query, guest, total, razorpayOrderId, razorpayPaymentId } = body;
  if (!hotel || !query || !guest?.email) {
    return NextResponse.json({ error: "Missing hotel booking details" }, { status: 400 });
  }
  if (!paymentOk) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  const bookingRef = genBookingRef();
  const confirmationNo = genPNR();
  const sessionUser = await getSessionUser();
  const room = roomPrice * nights;
  const taxes = Math.round(room * 0.12);
  const grand = total || room + taxes;

  let saved = true;
  try {
    await prisma.booking.create({
      data: {
        userId: sessionUser?.id || null,
        bookingRef,
        pnr: confirmationNo,
        bookingType: "HOTEL",
        source: hotelSource(),
        status: "CONFIRMED",
        tripType: "ONE_WAY",
        origin: query.city,
        destination: query.city,
        departDate: new Date(query.checkIn),
        returnDate: query.checkOut ? new Date(query.checkOut) : null,
        cabinClass: roomName || "Standard Room",
        adults: query.adults || 1,
        children: query.children || 0,
        baseFare: roomPrice,
        taxes,
        addOns: 0,
        ...billingFields(body as unknown as Record<string, unknown>),
        totalAmount: grand,
        paymentSource: body.paymentSource || (razorpayPaymentId ? "razorpay" : "test"),
        paymentId: razorpayPaymentId || null,
        paymentOrderId: razorpayOrderId || null,
        paymentMethod: razorpayPaymentId ? "razorpay" : body.paymentSource === "wallet" ? "wallet" : "test",
        paymentStatus: (razorpayPaymentId || body.paymentSource === "wallet") ? "PAID" : "TEST",
        contactEmail: guest.email,
        contactPhone: guest.phone || "",
        flightData: { ...hotel, roomName, nights, checkIn: query.checkIn, checkOut: query.checkOut, rooms: query.rooms },
        passengers: [{ fullName: guest.fullName, requests: guest.requests || "" }],
      },
    });
  } catch (e) {
    console.error("[bookings] hotel DB save failed:", (e as Error).message);
    saved = false;
  }

  const html = hotelBookingEmailHtml({
    bookingRef, confirmationNo,
    hotelName: hotel.name, area: hotel.area, city: hotel.city, starRating: hotel.starRating,
    roomName: roomName || "Room", nights, checkIn: query.checkIn, checkOut: query.checkOut,
    guestName: guest.fullName, guests: (query.adults || 1) + (query.children || 0), rooms: query.rooms || 1,
    roomTotal: room, taxes, convenience: Math.max(0, grand - room - taxes), total: grand,
  });
  sendBookingEmail({ to: guest.email, bookingRef, pnr: confirmationNo, html, subject: `Stay Booked · ${hotel.name}, ${hotel.city} · ${bookingRef}` }).catch(() => {});

  await attributeAgentCommission(bookingRef, grand);
  return NextResponse.json({ bookingRef, pnr: confirmationNo, saved });
}

interface BusBookingBody {
  bus?: { operator: string; busType: string; from: string; to: string; departTime: string; arriveTime: string };
  query?: { from: string; to: string; date: string };
  seats?: { id: string; price: number }[];
  boarding?: { name: string; time: string };
  dropping?: { name: string; time: string };
  passengers?: { fullName: string; age: string; gender: string; seatId: string }[];
  contactEmail?: string;
  contactPhone?: string;
  total?: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentSource?: string;
}

async function createBusBooking(body: BusBookingBody, paymentOk: boolean) {
  const { bus, query, seats = [], boarding, dropping, passengers = [], contactEmail, contactPhone, total, razorpayOrderId, razorpayPaymentId } = body;
  if (!bus || !query || !contactEmail || seats.length === 0) {
    return NextResponse.json({ error: "Missing bus booking details" }, { status: 400 });
  }
  if (!paymentOk) return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });

  const bookingRef = genBookingRef();
  const ticketNo = genPNR();
  const sessionUser = await getSessionUser();
  const fareTotal = seats.reduce((a, s) => a + s.price, 0);
  const taxes = Math.round(fareTotal * 0.05);
  const grand = total || fareTotal + taxes + 49;
  const lead = passengers[0]?.fullName || "Traveller";

  let saved = true;
  try {
    await prisma.booking.create({
      data: {
        userId: sessionUser?.id || null,
        bookingRef, pnr: ticketNo, bookingType: "BUS", source: busSource(), status: "CONFIRMED", tripType: "ONE_WAY",
        origin: query.from, destination: query.to, departDate: new Date(bus.departTime),
        cabinClass: bus.busType, adults: passengers.length || seats.length,
        baseFare: fareTotal, taxes, addOns: 0, ...billingFields(body as unknown as Record<string, unknown>), totalAmount: grand,
        paymentSource: body.paymentSource || (razorpayPaymentId ? "razorpay" : "test"),
        paymentId: razorpayPaymentId || null, paymentOrderId: razorpayOrderId || null,
        paymentMethod: razorpayPaymentId ? "razorpay" : body.paymentSource === "wallet" ? "wallet" : "test", paymentStatus: (razorpayPaymentId || body.paymentSource === "wallet") ? "PAID" : "TEST",
        contactEmail, contactPhone: contactPhone || "",
        flightData: { ...bus, boarding, dropping, seatIds: seats.map((s) => s.id), date: query.date },
        passengers,
      },
    });
  } catch (e) {
    console.error("[bookings] bus DB save failed:", (e as Error).message);
    saved = false;
  }

  const html = busBookingEmailHtml({
    bookingRef, ticketNo, operator: bus.operator, busType: bus.busType,
    from: query.from, to: query.to, departTime: bus.departTime, arriveTime: bus.arriveTime,
    boarding: boarding?.name || "-", boardingTime: boarding?.time || "", dropping: dropping?.name || "-",
    seatIds: seats.map((s) => s.id), passengerName: lead, passengers: passengers.length || seats.length,
    fareTotal, taxes, convenience: Math.max(0, grand - fareTotal - taxes), total: grand,
  });
  sendBookingEmail({ to: contactEmail, bookingRef, pnr: ticketNo, html, subject: `Bus Ticket Confirmed · ${query.from} → ${query.to} · ${bookingRef}` }).catch(() => {});

  await attributeAgentCommission(bookingRef, grand);
  return NextResponse.json({ bookingRef, pnr: ticketNo, saved });
}
