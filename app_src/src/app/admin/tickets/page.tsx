"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Mail, Phone, Tag, ArrowLeft, AlertTriangle } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { TicketThread, type TicketData, type TMessage } from "@/components/support/TicketThread";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];
const STATUS_COLOR: Record<string, string> = { OPEN: "bg-rose-100 text-rose-700", IN_PROGRESS: "bg-amber-100 text-amber-700", RESOLVED: "bg-emerald-100 text-emerald-700", CLOSED: "bg-slate-200 text-slate-600" };
const PRIO_DOT: Record<string, string> = { LOW: "bg-slate-300", NORMAL: "bg-sky-400", HIGH: "bg-orange-500", URGENT: "bg-rose-500" };

export default function AdminTicketsPage() {
  const [rows, setRows] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("ALL");

  const load = () => { setLoading(true); fetch("/api/admin/tickets", { cache: "no-store" }).then((r) => r.json()).then((d) => setRows(d.tickets || [])).finally(() => setLoading(false)); };
  useEffect(load, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return rows.filter((t) => (filter === "ALL" || t.status === filter) && (!s || `${t.ticketNo} ${t.subject} ${t.name} ${t.email}`.toLowerCase().includes(s)));
  }, [rows, q, filter]);

  const active = rows.find((t) => t.id === sel) || null;

  const patch = async (id: string, data: { status?: string; priority?: string }) => {
    setRows((r) => r.map((t) => t.id === id ? { ...t, ...data } : t));
    await fetch("/api/admin/tickets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) });
  };
  const onSent = (id: string, m: TMessage) => setRows((r) => r.map((t) => t.id === id ? { ...t, messages: [...(t.messages || []), m], status: t.status === "OPEN" ? "IN_PROGRESS" : t.status } : t));

  return (
    <AdminShell title="Support Tickets">
      <div className="grid h-[calc(100vh-9rem)] gap-4 lg:grid-cols-[360px_1fr]">
        {/* List */}
        <div className={cn("flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100", active && "hidden lg:flex")}>
          <div className="border-b border-slate-100 p-3">
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2"><Search size={15} className="text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tickets…" className="w-full bg-transparent text-sm outline-none" /></div>
            <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
              {["ALL", ...STATUSES].map((s) => <button key={s} onClick={() => setFilter(s)} className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", filter === s ? "bg-brand text-white" : "bg-slate-100 text-slate-500")}>{s.replace("_", " ")}</button>)}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div> :
              filtered.length === 0 ? <p className="py-16 text-center text-sm text-slate-400">No tickets.</p> :
              filtered.map((t) => (
                <button key={t.id} onClick={() => setSel(t.id)} className={cn("block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50", sel === t.id && "bg-brand/5")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className={cn("h-2 w-2 rounded-full", PRIO_DOT[t.priority || "NORMAL"])} /> {t.ticketNo}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", STATUS_COLOR[t.status])}>{t.status.replace("_", " ")}</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-800">{t.subject}</p>
                  <p className="truncate text-xs text-slate-400">{t.name} · {t.category} · {formatDate(t.createdAt)}</p>
                </button>
              ))}
          </div>
        </div>

        {/* Conversation */}
        <div className={cn("flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100", !active && "hidden lg:flex")}>
          {!active ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Select a ticket to view the conversation</div>
          ) : (
            <>
              <div className="border-b border-slate-100 p-4">
                <button onClick={() => setSel(null)} className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-500 lg:hidden"><ArrowLeft size={15} /> Back</button>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{active.subject}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-400">
                      <span>{active.ticketNo}</span>
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 font-bold text-brand">{active.category}</span>
                      {active.bookingRef && <span className="flex items-center gap-1"><Tag size={11} /> {active.bookingRef}</span>}
                      <span className="flex items-center gap-1"><Mail size={11} /> {active.email}</span>
                      {active.phone && <span className="flex items-center gap-1"><Phone size={11} /> {active.phone}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={active.priority || "NORMAL"} onChange={(e) => patch(active.id, { priority: e.target.value })} title="Priority" className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold outline-none">{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select>
                    <select value={active.status} onChange={(e) => patch(active.id, { status: e.target.value })} className={cn("rounded-lg border-0 px-2.5 py-1.5 text-xs font-bold outline-none ring-1 ring-slate-200", STATUS_COLOR[active.status])}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select>
                  </div>
                </div>
                {active.priority === "URGENT" && <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600"><AlertTriangle size={13} /> Marked urgent — respond promptly.</p>}
              </div>
              <div className="flex-1 overflow-hidden p-4">
                <TicketThread ticket={active} role="ADMIN" onSent={(m) => onSent(active.id, m)} />
              </div>
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
