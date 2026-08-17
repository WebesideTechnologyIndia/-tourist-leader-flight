"use client";
import { useEffect, useState } from "react";
import { Wallet, ArrowDownLeft, ArrowUpRight, Loader2, Clock } from "lucide-react";
import { formatINR, formatDate, formatTime, cn } from "@/lib/utils";

export interface WalletTxn { id: string; type: "CREDIT" | "DEBIT"; amount: number; reason: string; status: string; note: string | null; balanceAfter: number; createdAt: string }
const REASON_LABEL: Record<string, string> = { TOPUP: "Money added", BOOKING: "Booking payment", REFUND: "Refund", COMMISSION: "Commission earned", SETTLEMENT: "Settled by admin", ADJUSTMENT: "Adjustment" };

export function WalletView({ pendingLabel = "Pending settlement", action, onLoaded, wide = false }: { pendingLabel?: string; action?: React.ReactNode; onLoaded?: (balance: number) => void; wide?: boolean }) {
  const [balance, setBalance] = useState(0);
  const [pending, setPending] = useState(0);
  const [txns, setTxns] = useState<WalletTxn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wallet", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      setBalance(d.wallet?.balance || 0); setPending(d.wallet?.pending || 0); setTxns(d.transactions || []);
      onLoaded?.(d.wallet?.balance || 0);
    }).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("space-y-4", wide && "lg:grid lg:grid-cols-[340px_1fr] lg:gap-4 lg:space-y-0 lg:items-start")}>
      <div className={cn("rounded-2xl bg-gradient-to-br from-brand to-sky-500 p-5 text-white shadow-sm")}>
        <div className="flex items-center gap-2 text-sm text-white/85"><Wallet size={18} /> Wallet balance</div>
        <p className="mt-1 text-3xl font-extrabold sm:text-4xl">{formatINR(balance)}</p>
        {pending > 0 && <p className="mt-1.5 flex items-center gap-1 text-xs text-white/80"><Clock size={12} /> {pendingLabel}: {formatINR(pending)}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h3 className="mb-2 font-bold text-slate-900">Transactions</h3>
        {loading ? <div className="flex justify-center py-10 text-slate-400"><Loader2 className="animate-spin" /></div> :
          txns.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No transactions yet.</p> : (
          <div className="divide-y divide-slate-50">
            {txns.map((t) => {
              const credit = t.type === "CREDIT";
              return (
                <div key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", credit ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500")}>{credit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{REASON_LABEL[t.reason] || t.reason}{t.status === "PENDING" && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">Pending</span>}</p>
                    <p className="truncate text-xs text-slate-400">{t.note || formatDate(t.createdAt)} · {formatTime(t.createdAt)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("text-sm font-bold", credit ? "text-emerald-600" : "text-rose-500")}>{credit ? "+" : "−"}{formatINR(t.amount)}</p>
                    <p className="text-[10px] text-slate-400">Bal {formatINR(t.balanceAfter)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
