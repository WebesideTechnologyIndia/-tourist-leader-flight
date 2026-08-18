import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendPackageEnquiryEmails } from "@/lib/mailer";

export const dynamic = "force-dynamic";

function genEnquiryNo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "ENQ";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const name = (b.name || "").trim();
    const email = (b.email || "").trim().toLowerCase();
    const phone = (b.phone || "").trim();
    if (!name) return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    if (phone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
    if (!b.packageSlug || !b.packageTitle) return NextResponse.json({ error: "Missing package" }, { status: 400 });

    const user = await getSessionUser();
    const enquiryNo = genEnquiryNo();
    const adults = Number(b.adults || 2);
    const children = Number(b.children || 0);

    let saved = true;
    try {
      await prisma.packageEnquiry.create({
        data: {
          enquiryNo, userId: user?.id || null,
          packageSlug: b.packageSlug, packageTitle: b.packageTitle,
          name, email, phone, travelMonth: b.travelMonth || null,
          adults, children, message: (b.message || "").trim() || null,
        },
      });
    } catch (e) {
      console.error("[enquiry] DB save failed:", (e as Error).message);
      saved = false;
    }

    sendPackageEnquiryEmails({ enquiryNo, packageTitle: b.packageTitle, name, email, phone, travelMonth: b.travelMonth, adults, children, message: b.message }).catch(() => {});

    return NextResponse.json({ enquiryNo, saved });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
