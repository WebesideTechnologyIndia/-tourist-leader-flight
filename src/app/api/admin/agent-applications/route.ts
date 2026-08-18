import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { sendAgentApprovedEmail, sendAgentRejectedEmail } from "@/lib/mailer";
import { TL_CONTACT, type AgentDoc } from "@/lib/agent";

export const dynamic = "force-dynamic";

const baseUrl = () => (process.env.NEXT_PUBLIC_BASE_URL || "https://touristleader.vercel.app").replace(/\/$/, "");
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const EDITABLE = ["fullName", "agencyName", "email", "phone", "city", "state", "address", "gstNumber", "panNumber", "experience", "message"] as const;

export async function GET(req: NextRequest) {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("users.view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const status = req.nextUrl.searchParams.get("status");
  const where = status && status !== "ALL" ? { status } : {};
  const applications = await prisma.agentApplication.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ applications });
}

// Edit details/documents submitted by the agent.
export async function PATCH(req: NextRequest) {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("users.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await req.json();
  const id = str(b.id);
  if (!id) return NextResponse.json({ error: "Missing application id" }, { status: 400 });

  const data: Record<string, unknown> = {};
  for (const k of EDITABLE) if (k in b) data[k] = str(b[k]) || null;
  if (data.fullName === null) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  if (Array.isArray(b.documents)) {
    data.documents = (b.documents as AgentDoc[])
      .filter((d) => d && typeof d.url === "string" && d.url.trim())
      .map((d) => ({ label: str(d.label) || "Document", url: d.url.trim() }));
  }
  const app = await prisma.agentApplication.update({ where: { id }, data });
  return NextResponse.json({ ok: true, application: app });
}

// Approve / reject.
export async function POST(req: NextRequest) {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("users.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await req.json();
  const id = str(b.id);
  const action = str(b.action); // "approve" | "reject"
  const note = str(b.note);
  if (!id || !["approve", "reject"].includes(action)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const app = await prisma.agentApplication.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  if (action === "approve") {
    await prisma.agentApplication.update({ where: { id }, data: { status: "APPROVED", reviewNote: note || null, reviewedAt: new Date() } });
    if (app.userId) await prisma.user.update({ where: { id: app.userId }, data: { role: "AGENT" } }); // activates the agent panel
    sendAgentApprovedEmail({ name: app.fullName, email: app.email, loginUrl: `${baseUrl()}/` }).catch(() => {});
  } else {
    await prisma.agentApplication.update({ where: { id }, data: { status: "REJECTED", reviewNote: note || null, reviewedAt: new Date() } });
    // pull back agent access if it was previously granted
    if (app.userId) await prisma.user.update({ where: { id: app.userId }, data: { role: "USER" } });
    sendAgentRejectedEmail({ name: app.fullName, email: app.email, reason: note || undefined, contactEmail: TL_CONTACT.email, contactPhone: TL_CONTACT.phone }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
