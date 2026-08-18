"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Check, X, ExternalLink, Save, UserCheck, Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AGENT_DETAIL_FIELDS, type AgentDoc } from "@/lib/agent";
import { formatDate, cn } from "@/lib/utils";

interface App {
  id: string; fullName: string; agencyName?: string | null; email: string; phone: string;
  city?: string | null; state?: string | null; address?: string | null; gstNumber?: string | null;
  panNumber?: string | null; experience?: string | null; message?: string | null;
  documents?: AgentDoc[] | null; status: string; reviewNote?: string | null; createdAt: string;
}
const TABS = [["ALL", "All"], ["PENDING", "Pending"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"]] as const;
const STATUS_CLS: Record<string, string> = { PENDING: "bg-amber-100 text-amber-700", APPROVED: "bg-emerald-100 text-emerald-700", REJECTED: "bg-rose-100 text-rose-700" };

export default function AgentApplicationsPage() {
  const [rows, setRows] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("PENDING");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<App | null>(null);

  const load = (t = tab) => {
    setLoading(true);
    fetch(`/api/admin/agent-applications${t !== "ALL" ? `?status=${t}` : ""}`, { cache: "no-store" })
      .then((r) => r.json()).then((d) => setRows(d.applications || [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(tab); /* eslint-disable-next-line */ }, [tab]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return rows;
    return rows.filter((a) => `${a.fullName} ${a.agencyName} ${a.email} ${a.phone} ${a.city}`.toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <AdminShell title="Agent Applications">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-100">
          {TABS.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", tab === id ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-50")}>{label}</button>)}
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
          <Search size={15} className="text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, city…" className="w-44 bg-transparent text-sm outline-none sm:w-56" />
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div> : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Applicant</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Docs</th><th className="px-4 py-3">Applied</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3"><p className="font-semibold text-slate-900">{a.fullName}</p><p className="text-xs text-slate-400">{a.agencyName || "—"}</p></td>
                  <td className="px-4 py-3"><p className="text-slate-700">{a.email}</p><p className="text-xs text-slate-400">{a.phone}</p></td>
                  <td className="px-4 py-3 text-slate-600">{a.city || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{a.documents?.length || 0}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(a.createdAt)}</td>
                  <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", STATUS_CLS[a.status] || "bg-slate-100 text-slate-500")}>{a.status}</span></td>
                  <td className="px-4 py-3 text-right"><button onClick={() => setSel(a)} className="rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand/20">Review</button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No applications.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {sel && <ReviewModal app={sel} onClose={() => setSel(null)} onChanged={() => { setSel(null); load(); }} />}
    </AdminShell>
  );
}

function ReviewModal({ app, onClose, onChanged }: { app: App; onClose: () => void; onChanged: () => void }) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const f of AGENT_DETAIL_FIELDS) o[f.key] = (app as unknown as Record<string, string | null>)[f.key] || "";
    o.message = app.message || "";
    return o;
  });
  const [docs, setDocs] = useState<AgentDoc[]>(app.documents || []);
  const [note, setNote] = useState(app.reviewNote || "");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy("save"); setMsg("");
    const res = await fetch("/api/admin/agent-applications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: app.id, ...form, documents: docs }) });
    setBusy("");
    setMsg(res.ok ? "Saved" : "Save failed");
  };
  const act = async (action: "approve" | "reject") => {
    if (action === "reject" && !note.trim() && !confirm("Reject without a reason? The agent will be asked to contact the team.")) return;
    setBusy(action); setMsg("");
    const res = await fetch("/api/admin/agent-applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: app.id, action, note }) });
    setBusy("");
    if (res.ok) onChanged(); else setMsg("Action failed");
  };

  return (
    <Modal open onClose={onClose} title="Agent application" className="sm:max-w-2xl">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", STATUS_CLS[app.status] || "bg-slate-100 text-slate-500")}>{app.status}</span>
        <span className="text-xs text-slate-400">Applied {formatDate(app.createdAt)}</span>
      </div>

      <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Details (editable)</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {AGENT_DETAIL_FIELDS.map((f) => (
          <label key={f.key} className="block"><span className="mb-1 block text-[11px] font-semibold text-slate-500">{f.label}</span>
            <input type={f.type || "text"} value={form[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand" /></label>
        ))}
        <label className="block sm:col-span-2"><span className="mb-1 block text-[11px] font-semibold text-slate-500">Message</span>
          <textarea value={form.message || ""} onChange={(e) => set("message", e.target.value)} rows={2} className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand" /></label>
      </div>

      <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Documents</p>
      <div className="space-y-2">
        {docs.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={d.label} onChange={(e) => setDocs((p) => p.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className="w-40 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-brand" placeholder="Label" />
            <input value={d.url} onChange={(e) => setDocs((p) => p.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-brand" placeholder="https://…" />
            {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:text-brand"><ExternalLink size={14} /></a>}
            <button onClick={() => setDocs((p) => p.filter((_, j) => j !== i))} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={14} /></button>
          </div>
        ))}
        <button onClick={() => setDocs((p) => [...p, { label: "Document", url: "" }])} className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"><Plus size={13} /> Add document</button>
      </div>

      <p className="mt-4 mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Review note / rejection reason</p>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Shared with the agent on rejection…" className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand" />

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" onClick={save} disabled={!!busy}>{busy === "save" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save changes</Button>
        <span className="flex-1" />
        {msg && <span className="text-xs font-semibold text-slate-500">{msg}</span>}
        <button onClick={() => act("reject")} disabled={!!busy} className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50">{busy === "reject" ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} Reject</button>
        <button onClick={() => act("approve")} disabled={!!busy} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{busy === "approve" ? <Loader2 size={15} className="animate-spin" /> : <UserCheck size={15} />} {app.status === "APPROVED" ? "Re-approve" : "Approve & activate"}</button>
      </div>
    </Modal>
  );
}
