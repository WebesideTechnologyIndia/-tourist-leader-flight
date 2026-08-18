"use client";
import { useEffect, useState } from "react";
import { Loader2, Wallet, IndianRupee, Check, History } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { formatINR, formatDate, cn } from "@/lib/utils";

interface Agent { id: string; name: string; email: string; state: string | null; balance: number; pending: number; totalEarned: number; bookings: number }
interface Settlement { id: string; agentId: string; agentName: string; amount: number; note: string | null; createdAt: string }

export default function AdminSettlementsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/settlements", { cache: "no-store" }).then((r) => r.json()).then((d) => { setAgents(d.agents || []); setSettlements(d.settlements || []); }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const settle = async (a: Agent) => {
    if (!confirm(`Settle ${formatINR(a.pending)} commission to ${a.name}? This records the payout and clears their pending commission.`)) return;
    setBusy(a.id);
    const res = await fetch("/api/admin/settlements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentId: a.id }) });
    if (!res.ok) { const d = await res.json(); alert(d.error || "Could not settle"); }
    setBusy(""); load();
  };

  const totalOwed = agents.reduce((a, x) => a + x.pending, 0);

  return (
    <AdminShell title="Settlements">
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Stat icon={Wallet} color="from-amber-500 to-orange-600" label="Total owed to agents" value={formatINR(totalOwed)} />
        <Stat icon={IndianRupee} color="from-emerald-500 to-teal-600" label="Agents" value={String(agents.length)} />
        <Stat icon={History} color="from-sky-500 to-blue-600" label="Settlements made" value={String(settlements.length)} />
      </div>

      {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div> : (
        <>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400"><th className="px-4 py-3">Agent</th><th className="px-4 py-3">Bookings</th><th className="px-4 py-3">Total earned</th><th className="px-4 py-3">Commission owed</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3"><p className="font-semibold text-slate-800">{a.name}</p><p className="text-xs text-slate-400">{a.email}{a.state ? ` · ${a.state}` : ""}</p></td>
                    <td className="px-4 py-3 text-slate-600">{a.bookings}</td>
                    <td className="px-4 py-3 text-slate-600">{formatINR(a.totalEarned)}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{formatINR(a.pending)}</td>
                    <td className="px-4 py-3 text-right">
                      {a.pending > 0 ? <Button size="sm" onClick={() => settle(a)} disabled={busy === a.id}>{busy === a.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Settle</Button> : <span className="text-xs text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
                {agents.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No agents yet. Assign the Agent role to a user.</td></tr>}
              </tbody>
            </table>
          </div>

          {settlements.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 font-bold text-slate-900">Recent settlements</h3>
              <div className="space-y-2">
                {settlements.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-100">
                    <div><span className="font-semibold text-slate-800">{s.agentName}</span><span className="ml-2 text-xs text-slate-400">{formatDate(s.createdAt)}{s.note ? ` · ${s.note}` : ""}</span></div>
                    <span className="font-bold text-emerald-600">{formatINR(s.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}

function Stat({ icon: Icon, color, label, value }: { icon: React.ElementType; color: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <span className={cn("grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white", color)}><Icon size={20} /></span>
      <p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
