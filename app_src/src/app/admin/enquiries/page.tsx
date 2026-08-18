"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Phone, Plus, X, UserCheck, StickyNote, Check } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { formatDate, cn } from "@/lib/utils";

interface Enquiry { id: string; enquiryNo: string; packageTitle: string; name: string; email: string; phone: string; travelMonth: string | null; adults: number; children: number; message: string | null; note: string | null; status: string; source: string; assignedTo: string | null; assignedName: string | null; createdAt: string }
interface Agent { id: string; name: string; email: string; superAdmin: boolean }
const STATUSES = ["NEW", "CONTACTED", "QUOTED", "BOOKED", "CLOSED"];
const STATUS_COLOR: Record<string, string> = { NEW: "bg-orange-100 text-orange-700", CONTACTED: "bg-sky-100 text-sky-700", QUOTED: "bg-violet-100 text-violet-700", BOOKED: "bg-emerald-100 text-emerald-700", CLOSED: "bg-slate-200 text-slate-600" };
const SOURCES = ["WEB", "PHONE", "WALK_IN", "REFERRAL", "SOCIAL"];
const SOURCE_LABEL: Record<string, string> = { WEB: "Website", PHONE: "Phone", WALK_IN: "Walk-in", REFERRAL: "Referral", SOCIAL: "Social" };

export default function AdminEnquiriesPage() {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [meId, setMeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [mine, setMine] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/enquiries", { cache: "no-store" }).then((r) => r.json()).then((d) => { setRows(d.enquiries || []); setAgents(d.agents || []); setCanManage(!!d.canManage); }).finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => { fetch("/api/admin/me", { cache: "no-store" }).then((r) => r.json()).then((d) => setMeId(d.user?.id || "")); }, []);

  const patch = async (id: string, data: Partial<Enquiry>) => {
    setRows((r) => r.map((x) => x.id === id ? { ...x, ...data } : x));
    await fetch("/api/admin/enquiries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) });
  };

  const counts = useMemo(() => { const c: Record<string, number> = { ALL: rows.length }; STATUSES.forEach((s) => c[s] = rows.filter((r) => r.status === s).length); return c; }, [rows]);
  const filtered = rows.filter((e) => (filter === "ALL" || e.status === filter) && (!mine || e.assignedTo === meId));

  return (
    <AdminShell title="Package Enquiries">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {["ALL", ...STATUSES].map((s) => <button key={s} onClick={() => setFilter(s)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-bold", filter === s ? "bg-brand text-white" : "bg-white text-slate-500 ring-1 ring-slate-200")}>{s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()} {counts[s] ? <span className="opacity-70">{counts[s]}</span> : ""}</button>)}
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="accent-[var(--brand)]" /> My leads</label>
        {canManage && <Button size="sm" className="ml-auto" onClick={() => setShowNew(true)}><Plus size={15} /> New Lead</Button>}
      </div>

      {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div> : filtered.length === 0 ? (
        <p className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm">No leads here yet.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <div key={e.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-bold text-slate-900">{e.packageTitle}
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">{e.enquiryNo}</span>
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">{SOURCE_LABEL[e.source] || e.source}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">{e.name} · {e.adults} adults{e.children ? `, ${e.children} children` : ""} · Travel: {e.travelMonth || "Flexible"}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-400">
                    <a href={`mailto:${e.email}`} className="flex items-center gap-1 hover:text-brand"><Mail size={11} /> {e.email || "—"}</a>
                    <a href={`tel:${e.phone}`} className="flex items-center gap-1 hover:text-brand"><Phone size={11} /> {e.phone || "—"}</a>
                    <span>{formatDate(e.createdAt)}</span>
                  </p>
                  {e.message && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{e.message}</p>}
                  {canManage && <NoteEditor value={e.note || ""} onSave={(note) => patch(e.id, { note })} />}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <select value={e.status} disabled={!canManage} onChange={(ev) => patch(e.id, { status: ev.target.value })} className={cn("rounded-lg border-0 px-2.5 py-1.5 text-xs font-bold outline-none ring-1 ring-slate-200", STATUS_COLOR[e.status])}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <UserCheck size={13} className="text-slate-400" />
                    <select value={e.assignedTo || ""} disabled={!canManage} onChange={(ev) => patch(e.id, { assignedTo: ev.target.value })} className="max-w-[140px] rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand">
                      <option value="">Unassigned</option>
                      {agents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.id === meId ? " (me)" : ""}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && <NewLeadModal agents={agents} meId={meId} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />}
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
      <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Internal note (agents only)" className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-brand" />
      <button onClick={() => { onSave(text); setEditing(false); }} className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-white"><Check size={13} /></button>
      <button onClick={() => setEditing(false)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={13} /></button>
    </div>
  );
}

function NewLeadModal({ agents, meId, onClose, onSaved }: { agents: Agent[]; meId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", packageTitle: "", travelMonth: "", adults: "2", children: "0", source: "PHONE", assignedTo: meId, message: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setError(""); setSaving(true);
    const res = await fetch("/api/admin/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await res.json(); setSaving(false);
    if (res.ok) onSaved(); else setError(d.error || "Could not save");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><Plus size={20} className="text-brand" /> New Lead</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <L label="Customer name *"><input value={f.name} onChange={(e) => set("name", e.target.value)} className="inp" placeholder="Full name" /></L>
            <L label="Source"><select value={f.source} onChange={(e) => set("source", e.target.value)} className="inp">{SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}</select></L>
            <L label="Email"><input value={f.email} onChange={(e) => set("email", e.target.value)} className="inp" placeholder="email@…" /></L>
            <L label="Phone"><input value={f.phone} onChange={(e) => set("phone", e.target.value)} className="inp" placeholder="+91…" /></L>
            <L label="Package / interest"><input value={f.packageTitle} onChange={(e) => set("packageTitle", e.target.value)} className="inp" placeholder="e.g. Bali honeymoon" /></L>
            <L label="Travel month"><input value={f.travelMonth} onChange={(e) => set("travelMonth", e.target.value)} className="inp" placeholder="e.g. Dec 2026" /></L>
            <L label="Adults"><input type="number" min={1} value={f.adults} onChange={(e) => set("adults", e.target.value)} className="inp" /></L>
            <L label="Children"><input type="number" min={0} value={f.children} onChange={(e) => set("children", e.target.value)} className="inp" /></L>
            <L label="Assign to"><select value={f.assignedTo} onChange={(e) => set("assignedTo", e.target.value)} className="inp"><option value="">Unassigned</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.id === meId ? " (me)" : ""}</option>)}</select></L>
          </div>
          <L label="Requirement / message"><textarea value={f.message} onChange={(e) => set("message", e.target.value)} rows={2} className="inp resize-none" placeholder="What the customer is looking for…" /></L>
          <L label="Internal note (optional)"><input value={f.note} onChange={(e) => set("note", e.target.value)} className="inp" placeholder="Agent note" /></L>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>}
        </div>
        <div className="flex gap-2 border-t border-slate-100 p-4">
          <Button className="flex-1" onClick={save} disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : null} Create Lead</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
      <style>{`.inp{width:100%;border:1px solid #e2e8f0;border-radius:0.6rem;padding:0.5rem 0.7rem;font-size:0.875rem;outline:none}.inp:focus{border-color:var(--brand)}`}</style>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}
