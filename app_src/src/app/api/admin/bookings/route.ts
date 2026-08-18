import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { attachBillTo } from "@/lib/invoice-billing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { ok, tier, user } = await isAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const type = req.nextUrl.searchParams.get("type");

  const where: { bookingType?: string; bookedByAgentId?: string } = {};
  if (type && type !== "ALL") where.bookingType = type;
  // agents only see the bookings they created; admins see all
  if (tier === "agent" && user) where.bookedByAgentId = user.id;

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ bookings: await attachBillTo(bookings) });
}
