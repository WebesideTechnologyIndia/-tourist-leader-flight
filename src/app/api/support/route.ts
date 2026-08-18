import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendSupportTicketEmails } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const CATEGORIES = ["BOOKING", "PAYMENT", "REFUND", "CANCELLATION", "BAGGAGE", "GENERAL"];

function genTicketNo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "TKT";
  for (let i = 0; i < 7; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** List the signed-in user's tickets with their conversation. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ tickets: [] });
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { OR: [{ userId: user.id }, { email: user.email }] },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json({ tickets });
  } catch {
    return NextResponse.json({ tickets: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const subject = (body.subject || "").trim();
    const message = (body.message || "").trim();
    const category = CATEGORIES.includes(body.category) ? body.category : "GENERAL";
    const bookingRef = (body.bookingRef || "").trim() || null;
    const phone = (body.phone || "").trim() || null;

    if (!name) return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    if (!subject) return NextResponse.json({ error: "Please enter a subject" }, { status: 400 });
    if (message.length < 10) return NextResponse.json({ error: "Please describe your issue (at least 10 characters)" }, { status: 400 });

    const user = await getSessionUser();
    const ticketNo = genTicketNo();

    let saved = true;
    try {
      await prisma.supportTicket.create({
        data: { ticketNo, userId: user?.id || null, name, email, phone, category, bookingRef, subject, message },
      });
    } catch (e) {
      console.error("[support] DB save failed:", (e as Error).message);
      saved = false;
    }

    // fire-and-forget emails (team + customer ack)
    sendSupportTicketEmails({ ticketNo, name, email, phone: phone || undefined, category, bookingRef: bookingRef || undefined, subject, message }).catch(() => {});

    return NextResponse.json({ ticketNo, saved });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
