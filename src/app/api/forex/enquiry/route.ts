import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendForexEnquiryEmails } from "@/lib/mailer";

export const dynamic = "force-dynamic";
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function enquiryNo() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return `TLFX${s}`;
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const type = b.type === "NOTES" ? "NOTES" : "CARD";
    if (!(b.name || "").trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!emailRe.test((b.email || "").trim())) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    if ((b.phone || "").replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Valid mobile number is required" }, { status: 400 });
    const currencies = Array.isArray(b.currencies) ? b.currencies.map((c: unknown) => String(c)).filter(Boolean) : [];
    if (type === "NOTES" && currencies.length === 0) return NextResponse.json({ error: "Please select at least one currency" }, { status: 400 });

    const user = await getSessionUser();
    const no = enquiryNo();
    const data = {
      enquiryNo: no,
      userId: user?.id || null,
      type,
      name: b.name.trim(),
      email: b.email.trim().toLowerCase(),
      phone: b.phone.trim(),
      address: (b.address || "").trim() || null,
      pan: (b.pan || "").trim().toUpperCase() || null,
      currencies: type === "NOTES" ? currencies : undefined,
      amount: (b.amount || "").trim() || null,
      message: (b.message || "").trim() || null,
      status: "NEW",
      source: "WEB",
    };

    let saved = true;
    try { await prisma.forexEnquiry.create({ data }); } catch (e) { console.error("[forex] save failed:", (e as Error).message); saved = false; }

    sendForexEnquiryEmails({
      enquiryNo: no, type, name: data.name, email: data.email, phone: data.phone,
      address: data.address || undefined, pan: data.pan || undefined, currencies, amount: data.amount || undefined, message: data.message || undefined,
    }).catch(() => {});

    return NextResponse.json({ enquiryNo: no, saved });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
