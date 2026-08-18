import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendPartnerEnquiryEmails } from "@/lib/mailer";

export const dynamic = "force-dynamic";
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function enquiryNo(type: string) {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return `${type === "TL_BIZ" ? "TLBIZ" : "TLPROP"}${s}`;
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const type = b.type === "TL_BIZ" ? "TL_BIZ" : "LIST_PROPERTY";
    if (!(b.name || "").trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!emailRe.test((b.email || "").trim())) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    if ((b.phone || "").replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Valid phone is required" }, { status: 400 });
    if (!(b.company || "").trim()) return NextResponse.json({ error: type === "TL_BIZ" ? "Company name is required" : "Property name is required" }, { status: 400 });

    const user = await getSessionUser();
    const no = enquiryNo(type);
    const details = type === "TL_BIZ"
      ? { companySize: (b.companySize || "").trim() || null, designation: (b.designation || "").trim() || null }
      : { propertyType: (b.propertyType || "").trim() || null, rooms: b.rooms ? Number(b.rooms) : null };

    const data = {
      enquiryNo: no, userId: user?.id || null, type,
      name: b.name.trim(), email: b.email.trim().toLowerCase(), phone: b.phone.trim(),
      company: (b.company || "").trim() || null, city: (b.city || "").trim() || null,
      details, message: (b.message || "").trim() || null, status: "NEW", source: "WEB",
    };

    let saved = true;
    try { await prisma.partnerEnquiry.create({ data }); } catch (e) { console.error("[partner] save failed:", (e as Error).message); saved = false; }

    const detailLines = type === "TL_BIZ"
      ? [details.companySize ? `Company size: ${details.companySize}` : "", details.designation ? `Designation: ${details.designation}` : ""].filter(Boolean)
      : [details.propertyType ? `Property type: ${details.propertyType}` : "", details.rooms ? `Rooms: ${details.rooms}` : ""].filter(Boolean);

    sendPartnerEnquiryEmails({
      enquiryNo: no, type, name: data.name, email: data.email, phone: data.phone,
      company: data.company || undefined, city: data.city || undefined, detailLines, message: data.message || undefined,
    }).catch(() => {});

    return NextResponse.json({ enquiryNo: no, saved });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
