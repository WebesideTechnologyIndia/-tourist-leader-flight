import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtpToken, setSessionCookie, accessForUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, otpToken, name, phone, context } = await req.json();
    const e = (email || "").trim().toLowerCase();
    if (!e || !otp || !otpToken) {
      return NextResponse.json({ error: "Missing details" }, { status: 400 });
    }
    if (!verifyOtpToken(otpToken, e, String(otp).trim())) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
    }

    // Find or create the user (passwordless).
    let user = await prisma.user.findUnique({ where: { email: e }, select: { id: true, email: true, name: true, phone: true, role: true } });
    if (!user) {
      user = await prisma.user.create({
        data: { email: e, name: name?.trim() || null, phone: phone?.trim() || null },
        select: { id: true, email: true, name: true, phone: true, role: true },
      });
    } else if ((name?.trim() && !user.name) || (phone?.trim() && !user.phone)) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: user.name || name?.trim() || null, phone: user.phone || phone?.trim() || null },
        select: { id: true, email: true, name: true, phone: true, role: true },
      });
    }

    // Enforce login context by access tier:
    //  - /admin login  → admins only
    //  - / (customer)  → customers AND agents (admins must use /admin)
    const tier = await accessForUser(user.email, user.role); // "admin" | "agent" | "none"
    if (context === "admin" && tier !== "admin") {
      return NextResponse.json({ error: "Only admins can sign in here. Agents and customers sign in from the home page." }, { status: 403 });
    }
    if (context === "customer" && tier === "admin") {
      return NextResponse.json({ error: "This is an admin account. Please sign in from the admin panel at /admin." }, { status: 403 });
    }

    const { role: _role, ...safeUser } = user;
    await setSessionCookie(user.id);
    return NextResponse.json({ user: safeUser, tier });
  } catch (err) {
    console.error("[auth/otp/verify]", (err as Error).message);
    return NextResponse.json({ error: "Could not verify code" }, { status: 500 });
  }
}
