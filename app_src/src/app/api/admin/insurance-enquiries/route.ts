import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { INSURANCE_STATUSES } from "@/lib/insurance";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("enquiries.view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const enquiries = await prisma.insuranceEnquiry.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  return NextResponse.json({ enquiries, canManage: permissions.includes("enquiries.manage") });
}

export async function PATCH(req: NextRequest) {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("enquiries.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, status, note } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const data: Record<string, string | null> = {};
  if (status !== undefined) { if (!INSURANCE_STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 }); data.status = status; }
  if (note !== undefined) data.note = (note || "").trim() || null;
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  await prisma.insuranceEnquiry.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
