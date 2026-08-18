"use client";
import { useEffect, useState } from "react";
import { Wallet, Check } from "lucide-react";
import { formatINR, cn } from "@/lib/utils";

/** Shows the user's wallet balance and lets them pay from it (if sufficient). */
export function WalletPayToggle({ total, value, onChange }: { total: number; value: boolean; onChange: (v: boolean) => void }) {
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => { fetch("/api/wallet", { cache: "no-store" }).then((r) => r.json()).then((d) => setBalance(d.wallet?.balance ?? 0)).catch(() => setBalance(0)); }, []);
  if (balance === null || balance <= 0) return null;
  const enough = balance >= total;
  return (
    <button type="button" disabled={!enough} onClick={() => onChange(!value)}
      className={cn("flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors disabled:opacity-60",
        value ? "border-brand bg-brand/5" : "border-slate-200 bg-white hover:border-brand/40")}>
      <span className={cn("grid h-10 w-10 place-items-center rounded-lg", value ? "bg-brand text-white" : "bg-brand/10 text-brand")}><Wallet size={20} /></span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-slate-800">Pay from Tourist Leader Wallet</span>
        <span className="block text-xs text-slate-400">Balance {formatINR(balance)}{!enough ? " · insufficient for this booking" : ""}</span>
      </span>
      {enough && <span className={cn("grid h-5 w-5 place-items-center rounded-full border-2", value ? "border-brand bg-brand text-white" : "border-slate-300")}>{value && <Check size={12} />}</span>}
    </button>
  );
}
