import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface Hit { type: string; label: string; sub: string; href: string }

export async function GET(req: NextRequest) {
  const { ok, permissions, tier, user } = await isAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const can = (p: string) => permissions.includes(p);
  const agentScope = tier === "agent" && user ? { bookedByAgentId: user.id } : {};
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ groups: [] });

  const groups: { title: string; hits: Hit[] }[] = [];

  // Bookings
  if (can("bookings.view")) {
    const rows = await prisma.booking.findMany({
      where: { AND: [agentScope, { OR: [{ bookingRef: { contains: q } }, { pnr: { contains: q } }, { contactEmail: { contains: q } }, { origin: { contains: q } }, { destination: { contains: q } }] }] },
      orderBy: { createdAt: "desc" }, take: 5,
      select: { bookingRef: true, bookingType: true, origin: true, destination: true, contactEmail: true },
    });
    if (rows.length) groups.push({ title: "Bookings", hits: rows.map((b) => ({ type: "booking", label: `${b.bookingRef} · ${b.origin} → ${b.destination}`, sub: `${b.bookingType} · ${b.contactEmail}`, href: `/admin/bookings?q=${encodeURIComponent(b.bookingRef)}` })) });
  }
  // Packages
  if (can("packages.view")) {
    const rows = await prisma.package.findMany({ where: { OR: [{ title: { contains: q } }, { destination: { contains: q } }, { country: { contains: q } }] }, take: 5, select: { slug: true, title: true, destination: true } });
    if (rows.length) groups.push({ title: "Packages", hits: rows.map((p) => ({ type: "package", label: p.title, sub: p.destination, href: `/admin/packages/${p.slug}/edit` })) });
  }
  // Enquiries
  if (can("enquiries.view")) {
    const rows = await prisma.packageEnquiry.findMany({ where: { OR: [{ enquiryNo: { contains: q } }, { packageTitle: { contains: q } }, { name: { contains: q } }, { email: { contains: q } }] }, orderBy: { createdAt: "desc" }, take: 5, select: { enquiryNo: true, packageTitle: true, name: true } });
    if (rows.length) groups.push({ title: "Enquiries", hits: rows.map((e) => ({ type: "enquiry", label: e.packageTitle, sub: `${e.enquiryNo} · ${e.name}`, href: "/admin/enquiries" })) });
  }
  // Tickets
  if (can("tickets.view")) {
    const rows = await prisma.supportTicket.findMany({ where: { OR: [{ ticketNo: { contains: q } }, { subject: { contains: q } }, { name: { contains: q } }, { email: { contains: q } }] }, orderBy: { updatedAt: "desc" }, take: 5, select: { ticketNo: true, subject: true, name: true } });
    if (rows.length) groups.push({ title: "Tickets", hits: rows.map((t) => ({ type: "ticket", label: t.subject, sub: `${t.ticketNo} · ${t.name}`, href: "/admin/tickets" })) });
  }
  // Users
  if (can("users.view")) {
    const rows = await prisma.user.findMany({ where: { OR: [{ email: { contains: q } }, { name: { contains: q } }, { phone: { contains: q } }] }, take: 5, select: { email: true, name: true } });
    if (rows.length) groups.push({ title: "Users", hits: rows.map((u) => ({ type: "user", label: u.name || u.email, sub: u.email, href: `/admin/users?q=${encodeURIComponent(u.email)}` })) });
  }

  return NextResponse.json({ groups });
}
