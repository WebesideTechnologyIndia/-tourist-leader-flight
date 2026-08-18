import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** List agents (roles with bookings access but not admin tier) with their wallet balance + recent settlements. */
export async function GET() {
  const { ok, permissions, user: me } = await isAdmin();
  if (!ok || !permissions.includes("settlements.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // agent roles = roles that grant bookings.view but NOT packages.manage/users.* (i.e. not admin tier)
  const roles = await prisma.role.findMany();
  const agentRoleKeys = roles
    .filter((r) => Array.isArray(r.permissions) && (r.permissions as string[]).includes("bookings.view") && !(r.permissions as string[]).some((p) => ["packages.manage", "users.view", "roles.manage"].includes(p)))
    .map((r) => r.key);

  const agents = await prisma.user.findMany({
    where: { role: { in: agentRoleKeys.length ? agentRoleKeys : ["__none__"] } },
    select: { id: true, name: true, email: true, state: true, wallet: { select: { balance: true } } },
    orderBy: { name: "asc" },
  });

  // commission earned this period + booking counts
  const list = await Promise.all(agents.map(async (a) => {
    const earned = await prisma.walletTransaction.aggregate({ _sum: { amount: true }, where: { userId: a.id, reason: "COMMISSION" } });
    // Only PENDING commission is owed/settle-able; settled commission has already been paid out.
    const pendingAgg = await prisma.walletTransaction.aggregate({ _sum: { amount: true }, where: { userId: a.id, reason: "COMMISSION", status: "PENDING", type: "CREDIT" } });
    const bookings = await prisma.booking.count({ where: { bookedByAgentId: a.id } });
    return { id: a.id, name: a.name || a.email.split("@")[0], email: a.email, state: a.state, balance: a.wallet?.balance || 0, pending: Math.round(pendingAgg._sum.amount || 0), totalEarned: earned._sum.amount || 0, bookings };
  }));

  const settlements = await prisma.settlement.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  const agentName: Record<string, string> = Object.fromEntries(list.map((a) => [a.id, a.name]));
  return NextResponse.json({ agents: list, settlements: settlements.map((s) => ({ ...s, agentName: agentName[s.agentId] || s.agentId })), meId: me?.id });
}

/** Settle an agent: pay out their wallet balance (records a Settlement, debits wallet to zero). */
export async function POST(req: NextRequest) {
  const { ok, permissions, user: me } = await isAdmin();
  if (!ok || !permissions.includes("settlements.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { agentId, note } = await req.json();
  if (!agentId) return NextResponse.json({ error: "Missing agent" }, { status: 400 });
  // Settle the agent's PENDING commission (it was never part of the spendable balance).
  const pendingAgg = await prisma.walletTransaction.aggregate({ _sum: { amount: true }, where: { userId: agentId, reason: "COMMISSION", status: "PENDING", type: "CREDIT" } });
  const amount = Math.round(pendingAgg._sum.amount || 0);
  if (amount <= 0) return NextResponse.json({ error: "Nothing to settle" }, { status: 400 });

  await prisma.settlement.create({ data: { agentId, amount, note: (note || "").trim() || null, createdBy: me?.id || null } });
  // Mark that commission as settled (paid out externally) — the spendable wallet balance is untouched.
  await prisma.walletTransaction.updateMany({ where: { userId: agentId, reason: "COMMISSION", status: "PENDING" }, data: { status: "SETTLED" } });
  return NextResponse.json({ ok: true, amount });
}
