"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Phone, MapPin, Plane, Car, Home, HeartPulse, StickyNote, Check, X } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { INSURANCE_STATUSES, INSURANCE_TYPE_LABEL } from "@/lib/insurance";
import { formatDate, cn } from "@/lib/utils";

interface Ins { id: string; enquiryNo: string; type: string; name: string; email: string; phone: string; city: string | null; details: Record<string, string> | null; message: string | null; note: string | null; status: string; createdAt: string }
const STATUS_COLOR: Record<string, string> = { NEW: "bg-orange-100 text-orange-700", CONTACTED: "bg-sky-100 text-sky-700", QUOTED: "bg-violet-100 text-violet-700", ISSUED: "bg-emerald-100 text-emerald-700", CLOSED: "bg-slate-200 text-slate-600" };
const TYPE_ICON: Record<string, React.ElementType> = { TRAVEL: Plane, MOTOR: Car, HOUSE: Home, LIFE: HeartPulse };
const TABS = [["ALL", "All"], ["TRAVEL", "Travel"], ["MOTOR", "Motor"], ["HOUSE", "House"], ["LIFE", "Life"]] as const;

function detailLine(type: string, d: Record<string, string> | null): string {
  if (!d) return "";
  if (type === "TRAVEL") return [d.citizen, d.destination && `→ ${d.destination}`, (d.departure || d.return) && `${d.departure || "?"} → ${d.return || "?"}`, d.travellers && `${d.travellers} traveller(s)`].filter(Boolean).join(" · ");
  if (type === "MOTOR") return [d.vehicleType, d.registration, d.prevExpiry && `expiry ${d.prevExpiry}`].filter(Boolean).join(" · ");
  if (type === "HOUSE") return d.propertyKind || "";
  if (type === "LIFE") return d.age ? `Age ${d.age}` : "";
  return "";
}

export default function AdminInsuranceEnquiriesPage() {
  const [rows, setRows] = useState<Ins[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const load = () => { setLoading(true); fetch("/api/admin/insurance-enquiries", { cache: "no-store" }).then((r) => r.json()).then((d) => { setRows(d.enquiries || []); setCanManage(!!d.canManage); }).finally(() => setLoading(false)); };
  useEffect(load, []);

  const patch = async (id: string, data: Partial<Ins>) => {
    setRows((r) => r.map((x) => x.id === id ? { ...x, ...data } : x));
    await fetch("/api/admin/insurance-enquiries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) });
  };

  const filtered = useMemo(() => rows.filter((e) => (tab === "ALL" || e.type === tab) && (status === "ALL" || e.status === status)), [rows, tab, status]);

  return (
    <AdminShell title="Insurance Enquiries">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-100">
          {TABS.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold", tab === id ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-50")}>{label}</button>)}
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {["ALL", ...INSURANCE_STATUSES].map((s) => <button key={s} onClick={() => setStatus(s)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-bold", status === s ? "bg-slate-900 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200")}>{s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}</button>)}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div> : filtered.length === 0 ? (
        <p className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm">No insurance enquiries yet.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => {
            const Icon = TYPE_ICON[e.type] || Plane;
            return (
              <div key={e.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
                      <Icon size={16} className="text-brand" /> {INSURANCE_TYPE_LABEL[e.type] || e.type}
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">{e.enquiryNo}</span>
                    </p>
                    {detailLine(e.type, e.details) && <p className="mt-1 text-xs text-slate-500">{detailLine(e.type, e.details)}</p>}
                    <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-400">
                      <span className="font-semibold text-slate-600">{e.name}</span>
                      <a href={`mailto:${e.email}`} className="flex items-center gap-1 hover:text-brand"><Mail size={11} /> {e.email}</a>
                      <a href={`tel:${e.phone}`} className="flex items-center gap-1 hover:text-brand"><Phone size={11} /> {e.phone}</a>
                      {e.city && <span className="flex items-center gap-1"><MapPin size={11} /> {e.city}</span>}
                      <span>{formatDate(e.createdAt)}</span>
                    </p>
                    {e.message && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{e.message}</p>}
                    {canManage && <NoteEditor value={e.note || ""} onSave={(note) => patch(e.id, { note })} />}
                  </div>
                  <select value={e.status} disabled={!canManage} onChange={(ev) => patch(e.id, { status: ev.target.value })} className={cn("shrink-0 rounded-lg border-0 px-2.5 py-1.5 text-xs font-bold outline-none ring-1 ring-slate-200", STATUS_COLOR[e.status])}>
                    {INSURANCE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
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
