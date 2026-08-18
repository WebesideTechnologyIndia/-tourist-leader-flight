import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ items: [] });
  try {
    const items = await prisma.wishlist.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  try {
    const b = await req.json();
    const itemType = String(b.itemType || "").toUpperCase();
    const itemKey = String(b.itemKey || "").trim();
    if (!itemType || !itemKey || !b.title) return NextResponse.json({ error: "Missing item" }, { status: 400 });

    const item = await prisma.wishlist.upsert({
      where: { userId_itemType_itemKey: { userId: user.id, itemType, itemKey } },
      update: { title: b.title, subtitle: b.subtitle || null, image: b.image || null, price: b.price || null, href: b.href || null },
      create: { userId: user.id, itemType, itemKey, title: b.title, subtitle: b.subtitle || null, image: b.image || null, price: b.price || null, href: b.href || null },
    });
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  try {
    const b = await req.json();
    const itemType = String(b.itemType || "").toUpperCase();
    const itemKey = String(b.itemKey || "").trim();
    await prisma.wishlist.deleteMany({ where: { userId: user.id, itemType, itemKey } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
