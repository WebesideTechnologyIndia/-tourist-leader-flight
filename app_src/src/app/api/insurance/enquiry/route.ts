import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendInsuranceEnquiryEmails } from "@/lib/mailer";
import { INSURANCE_TYPE_LABEL } from "@/lib/insurance";

export const dynamic = "force-dynamic";
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TYPES = ["TRAVEL", "MOTOR", "HOUSE", "LIFE"];

function enquiryNo() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return `TLINS${s}`;
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const type = TYPES.includes(b.type) ? b.type : "TRAVEL";
    if (!(b.name || "").trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!emailRe.test((b.email || "").trim())) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    if ((b.phone || "").replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Valid mobile number is required" }, { status: 400 });

    const det = (b.details || {}) as Record<string, string>;
    if (type === "TRAVEL" && !(det.destination || "").trim()) return NextResponse.json({ error: "Please select a destination" }, { status: 400 });
    if (type === "MOTOR" && !(det.vehicleType || "").trim()) return NextResponse.json({ error: "Please select a vehicle type" }, { status: 400 });

    const user = await getSessionUser();
    const no = enquiryNo();
    const data = {
      enquiryNo: no, userId: user?.id || null, type,
      name: b.name.trim(), email: b.email.trim().toLowerCase(), phone: b.phone.trim(),
      city: (b.city || "").trim() || null, details: det, message: (b.message || "").trim() || null,
      status: "NEW", source: "WEB",
    };

    let saved = true;
    try { await prisma.insuranceEnquiry.create({ data }); } catch (e) { console.error("[insurance] save failed:", (e as Error).message); saved = false; }

    const lines: Record<string, string[]> = {
      TRAVEL: [det.citizen ? `Citizen: ${det.citizen}` : "", det.destination ? `Going to: ${det.destination}` : "", (det.departure || det.return) ? `Dates: ${det.departure || "?"} → ${det.return || "?"}` : "", det.travellers ? `Travellers: ${det.travellers}` : ""].filter(Boolean),
      MOTOR: [det.vehicleType ? `Vehicle: ${det.vehicleType}` : "", det.registration ? `Reg: ${det.registration}` : "", det.prevExpiry ? `Prev. expiry: ${det.prevExpiry}` : ""].filter(Boolean),
      HOUSE: [det.propertyKind ? `Property: ${det.propertyKind}` : ""].filter(Boolean),
      LIFE: [det.age ? `Age: ${det.age}` : ""].filter(Boolean),
    };

    sendInsuranceEnquiryEmails({
      enquiryNo: no, typeLabel: INSURANCE_TYPE_LABEL[type], name: data.name, email: data.email, phone: data.phone,
      city: data.city || undefined, detailLines: lines[type], message: data.message || undefined,
    }).catch(() => {});

    return NextResponse.json({ enquiryNo: no, saved });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
