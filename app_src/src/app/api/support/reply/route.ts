import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendTicketReplyEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const { ticketId, body } = await req.json();
  const text = (body || "").trim();
  if (!ticketId || !text) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket || (ticket.userId !== user.id && ticket.email.toLowerCase() !== user.email.toLowerCase())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const message = await prisma.ticketMessage.create({
    data: { ticketId, sender: "CUSTOMER", authorName: user.name || ticket.name, body: text },
  });
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { lastReplyBy: "CUSTOMER", status: ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "OPEN" : ticket.status },
  });

  const inbox = process.env.SUPPORT_EMAIL || process.env.SMTP_USER || "";
  if (inbox) sendTicketReplyEmail({ to: inbox, ticketNo: ticket.ticketNo, subject: ticket.subject, body: text, toCustomer: false }).catch(() => {});

  return NextResponse.json({ message });
}
