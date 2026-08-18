import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { GROUP_MIN_TRAVELLERS, JOURNEY_TYPES, documentSummary, validatePassengers, type GroupPassenger, type JourneyType, type PaxType } from "@/lib/group";
import { sendGroupEnquiryEmails } from "@/lib/mailer";

export const dynamic = "force-dynamic";
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function enquiryNo() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return `TLGRP${s}`;
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!(b.from || "").trim() || !(b.to || "").trim()) return NextResponse.json({ error: "Please choose the route" }, { status: 400 });
    if (!(b.departDate || "").trim()) return NextResponse.json({ error: "Please choose the departure date" }, { status: 400 });
    if (!(b.name || "").trim()) return NextResponse.json({ error: "Contact name is required" }, { status: 400 });
    if (!emailRe.test((b.email || "").trim())) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    if ((b.phone || "").replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Valid phone is required" }, { status: 400 });

    const adults = Math.max(0, Number(b.adults) || 0);
    const children = Math.max(0, Number(b.children) || 0);
    const infants = Math.max(0, Number(b.infants) || 0);
    const total = adults + children + infants;
    if (total < GROUP_MIN_TRAVELLERS) {
      return NextResponse.json({ error: `Group bookings need at least ${GROUP_MIN_TRAVELLERS} travellers.` }, { status: 400 });
    }
    const tripType = b.tripType === "ROUND_TRIP" ? "ROUND_TRIP" : "ONE_WAY";
    if (tripType === "ROUND_TRIP" && !(b.returnDate || "").trim()) {
      return NextResponse.json({ error: "Please choose the return date for a round trip." }, { status: 400 });
    }

    const passengerNames = Array.isArray(b.passengerNames)
      ? b.passengerNames.map((n: unknown) => String(n || "").trim()).filter(Boolean)
      : [];

    const journeyType: JourneyType = JOURNEY_TYPES.includes(b.journeyType) ? b.journeyType : "DOMESTIC";

    // Travel documents per traveller: any photo ID domestically, passport
    // (number + expiry) for international. Re-validated here because the form
    // is client-side and this route is publicly reachable.
    const str = (v: unknown) => String(v ?? "").trim();
    const passengers: GroupPassenger[] = Array.isArray(b.passengers)
      ? b.passengers.slice(0, 200).map((p: Record<string, unknown>) => ({
          name: str(p?.name),
          paxType: (["ADULT", "CHILD", "INFANT"].includes(str(p?.paxType)) ? str(p?.paxType) : "ADULT") as PaxType,
          idType: str(p?.idType) || undefined,
          idNumber: str(p?.idNumber) || undefined,
          passportNo: str(p?.passportNo).toUpperCase() || undefined,
          passportExpiry: str(p?.passportExpiry) || undefined,
          nationality: str(p?.nationality) || undefined,
        }))
      : [];

    if (passengers.length) {
      const errors = validatePassengers(passengers, journeyType);
      const first = Object.values(errors)[0];
      if (first) return NextResponse.json({ error: first, errors }, { status: 400 });
    } else if (journeyType === "INTERNATIONAL") {
      return NextResponse.json(
        { error: "International bulk enquiries need passport details for every traveller." },
        { status: 400 }
      );
    }

    const user = await getSessionUser();
    // Agents file bulk enquiries on behalf of their customers; the admin list
    // and the export separate the two.
    const { tier } = await isAdmin();
    const submittedBy = tier === "agent" ? "AGENT" : "CUSTOMER";
    const no = enquiryNo();
    const data = {
      enquiryNo: no,
      userId: user?.id || null,
      journeyType,
      submittedBy,
      tripType,
      origin: b.from.trim().toUpperCase(),
      destination: b.to.trim().toUpperCase(),
      departDate: b.departDate.trim(),
      returnDate: tripType === "ROUND_TRIP" ? (b.returnDate || "").trim() || null : null,
      cabinClass: (b.cabinClass || "Economy").trim(),
      adults,
      children,
      infants,
      passengerNames,
      passengers,
      name: b.name.trim(),
      email: b.email.trim().toLowerCase(),
      phone: b.phone.trim(),
      company: (b.company || "").trim() || null,
      message: (b.message || "").trim() || null,
      status: "NEW",
      source: "WEB",
    };

    let saved = true;
    try { await prisma.groupEnquiry.create({ data }); } catch (e) { console.error("[group] save failed:", (e as Error).message); saved = false; }

    sendGroupEnquiryEmails({
      enquiryNo: no, tripType, origin: data.origin, destination: data.destination,
      departDate: data.departDate, returnDate: data.returnDate || undefined, cabinClass: data.cabinClass,
      travellers: total, adults, children, infants, passengerNames,
      name: data.name, email: data.email, phone: data.phone, company: data.company || undefined, message: data.message || undefined,
      journeyType,
      documents: passengers.map((p) => `${p.name} — ${documentSummary(p, journeyType) || "document pending"}`),
    }).catch(() => {});

    return NextResponse.json({ enquiryNo: no, saved });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
