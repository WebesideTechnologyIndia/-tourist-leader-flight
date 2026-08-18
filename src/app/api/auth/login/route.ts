import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const e = (email || "").trim().toLowerCase();
    if (!e || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email: e } });
    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    await setSessionCookie(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, phone: user.phone } });
  } catch (err) {
    console.error("[auth/login]", (err as Error).message);
    return NextResponse.json({ error: "Could not sign in" }, { status: 500 });
  }
}
