"use client";
import { useEffect, useState } from "react";
import { Building2, User, Mail, Phone, MapPin, BedDouble, Briefcase, Send, Loader2, CheckCircle2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/store/auth";
import { PROPERTY_TYPES, COMPANY_SIZES } from "@/lib/partner";

type Type = "LIST_PROPERTY" | "TL_BIZ";

export function PartnerEnquiryForm({ type }: { type: Type }) {
  const { user } = useAuth();
  const isBiz = type === "TL_BIZ";
  const [f, setF] = useState({ company: "", city: "", name: "", email: "", phone: "", propertyType: "", rooms: "", companySize: "", designation: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => { if (user) setF((p) => ({ ...p, name: p.name || user.name || "", email: p.email || user.email, phone: p.phone || user.phone || "" })); }, [user]);

  const submit = async () => {
    setError("");
    if (!f.company.trim()) { setError(isBiz ? "Please enter your company name." : "Please enter your property name."); return; }
    if (!f.name.trim()) { setError("Please enter your name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { setError("Please enter a valid email."); return; }
    if (f.phone.replace(/\D/g, "").length < 10) { setError("Please enter a valid phone number."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/partner/enquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, ...f }) });
      const d = await res.json();
      if (res.ok && d.enquiryNo) setDone(d.enquiryNo);
      else setError(d.error || "Could not submit. Please try again.");
    } catch { setError("Network error."); } finally { setBusy(false); }
  };

  if (done) return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-100">
      <CheckCircle2 size={52} className="mx-auto text-emerald-500" />
      <h2 className="mt-3 text-xl font-extrabold text-slate-900">Thank you!</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Your enquiry reference is <b className="text-brand">{done}</b>. Our partnerships team will reach out shortly.</p>
    </div>
  );

  return (
    <div className="rounded-2xl bg-white p-5 shadow-xl ring-1 ring-slate-100 sm:p-6">
      <h2 className="text-lg font-extrabold text-slate-900">{isBiz ? "Get started with TL Biz" : "List your property"}</h2>
      <p className="mt-0.5 text-sm text-slate-500">{isBiz ? "Tell us about your company — we'll set up your business travel." : "Share your property details — we'll get you listed and earning."}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field icon={Building2} placeholder={isBiz ? "Company name *" : "Property name *"} value={f.company} onValue={(v) => set("company", v)} className="sm:col-span-2" />
        {isBiz ? (
          <Select icon={Briefcase} label="Company size" value={f.companySize} placeholder="Select size" options={COMPANY_SIZES} onValue={(v) => set("companySize", v)} />
        ) : (
          <Select icon={BedDouble} label="Property type" value={f.propertyType} placeholder="Select type" options={PROPERTY_TYPES} onValue={(v) => set("propertyType", v)} />
        )}
        {isBiz ? (
          <Field icon={User} placeholder="Your designation" value={f.designation} onValue={(v) => set("designation", v)} />
        ) : (
          <Field icon={BedDouble} placeholder="Number of rooms" value={f.rooms} onValue={(v) => set("rooms", v)} type="number" />
        )}
        <Field icon={MapPin} placeholder="City" value={f.city} onValue={(v) => set("city", v)} />
        <Field icon={User} placeholder={isBiz ? "Contact person *" : "Owner name *"} value={f.name} onValue={(v) => set("name", v)} />
        <Field icon={Mail} placeholder={isBiz ? "Work email *" : "Email *"} value={f.email} onValue={(v) => set("email", v)} type="email" />
        <Field icon={Phone} placeholder="Phone *" value={f.phone} onValue={(v) => set("phone", v)} />
        <textarea value={f.message} onChange={(e) => set("message", e.target.value)} rows={2} placeholder="Anything else? (optional)" className="sm:col-span-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand" />
      </div>
      {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>}
      <Button className="mt-4 w-full sm:w-auto sm:px-10" onClick={submit} disabled={busy}>{busy ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <><Send size={15} /> Submit Enquiry</>}</Button>
    </div>
  );
}

function Field({ icon: Icon, value, onValue, placeholder, type = "text", className = "" }: { icon: React.ElementType; value: string; onValue: (v: string) => void; placeholder?: string; type?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-brand ${className}`}>
      <Icon size={16} className="shrink-0 text-slate-400" />
      <input type={type} value={value} onChange={(e) => onValue(e.target.value)} placeholder={placeholder} className="w-full bg-transparent py-2.5 text-sm outline-none" />
    </div>
  );
}

function Select({ icon: Icon, label, value, placeholder, options, onValue }: { icon: React.ElementType; label: string; value: string; placeholder: string; options: string[]; onValue: (v: string) => void }) {
  return (
    <div className="relative flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-brand">
      <Icon size={16} className="shrink-0 text-slate-400" />
      <select aria-label={label} value={value} onChange={(e) => onValue(e.target.value)} className={`w-full appearance-none bg-transparent py-2.5 pr-5 text-sm outline-none ${value ? "text-slate-800" : "text-slate-400"}`}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o} className="text-slate-800">{o}</option>)}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 text-slate-400" />
    </div>
  );
}
