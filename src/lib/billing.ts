import { prisma } from "./prisma";
import { DEFAULT_BILLING, type BillingConfigData } from "./billing-core";

/** Read the singleton billing config, creating it with defaults on first use. */
export async function getBillingConfig(): Promise<BillingConfigData> {
  try {
    const row = await prisma.billingConfig.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", ...DEFAULT_BILLING },
    });
    return {
      serviceChargeType: row.serviceChargeType === "PERCENT" ? "PERCENT" : "FLAT",
      serviceChargeValue: row.serviceChargeValue,
      companyState: row.companyState,
      igstRate: row.igstRate,
      cgstRate: row.cgstRate,
      sgstRate: row.sgstRate,
      gstEnabled: row.gstEnabled,
      agentCommissionPercent: row.agentCommissionPercent,
      commissionGstApplicable: row.commissionGstApplicable,
    };
  } catch {
    return DEFAULT_BILLING;
  }
}

/** Ensure a wallet row exists for a user and return it. */
export async function ensureWallet(userId: string) {
  return prisma.wallet.upsert({ where: { userId }, update: {}, create: { userId, balance: 0 } });
}

/**
 * Atomically credit/debit a wallet and record a transaction.
 * Returns the new balance, or null if a DEBIT would overdraw.
 */
export async function walletTxn(opts: {
  userId: string; type: "CREDIT" | "DEBIT"; amount: number; reason: string;
  refType?: string; refId?: string; note?: string; status?: string;
}): Promise<{ balance: number; txnId: string } | null> {
  const amount = Math.round(opts.amount);
  if (amount <= 0) return null;
  const wallet = await ensureWallet(opts.userId);
  // PENDING credits (e.g. agent commission awaiting settlement) are recorded but
  // are NOT spendable — they must not inflate the wallet balance. They show as
  // "on hold" until an admin settles them.
  const isPending = (opts.status || "COMPLETED") === "PENDING";
  const delta = isPending ? 0 : opts.type === "CREDIT" ? amount : -amount;
  const newBalance = wallet.balance + delta;
  if (newBalance < 0) return null; // insufficient funds

  const [, txn] = await prisma.$transaction([
    prisma.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }),
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id, userId: opts.userId, type: opts.type, amount,
        reason: opts.reason, status: opts.status || "COMPLETED",
        refType: opts.refType || null, refId: opts.refId || null, note: opts.note || null,
        balanceAfter: newBalance,
      },
    }),
  ]);
  return { balance: newBalance, txnId: txn.id };
}
