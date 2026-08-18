"use client";
import { useState } from "react";
import { Headset, Upload, Check, Loader2, FileText, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { INDIAN_STATES } from "@/lib/states";
import { AGENT_DOCS, type AgentDoc } from "@/lib/agent";
import { cn } from "@/lib/utils";

type Form = {
  fullName: string; agencyName: string; email: string; phone: string; city: string; state: string;
  address: string; gstNumber: string; panNumber: string; experience: string; message: string;
};
const EMPTY: Form = { fullName: "", agencyName: "", email: "", phone: "", city: "", state: "", address: "", gstNumber: "", panNumber: "", experience: "", message: "" };

export default function AgentRegisterPage() {
  const [f, setF] = useState<Form>(EMPTY);
  const [docs, setDocs] = useState<Record<string, AgentDoc>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const set = (k: keyof Form, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setError("");
    if (!f.fullName.trim()) return setError("Please enter your full name.");
    if (!/.+@.+\..+/.test(f.email)) return setError("Please enter a valid email.");
    if (!f.phone.trim()) return setError("Please enter your phone number.");
    for (const d of AGENT_DOCS) if (d.required && !docs[d.key]) return setError(`Please upload: ${d.label}`);

    setBusy(true);
    try {
      const res = await fetch("/api/agent/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, documents: Object.values(docs) }),
      });
      const d = await res.json();
      if (res.ok) setDone(true);
      else setError(d.error || "Could not submit. Please try again.");
    } catch { setError("Network error. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <section className="bg-gradient-to-br from-brand-dark to-brand py-12 text-center text-white">
          <Headset size={42} className="mx-auto" />
          <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">Become a Tourist Leader Agent</h1>
          <p className="mx-auto mt-1 max-w-xl px-4 text-white/90">Register your details & documents. Our team reviews, calls you, and activates your agent panel.</p>
        </section>

        <div className="mx-auto max-w-3xl px-4 py-8">
          {done ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
              <CheckCircle2 size={52} className="mx-auto text-emerald-500" />
              <h2 className="mt-3 text-xl font-extrabold text-slate-900">Registration received!</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Thanks {f.fullName.split(" ")[0]}! Your application is under review. Our team will call you to discuss and, once approved, your agent panel will be activated. We&apos;ve emailed a confirmation to <b>{f.email}</b>.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <Card title="Your details">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Full name *"><input value={f.fullName} onChange={(e) => set("fullName", e.target.value)} className="inp" placeholder="As per PAN" /></Field>
                  <Field label="Agency / company name"><input value={f.agencyName} onChange={(e) => set("agencyName", e.target.value)} className="inp" placeholder="Optional" /></Field>
                  <Field label="Email *"><input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className="inp" placeholder="you@email.com" /></Field>
                  <Field label="Phone *"><input value={f.phone} onChange={(e) => set("phone", e.target.value)} className="inp" placeholder="+91 98xxxxxxx" /></Field>
                  <Field label="City"><input value={f.city} onChange={(e) => set("city", e.target.value)} className="inp" /></Field>
                  <Field label="State"><select value={f.state} onChange={(e) => set("state", e.target.value)} className="inp"><option value="">Select state</option>{INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
                  <div className="sm:col-span-2"><Field label="Address"><input value={f.address} onChange={(e) => set("address", e.target.value)} className="inp" /></Field></div>
                  <Field label="GST number"><input value={f.gstNumber} onChange={(e) => set("gstNumber", e.target.value)} className="inp uppercase" placeholder="Optional" /></Field>
                  <Field label="PAN number"><input value={f.panNumber} onChange={(e) => set("panNumber", e.target.value)} className="inp uppercase" /></Field>
                  <Field label="Years in travel business"><input value={f.experience} onChange={(e) => set("experience", e.target.value)} className="inp" placeholder="e.g. 3" /></Field>
                </div>
                <div className="mt-3"><Field label="Anything else?"><textarea value={f.message} onChange={(e) => set("message", e.target.value)} rows={3} className="inp resize-none" placeholder="Tell us about your business…" /></Field></div>
              </Card>

              <Card title="Documents">
                <p className="-mt-1 mb-3 text-xs text-slate-500">JPG, PNG or PDF, up to 6 MB each. <span className="text-rose-500">*</span> required.</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {AGENT_DOCS.map((d) => (
                    <DocUpload key={d.key} docKey={d.key} label={d.label + (d.required ? " *" : "")} doc={docs[d.key]}
                      onChange={(doc) => setDocs((p) => { const n = { ...p }; if (doc) n[d.key] = { label: d.label, url: doc.url }; else delete n[d.key]; return n; })} />
                  ))}
                </div>
              </Card>

              {error && <p className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600"><AlertCircle size={14} /> {error}</p>}
              <div className="flex items-center gap-3">
                <Button onClick={submit} disabled={busy} className="px-8">{busy ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : "Submit registration"}</Button>
                <p className="text-xs text-slate-400">By submitting you agree to be contacted by the Tourist Leader team.</p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <style>{`.inp{width:100%;border:1px solid #e2e8f0;border-radius:0.7rem;padding:0.6rem 0.8rem;font-size:0.875rem;outline:none}.inp:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(11,99,214,.12)}`}</style>
    </>
  );
}

function DocUpload({ docKey, label, doc, onChange }: { docKey: string; label: string; doc?: AgentDoc; onChange: (d: AgentDoc | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const upload = async (file: File) => {
    setErr(""); setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("key", docKey);
      const res = await fetch("/api/agent/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok && d.url) onChange({ label, url: d.url });
      else setErr(d.error || "Upload failed");
    } catch { setErr("Upload failed"); }
    finally { setBusy(false); }
  };
  return (
    <div className={cn("rounded-xl border p-3", doc ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {doc && <button onClick={() => onChange(null)} className="text-slate-400 hover:text-rose-500" aria-label="Remove"><X size={15} /></button>}
      </div>
      {doc ? (
        <a href={doc.url} target="_blank" rel="noreferrer" className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><Check size={13} /> Uploaded — view</a>
      ) : (
        <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-brand hover:underline">
          {busy ? <><Loader2 size={13} className="animate-spin" /> Uploading…</> : <><Upload size={13} /> Choose file</>}
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file); }} />
        </label>
      )}
      {err && <p className="mt-1 text-[11px] text-rose-500">{err}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900"><FileText size={18} className="text-brand" /> {title}</h2>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}
