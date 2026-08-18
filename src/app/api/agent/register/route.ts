import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendAgentApplicationEmails } from "@/lib/mailer";
import type { AgentDoc } from "@/lib/agent";

export const dynamic = "force-dynamic";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const email = str(b.email).toLowerCase();
    const fullName = str(b.fullName);
    const phone = str(b.phone);
    if (!email || !/.+@.+\..+/.test(email)) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    if (!fullName) return NextResponse.json({ error: "Your full name is required" }, { status: 400 });
    if (!phone) return NextResponse.json({ error: "Your phone number is required" }, { status: 400 });

    const documents: AgentDoc[] = Array.isArray(b.documents)
      ? b.documents.filter((d: AgentDoc) => d && typeof d.url === "string" && d.url).map((d: AgentDoc) => ({ label: str(d.label) || "Document", url: d.url }))
      : [];

    // Find or create the user (passwordless — stays a normal USER until approved).
    let user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (user && (user.role === "AGENT" || user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
      return NextResponse.json({ error: "This email already has an active Tourist Leader staff/agent account." }, { status: 409 });
    }
    if (!user) {
      user = await prisma.user.create({ data: { email, name: fullName, phone }, select: { id: true, role: true } });
    }

    // One application per user — block duplicate pending/approved, allow re-submit if rejected.
    const existing = await prisma.agentApplication.findUnique({ where: { userId: user.id } });
    if (existing && existing.status !== "REJECTED") {
      return NextResponse.json({ error: "You already have an application " + (existing.status === "APPROVED" ? "that's approved." : "under review.") }, { status: 409 });
    }

    const data = {
      userId: user.id,
      fullName, email, phone,
      agencyName: str(b.agencyName) || null,
      city: str(b.city) || null,
      state: str(b.state) || null,
      address: str(b.address) || null,
      gstNumber: str(b.gstNumber) || null,
      panNumber: str(b.panNumber) || null,
      experience: str(b.experience) || null,
      message: str(b.message) || null,
      documents: documents as unknown as Prisma.InputJsonValue,
      status: "PENDING",
      reviewNote: null,
      reviewedAt: null,
    };

    const app = existing
      ? await prisma.agentApplication.update({ where: { id: existing.id }, data })
      : await prisma.agentApplication.create({ data });

    sendAgentApplicationEmails({ applicationId: app.id, name: fullName, email, phone, agencyName: data.agencyName || undefined, city: data.city || undefined }).catch(() => {});

    return NextResponse.json({ ok: true, id: app.id });
  } catch (err) {
    console.error("[agent/register]", (err as Error).message);
    return NextResponse.json({ error: "Could not submit your registration" }, { status: 500 });
  }
}
