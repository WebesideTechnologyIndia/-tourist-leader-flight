import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ok } = await isAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tickets = await prisma.supportTicket.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json({ tickets });
}

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

export async function PATCH(req: NextRequest) {
  const { ok } = await isAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, status, priority } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const data: Record<string, string> = {};
  if (status && STATUSES.includes(status)) data.status = status;
  if (priority && PRIORITIES.includes(priority)) data.priority = priority;
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  await prisma.supportTicket.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
