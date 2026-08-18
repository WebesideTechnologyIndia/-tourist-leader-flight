import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendVisaEnquiryEmails } from "@/lib/mailer";

export const dynamic = "force-dynamic";
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function enquiryNo() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return `TLVISA${s}`;
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!(b.country || "").trim()) return NextResponse.json({ error: "Please select a country" }, { status: 400 });
    if (!(b.purpose || "").trim()) return NextResponse.json({ error: "Please select a purpose" }, { status: 400 });
    if (!(b.name || "").trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!emailRe.test((b.email || "").trim())) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    if ((b.phone || "").replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Valid phone is required" }, { status: 400 });

    const user = await getSessionUser();
    const no = enquiryNo();
    const data = {
      enquiryNo: no,
      userId: user?.id || null,
      country: b.country.trim(),
      purpose: b.purpose.trim(),
      travellers: Math.max(1, Number(b.travellers) || 1),
      onwardDate: (b.onwardDate || "").trim() || null,
      returnDate: (b.returnDate || "").trim() || null,
      name: b.name.trim(),
      email: b.email.trim().toLowerCase(),
      phone: b.phone.trim(),
      message: (b.message || "").trim() || null,
      status: "NEW",
      source: "WEB",
    };

    let saved = true;
    try { await prisma.visaEnquiry.create({ data }); } catch (e) { console.error("[visa] save failed:", (e as Error).message); saved = false; }

    sendVisaEnquiryEmails({
      enquiryNo: no, country: data.country, purpose: data.purpose, travellers: data.travellers,
      onwardDate: data.onwardDate || undefined, returnDate: data.returnDate || undefined,
      name: data.name, email: data.email, phone: data.phone, message: data.message || undefined,
    }).catch(() => {});

    return NextResponse.json({ enquiryNo: no, saved });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
