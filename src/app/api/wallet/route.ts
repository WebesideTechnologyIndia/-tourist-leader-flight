import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { ensureWallet } from "@/lib/billing";

export const dynamic = "force-dynamic";

/** The signed-in user's own wallet + recent transactions. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ wallet: null, transactions: [] });
  const wallet = await ensureWallet(user.id);
  const transactions = await prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const pending = transactions.filter((t) => t.status === "PENDING").reduce((a, t) => a + (t.type === "CREDIT" ? t.amount : 0), 0);
  return NextResponse.json({ wallet: { balance: wallet.balance, pending }, transactions });
}
