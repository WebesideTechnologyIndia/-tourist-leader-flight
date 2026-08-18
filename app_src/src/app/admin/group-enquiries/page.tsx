"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Phone, Plane, Calendar, Users as UsersIcon, StickyNote, Check, X, Building2, Download, Globe2, BadgeCheck } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { GROUP_STATUSES, GROUP_STATUS_META, VISA_NOTE, documentSummary, type GroupPassenger, type JourneyType } from "@/lib/group";
import { formatDate, cn } from "@/lib/utils";

interface Group {
  id: string; enquiryNo: string; tripType: string; origin: string; destination: string;
  departDate: string; returnDate: string | null; cabinClass: string;
  journeyType: string; submittedBy: string;
  adults: number; children: number; infants: number;
  passengerNames: string[] | null; passengers: GroupPassenger[] | null;
  name: string; email: string; phone: string; company: string | null;
  message: string | null; note: string | null; status: string; createdAt: string;
}

export default function AdminGroupEnquiriesPage() {
  const [rows, setRows] = useState<Group[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [masked, setMasked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  const load = () => { setLoading(true); fetch("/api/admin/group-enquiries", { cache: "no-store" }).then((r) => r.json()).then((d) => { setRows(d.enquiries || []); setCanManage(!!d.canManage); setMasked(!!d.documentsMasked); }).finally(() => setLoading(false)); };
  useEffect(load, []);

  const patch = async (id: string, data: Partial<Group>) => {
    setRows((r) => r.map((x) => x.id === id ? { ...x, ...data } : x));
    await fetch("/api/admin/group-enquiries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) });
  };

  const counts = useMemo(() => { const c: Record<string, number> = { ALL: rows.length }; GROUP_STATUSES.forEach((s) => c[s] = rows.filter((r) => r.status === s).length); return c; }, [rows]);
  const filtered = rows.filter((e) => filter === "ALL" || e.status === filter);

  return (
    <AdminShell title="Bulk / Group Booking Enquiries">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
          {["ALL", ...GROUP_STATUSES].map((s) => <button key={s} onClick={() => setFilter(s)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-bold", filter === s ? "bg-brand text-white" : "bg-white text-slate-500 ring-1 ring-slate-200")}>{s === "ALL" ? "All" : GROUP_STATUS_META[s as keyof typeof GROUP_STATUS_META]?.label || s} {counts[s] ? <span className="opacity-70">{counts[s]}</span> : ""}</button>)}
        </div>
        {/* Exports whatever the status filter is showing, one row per traveller. */}
        <a
          href={`/api/admin/group-enquiries/export${filter === "ALL" ? "" : `?status=${filter}`}`}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
        >
          <Download size={13} /> Download Excel
        </a>
      </div>
      {masked && (
        <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
          Passport and ID numbers are partly hidden for your role. The Excel download is masked the same way.
        </p>
      )}

      {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div> : filtered.length === 0 ? (
        <p className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm">No group booking queries yet.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => {
            const total = e.adults + e.children + e.infants;
            const mix = `${e.adults} adult${e.adults !== 1 ? "s" : ""}${e.children ? `, ${e.children} child` : ""}${e.infants ? `, ${e.infants} infant` : ""}`;
            const names = e.passengerNames || [];
            const docs = e.passengers || [];
            const journeyType = (e.journeyType || "DOMESTIC") as JourneyType;
            const intl = journeyType === "INTERNATIONAL";
            return (
              <div key={e.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
                      <Plane size={16} className="text-brand" /> {e.origin} → {e.destination}
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">{e.enquiryNo}</span>
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">{e.tripType === "ROUND_TRIP" ? "Round trip" : "One way"} · {e.cabinClass}</span>
                      <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", intl ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600")}>
                        <Globe2 size={10} /> {intl ? "International" : "Domestic"}
                      </span>
                      {e.submittedBy === "AGENT" && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700"><BadgeCheck size={10} /> Agent</span>}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-slate-700"><UsersIcon size={11} /> {total} travellers</span>
                      <span className="text-slate-400">({mix})</span>
                      <span className="flex items-center gap-1"><Calendar size={11} /> {e.departDate}{e.returnDate ? ` → ${e.returnDate}` : ""}</span>
                      <span>{formatDate(e.createdAt)}</span>
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-400">
                      <span className="font-semibold text-slate-600">{e.name}</span>
                      {e.company && <span className="flex items-center gap-1"><Building2 size={11} /> {e.company}</span>}
                      <a href={`mailto:${e.email}`} className="flex items-center gap-1 hover:text-brand"><Mail size={11} /> {e.email}</a>
                      <a href={`tel:${e.phone}`} className="flex items-center gap-1 hover:text-brand"><Phone size={11} /> {e.phone}</a>
                    </p>
                    {docs.length > 0 ? (
                      <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Travellers &amp; documents ({docs.length})</p>
                        <ul className="space-y-0.5 text-xs text-slate-600">
                          {docs.map((p, i) => (
                            <li key={i} className="flex flex-wrap gap-x-2">
                              <span className="font-semibold text-slate-700">{i + 1}. {p.name}</span>
                              <span className="text-slate-400">{p.paxType?.toLowerCase()}</span>
                              <span>{documentSummary(p, journeyType) || <em className="text-amber-600">document pending</em>}</span>
                              {p.nationality && <span className="text-slate-400">· {p.nationality}</span>}
                            </li>
                          ))}
                        </ul>
                        {intl && <p className="mt-1.5 rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">{VISA_NOTE}</p>}
                      </div>
                    ) : names.length > 0 && (
                      <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Passenger names ({names.length})</p>
                        <p className="text-xs text-slate-600">{names.map((n, i) => `${i + 1}. ${n}`).join("  ·  ")}</p>
                      </div>
                    )}
                    {e.message && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{e.message}</p>}
                    {canManage && <NoteEditor value={e.note || ""} onSave={(note) => patch(e.id, { note })} />}
                  </div>
                  <select value={e.status} disabled={!canManage} onChange={(ev) => patch(e.id, { status: ev.target.value })} className={cn("shrink-0 rounded-lg border-0 px-2.5 py-1.5 text-xs font-bold outline-none ring-1 ring-slate-200", GROUP_STATUS_META[e.status as keyof typeof GROUP_STATUS_META]?.cls)}>
                    {GROUP_STATUSES.map((s) => <option key={s} value={s}>{GROUP_STATUS_META[s].label}</option>)}
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
