import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { getBillingConfig } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("settings.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const config = await getBillingConfig();
  return NextResponse.json({ config });
}

const num = (v: unknown, d = 0) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : d; };

export async function PUT(req: NextRequest) {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("settings.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await req.json();
  const data = {
    serviceChargeType: b.serviceChargeType === "PERCENT" ? "PERCENT" : "FLAT",
    serviceChargeValue: num(b.serviceChargeValue),
    companyState: String(b.companyState || "Karnataka").trim() || "Karnataka",
    igstRate: num(b.igstRate, 18),
    cgstRate: num(b.cgstRate, 9),
    sgstRate: num(b.sgstRate, 9),
    gstEnabled: b.gstEnabled !== false,
    agentCommissionPercent: num(b.agentCommissionPercent),
    commissionGstApplicable: b.commissionGstApplicable !== false,
  };
  await prisma.billingConfig.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
  return NextResponse.json({ ok: true, config: data });
}
