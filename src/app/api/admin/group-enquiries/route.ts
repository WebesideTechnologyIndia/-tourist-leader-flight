import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { GROUP_STATUSES, maskPassenger, type GroupPassenger, type GroupStatus } from "@/lib/group";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ok, permissions, tier } = await isAdmin();
  if (!ok || !permissions.includes("enquiries.view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await prisma.groupEnquiry.findMany({ orderBy: { createdAt: "desc" }, take: 300 });

  // The AGENT role also holds enquiries.view, so mask passport/ID numbers for
  // anyone below the admin tier rather than shipping the raw values.
  const full = tier === "admin";
  const enquiries = rows.map((e) => {
    const passengers = (Array.isArray(e.passengers) ? e.passengers : []) as unknown as GroupPassenger[];
    return { ...e, passengers: full ? passengers : passengers.map(maskPassenger) };
  });

  return NextResponse.json({ enquiries, canManage: permissions.includes("enquiries.manage"), documentsMasked: !full });
}

export async function PATCH(req: NextRequest) {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("enquiries.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, status, note } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const data: Record<string, string | null> = {};
  if (status !== undefined) {
    if (!GROUP_STATUSES.includes(status as GroupStatus)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    data.status = status;
  }
  if (note !== undefined) data.note = (note || "").trim() || null;
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  await prisma.groupEnquiry.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
