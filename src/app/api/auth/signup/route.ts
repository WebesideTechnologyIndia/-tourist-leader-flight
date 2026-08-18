import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password } = await req.json();
    const e = (email || "").trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email: e } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    const user = await prisma.user.create({
      data: { email: e, name: name?.trim() || null, phone: phone?.trim() || null, passwordHash: await hashPassword(password) },
      select: { id: true, email: true, name: true, phone: true },
    });
    await setSessionCookie(user.id);
    return NextResponse.json({ user });
  } catch (err) {
    console.error("[auth/signup]", (err as Error).message);
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}
