import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { sendTicketReplyEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { ok, user } = await isAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { ticketId, body, status } = await req.json();
  const text = (body || "").trim();
  if (!ticketId || !text) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const message = await prisma.ticketMessage.create({
    data: { ticketId, sender: "ADMIN", authorName: user?.name || "Support Team", body: text },
  });
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { lastReplyBy: "ADMIN", status: status === "RESOLVED" ? "RESOLVED" : ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status },
  });

  sendTicketReplyEmail({ to: ticket.email, ticketNo: ticket.ticketNo, subject: ticket.subject, body: text, toCustomer: true, customerName: ticket.name }).catch(() => {});

  return NextResponse.json({ message });
}
