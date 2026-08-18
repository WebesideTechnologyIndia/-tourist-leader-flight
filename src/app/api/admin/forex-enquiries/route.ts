import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { FOREX_STATUSES } from "@/lib/forex";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("enquiries.view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const enquiries = await prisma.forexEnquiry.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  return NextResponse.json({ enquiries, canManage: permissions.includes("enquiries.manage") });
}

export async function PATCH(req: NextRequest) {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("enquiries.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, status, note } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const data: Record<string, string | null> = {};
  if (status !== undefined) { if (!FOREX_STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 }); data.status = status; }
  if (note !== undefined) data.note = (note || "").trim() || null;
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  await prisma.forexEnquiry.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
