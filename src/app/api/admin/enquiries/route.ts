import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin, isAdminEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ["NEW", "CONTACTED", "QUOTED", "BOOKED", "CLOSED"];
const SOURCES = ["WEB", "PHONE", "WALK_IN", "REFERRAL", "SOCIAL"];

function enquiryNo() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return `TLENQ${s}`;
}

/** Staff who can be assigned leads = users whose role grants enquiries.view. */
async function staffList() {
  const roles = await prisma.role.findMany();
  const keys = roles.filter((r) => Array.isArray(r.permissions) && (r.permissions as string[]).includes("enquiries.view")).map((r) => r.key);
  const users = await prisma.user.findMany({
    where: { role: { in: keys.length ? keys : ["__none__"] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({ id: u.id, name: u.name || u.email.split("@")[0], email: u.email, superAdmin: isAdminEmail(u.email) }));
}

export async function GET() {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("enquiries.view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [enquiries, agents] = await Promise.all([
    prisma.packageEnquiry.findMany({ orderBy: { createdAt: "desc" }, take: 300 }),
    staffList(),
  ]);
  const agentName: Record<string, string> = Object.fromEntries(agents.map((a) => [a.id, a.name]));
  return NextResponse.json({
    enquiries: enquiries.map((e) => ({ ...e, assignedName: e.assignedTo ? agentName[e.assignedTo] || "—" : null })),
    agents,
    canManage: permissions.includes("enquiries.manage"),
  });
}

export async function POST(req: NextRequest) {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("enquiries.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await req.json();
  if (!(b.name || "").trim()) return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
  if (!emailRe.test((b.email || "").trim()) && !(b.phone || "").trim()) return NextResponse.json({ error: "Email or phone is required" }, { status: 400 });
  const enquiry = await prisma.packageEnquiry.create({
    data: {
      enquiryNo: enquiryNo(),
      packageSlug: (b.packageSlug || "custom").trim(),
      packageTitle: (b.packageTitle || "Custom enquiry").trim(),
      name: b.name.trim(),
      email: (b.email || "").trim().toLowerCase(),
      phone: (b.phone || "").trim(),
      travelMonth: (b.travelMonth || "").trim() || null,
      adults: Number(b.adults) || 1,
      children: Number(b.children) || 0,
      message: (b.message || "").trim() || null,
      note: (b.note || "").trim() || null,
      source: SOURCES.includes(b.source) ? b.source : "PHONE",
      status: "NEW",
      assignedTo: b.assignedTo || null,
    },
  });
  return NextResponse.json({ enquiry });
}

export async function PATCH(req: NextRequest) {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("enquiries.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, status, assignedTo, note } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const data: Record<string, string | null> = {};
  if (status !== undefined) { if (!STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 }); data.status = status; }
  if (assignedTo !== undefined) data.assignedTo = assignedTo || null;
  if (note !== undefined) data.note = (note || "").trim() || null;
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  await prisma.packageEnquiry.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
