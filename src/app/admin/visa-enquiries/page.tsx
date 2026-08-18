"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Phone, Globe, Calendar, Users as UsersIcon, StickyNote, Check, X } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { VISA_STATUSES } from "@/lib/visa";
import { formatDate, cn } from "@/lib/utils";

interface Visa { id: string; enquiryNo: string; country: string; purpose: string; travellers: number; onwardDate: string | null; returnDate: string | null; name: string; email: string; phone: string; message: string | null; note: string | null; status: string; createdAt: string }
const STATUS_COLOR: Record<string, string> = { NEW: "bg-orange-100 text-orange-700", CONTACTED: "bg-sky-100 text-sky-700", PROCESSING: "bg-violet-100 text-violet-700", APPROVED: "bg-emerald-100 text-emerald-700", CLOSED: "bg-slate-200 text-slate-600" };

export default function AdminVisaEnquiriesPage() {
  const [rows, setRows] = useState<Visa[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  const load = () => { setLoading(true); fetch("/api/admin/visa-enquiries", { cache: "no-store" }).then((r) => r.json()).then((d) => { setRows(d.enquiries || []); setCanManage(!!d.canManage); }).finally(() => setLoading(false)); };
  useEffect(load, []);

  const patch = async (id: string, data: Partial<Visa>) => {
    setRows((r) => r.map((x) => x.id === id ? { ...x, ...data } : x));
    await fetch("/api/admin/visa-enquiries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) });
  };

  const counts = useMemo(() => { const c: Record<string, number> = { ALL: rows.length }; VISA_STATUSES.forEach((s) => c[s] = rows.filter((r) => r.status === s).length); return c; }, [rows]);
  const filtered = rows.filter((e) => filter === "ALL" || e.status === filter);

  return (
    <AdminShell title="Visa Enquiries">
      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto">
        {["ALL", ...VISA_STATUSES].map((s) => <button key={s} onClick={() => setFilter(s)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-bold", filter === s ? "bg-brand text-white" : "bg-white text-slate-500 ring-1 ring-slate-200")}>{s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()} {counts[s] ? <span className="opacity-70">{counts[s]}</span> : ""}</button>)}
      </div>

      {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div> : filtered.length === 0 ? (
        <p className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm">No visa enquiries yet.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <div key={e.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
                    <Globe size={16} className="text-brand" /> {e.country}
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">{e.enquiryNo}</span>
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">{e.purpose}</span>
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><UsersIcon size={11} /> {e.travellers} traveller{e.travellers > 1 ? "s" : ""}</span>
                    <span className="flex items-center gap-1"><Calendar size={11} /> {e.onwardDate || "Flexible"}{e.returnDate ? ` → ${e.returnDate}` : ""}</span>
                    <span>{formatDate(e.createdAt)}</span>
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-400">
                    <span className="font-semibold text-slate-600">{e.name}</span>
                    <a href={`mailto:${e.email}`} className="flex items-center gap-1 hover:text-brand"><Mail size={11} /> {e.email}</a>
                    <a href={`tel:${e.phone}`} className="flex items-center gap-1 hover:text-brand"><Phone size={11} /> {e.phone}</a>
                  </p>
                  {e.message && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{e.message}</p>}
                  {canManage && <NoteEditor value={e.note || ""} onSave={(note) => patch(e.id, { note })} />}
                </div>
                <select value={e.status} disabled={!canManage} onChange={(ev) => patch(e.id, { status: ev.target.value })} className={cn("shrink-0 rounded-lg border-0 px-2.5 py-1.5 text-xs font-bold outline-none ring-1 ring-slate-200", STATUS_COLOR[e.status])}>
                  {VISA_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

function NoteEditor({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  if (!editing) return (
    <button onClick={() => { setText(value); setEditing(true); }} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-brand">
      <StickyNote size={12} /> {value ? <span className="font-normal text-slate-500">{value}</span> : "Add internal note"}
    </button>
  );
  return (
    <div className="mt-2 flex items-center gap-2">
      <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Internal note" className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-brand" />
      <button onClick={() => { onSave(text); setEditing(false); }} className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-white"><Check size={13} /></button>
      <button onClick={() => setEditing(false)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={13} /></button>
    </div>
  );
}
