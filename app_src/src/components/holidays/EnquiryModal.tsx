"use client";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Phone, MessageCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/store/auth";
import type { Package } from "@/lib/packages";

// Support line for the post-enquiry call / WhatsApp shortcuts (digits only).
const SUPPORT_PHONE = "919987495897";
const today = () => new Date().toISOString().slice(0, 10);

export function EnquiryModal({ pkg, open, onClose }: { pkg: Package; open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", travelMonth: "", adults: 2, children: 0, message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [enquiryNo, setEnquiryNo] = useState("");

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name || "", email: f.email || user.email || "", phone: f.phone || user.phone || "" }));
  }, [user]);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/holidays/enquiry", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, packageSlug: pkg.slug, packageTitle: pkg.title }),
      });
      const data = await res.json();
      if (res.ok && data.enquiryNo) setEnquiryNo(data.enquiryNo);
      else setError(data.error || "Could not submit your enquiry");
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={enquiryNo ? "Enquiry Sent" : "Get a customised quote"}>
      {enquiryNo ? (
        <div className="py-6 text-center">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
          <h3 className="mt-3 text-lg font-extrabold text-slate-900">Thank you, {form.name.split(" ")[0]}!</h3>
          <p className="mt-1 text-sm text-slate-500">Your enquiry for <b>{pkg.title}</b> is received.</p>
          <p className="mt-2 inline-block rounded-xl bg-brand/10 px-4 py-2 text-lg font-extrabold text-brand">{enquiryNo}</p>
          <p className="mx-auto mt-3 max-w-sm text-sm text-slate-500">Our holiday expert will call you shortly with the best price & itinerary. A confirmation has been emailed to {form.email}.</p>
          <p className="mt-4 text-xs font-semibold text-slate-500">Prefer to connect now?</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <a href={`tel:+${SUPPORT_PHONE}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand px-4 py-2.5 text-sm font-bold text-brand hover:bg-brand/5">
              <Phone size={16} /> Call us
            </a>
            <a href={`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(`Hi, I just enquired about ${pkg.title} (Ref ${enquiryNo}). Please share the best quote.`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white hover:brightness-95">
              <MessageCircle size={16} /> WhatsApp
            </a>
          </div>
          <Button variant="ghost" className="mt-3" onClick={onClose}>Done</Button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="mb-3 rounded-xl bg-brand/5 px-3 py-2 text-sm text-brand"><b>{pkg.title}</b> · {pkg.destination} · {pkg.nights}N/{pkg.days}D</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" className="einp" /></Field>
            <Field label="Phone"><input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98xxxxxxx" className="einp" /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" className="einp" /></Field>
            <Field label="Preferred travel date">
              <input type="date" min={today()} value={form.travelMonth} onChange={(e) => set("travelMonth", e.target.value)} className="einp" />
            </Field>
            <Field label="Adults"><input type="number" min={1} value={form.adults} onChange={(e) => set("adults", Number(e.target.value))} className="einp" /></Field>
            <Field label="Children"><input type="number" min={0} value={form.children} onChange={(e) => set("children", Number(e.target.value))} className="einp" /></Field>
          </div>
          <div className="mt-3"><Field label="Message (optional)"><textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={3} placeholder="Any preferences — hotel category, dates, add-ons…" className="einp resize-none" /></Field></div>
          {error && <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600"><AlertCircle size={14} /> {error}</p>}
          <Button type="submit" className="mt-4 w-full" disabled={loading}>{loading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <><Phone size={16} /> Request callback & quote</>}</Button>
          <p className="mt-2 text-center text-[11px] text-slate-400">Our expert will call you within a few hours. No payment required now.</p>
        </form>
      )}
      <style>{`.einp{width:100%;border:1px solid #e2e8f0;border-radius:0.75rem;padding:0.55rem 0.8rem;font-size:0.875rem;outline:none}.einp:focus{border-color:var(--brand)}`}</style>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}
