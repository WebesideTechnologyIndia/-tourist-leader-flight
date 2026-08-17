"use client";
import { useEffect, useState } from "react";
import { Send, X, Loader2, CheckCircle2, User, Mail, Phone, ChevronDown, Users, Globe } from "lucide-react";
import { DateField } from "@/components/home/DateField";
import { ProductTabs } from "@/components/home/ProductTabs";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/store/auth";
import { VISA_COUNTRIES, VISA_PURPOSES } from "@/lib/visa";
import { cn } from "@/lib/utils";

function dayOffset(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function SelectField({ label, value, placeholder, options, onChange, icon: Icon }: { label: string; value: string; placeholder: string; options: string[]; onChange: (v: string) => void; icon?: React.ElementType }) {
  return (
    <div className="px-4 py-2.5">
      <label className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{Icon && <Icon size={11} />} {label} <span className="text-rose-500">*</span></label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={cn("mt-0.5 w-full appearance-none bg-transparent pr-6 text-base font-bold leading-tight outline-none", value ? "text-slate-900" : "text-slate-400")}>
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o} value={o} className="text-slate-900">{o}</option>)}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

export function VisaSearchWidget() {
  const { user } = useAuth();
  const [country, setCountry] = useState("");
  const [onward, setOnward] = useState(dayOffset(14));
  const [ret, setRet] = useState(dayOffset(21));
  const [purpose, setPurpose] = useState("");
  const [travellers, setTravellers] = useState("1");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  // Prefill from links elsewhere on the page (?country=…&purpose=…).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const c = sp.get("country");
    const p = sp.get("purpose");
    if (c && VISA_COUNTRIES.includes(c)) setCountry(c);
    if (p && VISA_PURPOSES.includes(p)) setPurpose(p);
  }, []);

  const submit = () => {
    setError("");
    if (!country) { setError("Please select a country."); return; }
    if (!purpose) { setError("Please select a purpose of travel."); return; }
    setOpen(true);
  };

  return (
    <div className="relative rounded-2xl bg-white pb-14 shadow-2xl ring-1 ring-slate-100">
      <div className="border-b border-slate-100 px-4 pt-4 sm:px-6"><ProductTabs active="visa" /></div>
      <div className="px-4 pt-4 sm:px-6">
        <p className="mb-2 text-center text-sm font-semibold text-slate-500">Visa Assistance Enquiry</p>
        <div className="grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
          <div className="sm:border-r sm:border-slate-200 lg:border-r-0"><SelectField label="Select Country" value={country} placeholder="Select Country" options={VISA_COUNTRIES} onChange={setCountry} icon={Globe} /></div>
          <div className="border-t border-slate-200 sm:border-t-0"><DateField label="Onward" value={onward} min={dayOffset(0)} onChange={setOnward} placeholder="Please select" /></div>
          <div className="border-t border-slate-200 sm:border-t-0 sm:border-l sm:border-slate-200 lg:border-l-0"><DateField label="Return" value={ret} min={onward} onChange={setRet} placeholder="Please select" /></div>
          <div className="border-t border-slate-200 sm:border-t-0"><SelectField label="Purpose of Travel" value={purpose} placeholder="Select Purpose" options={VISA_PURPOSES} onChange={setPurpose} /></div>
          <div className="border-t border-slate-200 sm:col-span-2 sm:border-l sm:border-slate-200 lg:col-span-1 lg:border-t-0">
            <div className="px-4 py-2.5">
              <label className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-400"><Users size={11} /> No of Traveller <span className="text-rose-500">*</span></label>
              <div className="relative">
                <select value={travellers} onChange={(e) => setTravellers(e.target.value)} className="mt-0.5 w-full appearance-none bg-transparent pr-6 text-base font-bold leading-tight text-slate-900 outline-none">
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} traveller{n > 1 ? "s" : ""}</option>)}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">Note: Tentative Travel Dates</p>
        {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
      </div>
      <button onClick={submit} className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gradient-to-r from-brand to-sky-500 px-14 py-4 text-lg font-bold tracking-wide text-white shadow-xl shadow-brand/30 transition-transform hover:scale-[1.03] active:scale-95">
        <Send size={18} /> SUBMIT
      </button>

      {open && <EnquiryModal user={user} details={{ country, onward, ret, purpose, travellers }} onClose={() => setOpen(false)} />}
    </div>
  );
}

function EnquiryModal({ user, details, onClose }: { user: { name: string | null; email: string; phone: string | null } | null; details: { country: string; onward: string; ret: string; purpose: string; travellers: string }; onClose: () => void }) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => { if (user) { setName((n) => n || user.name || ""); setEmail((e) => e || user.email); setPhone((p) => p || user.phone || ""); } }, [user]);

  const send = async () => {
    setErr("");
    if (!name.trim()) { setErr("Please enter your name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr("Please enter a valid email."); return; }
    if (phone.replace(/\D/g, "").length < 10) { setErr("Please enter a valid phone number."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/visa/enquiry", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: details.country, purpose: details.purpose, travellers: details.travellers, onwardDate: details.onward, returnDate: details.ret, name, email, phone, message }),
      });
      const d = await res.json();
      if (res.ok && d.enquiryNo) setDone(d.enquiryNo);
      else setErr(d.error || "Could not submit. Please try again.");
    } catch { setErr("Network error."); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => !busy && onClose()} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        {done ? (
          <div className="py-6 text-center">
            <CheckCircle2 size={52} className="mx-auto text-emerald-500" />
            <h2 className="mt-3 text-xl font-extrabold text-slate-900">Enquiry submitted!</h2>
            <p className="mt-1 text-sm text-slate-500">Your reference is <b className="text-brand">{done}</b>. Our visa expert will contact you shortly with the document checklist & fees.</p>
            <Button className="mt-5" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">Visa Enquiry</h2>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">{details.country}</p>
              <p className="text-xs text-slate-500">{details.purpose} · {details.travellers} traveller{Number(details.travellers) > 1 ? "s" : ""} · {details.onward} → {details.ret}</p>
            </div>
            <div className="space-y-3">
              <Field icon={User} placeholder="Full name *" value={name} onValueChange={setName} />
              <Field icon={Mail} placeholder="Email *" value={email} onValueChange={setEmail} type="email" />
              <Field icon={Phone} placeholder="Phone *" value={phone} onValueChange={setPhone} />
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Anything specific? (optional)" className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand" />
            </div>
            {err && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{err}</p>}
            <Button className="mt-4 w-full" onClick={send} disabled={busy}>{busy ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <><Send size={15} /> Submit Enquiry</>}</Button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ icon: Icon, value, onValueChange, placeholder, type = "text" }: { icon: React.ElementType; value: string; onValueChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-brand">
      <Icon size={16} className="shrink-0 text-slate-400" />
      <input type={type} value={value} onChange={(e) => onValueChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent py-2.5 text-sm outline-none" />
    </div>
  );
}
