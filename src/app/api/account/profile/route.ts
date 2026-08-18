import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const { name, phone } = await req.json();
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name: (name || "").trim() || null, phone: (phone || "").trim() || null },
    select: { id: true, email: true, name: true, phone: true },
  });
  return NextResponse.json({ user: updated });
}
