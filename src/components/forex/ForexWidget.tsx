"use client";
import { useEffect, useState } from "react";
import { CreditCard, Banknote, User, Mail, Phone, MapPin, FileText, Send, Loader2, CheckCircle2 } from "lucide-react";
import { ProductTabs } from "@/components/home/ProductTabs";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/store/auth";
import { FOREX_CURRENCIES } from "@/lib/forex";
import { cn } from "@/lib/utils";

export function ForexWidget() {
  const { user } = useAuth();
  const [type, setType] = useState<"CARD" | "NOTES">("CARD");
  const [f, setF] = useState({ name: "", address: "", phone: "", email: "", pan: "", amount: "", message: "" });
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => { if (user) setF((p) => ({ ...p, name: p.name || user.name || "", email: p.email || user.email, phone: p.phone || user.phone || "" })); }, [user]);

  // Prefill the request type from links elsewhere on the page (?type=CARD|NOTES).
  useEffect(() => {
    const tp = new URLSearchParams(window.location.search).get("type");
    if (tp === "CARD" || tp === "NOTES") setType(tp);
  }, []);

  const toggleCur = (c: string) => setCurrencies((cs) => cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]);

  const submit = async () => {
    setError("");
    if (!f.name.trim()) { setError("Please enter your name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { setError("Please enter a valid email."); return; }
    if (f.phone.replace(/\D/g, "").length < 10) { setError("Please enter a valid mobile number."); return; }
    if (type === "CARD" && !f.address.trim()) { setError("Please enter your delivery address."); return; }
    if (type === "NOTES" && currencies.length === 0) { setError("Please select at least one currency."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/forex/enquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, ...f, currencies }) });
      const d = await res.json();
      if (res.ok && d.enquiryNo) setDone(d.enquiryNo);
      else setError(d.error || "Could not submit. Please try again.");
    } catch { setError("Network error."); } finally { setBusy(false); }
  };

  if (done) return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-2xl ring-1 ring-slate-100">
      <CheckCircle2 size={52} className="mx-auto text-emerald-500" />
      <h2 className="mt-3 text-xl font-extrabold text-slate-900">Enquiry submitted!</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Your reference is <b className="text-brand">{done}</b>. Our forex desk will contact you shortly with live rates & next steps.</p>
      <Button className="mt-5" onClick={() => { setDone(""); setCurrencies([]); setF((p) => ({ ...p, pan: "", amount: "", message: "" })); }}>New enquiry</Button>
    </div>
  );

  return (
    <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-slate-100">
      <div className="border-b border-slate-100 px-4 pt-4 sm:px-6"><ProductTabs active="forex" /></div>
      <div className="p-4 sm:p-6">
        {/* request type */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([["CARD", "Multi-Currency Forex Card", CreditCard], ["NOTES", "Foreign Currency Notes", Banknote]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setType(id)} className={cn("flex items-center gap-3 rounded-xl border p-3 text-left transition-colors", type === id ? "border-brand bg-brand/5" : "border-slate-200 hover:border-brand/40")}>
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", type === id ? "bg-brand text-white" : "bg-slate-100 text-slate-500")}><Icon size={20} /></span>
              <span className="flex-1"><span className="block text-sm font-bold text-slate-800">Request {label}</span><span className="block text-xs text-slate-400">{id === "CARD" ? "Load multiple currencies on one card" : "Get cash in foreign currency"}</span></span>
              <span className={cn("h-4 w-4 rounded-full border-2", type === id ? "border-brand bg-brand" : "border-slate-300")} />
            </button>
          ))}
        </div>

        {/* currency picker (NOTES) */}
        {type === "NOTES" && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-bold text-slate-900">Select Currency Notes <span className="text-rose-500">*</span></p>
            <div className="flex flex-wrap gap-2">
              {FOREX_CURRENCIES.map((c) => (
                <button key={c} onClick={() => toggleCur(c)} className={cn("rounded-lg border px-3 py-1.5 text-xs font-semibold", currencies.includes(c) ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-600 hover:border-brand/40")}>{c}</button>
              ))}
            </div>
          </div>
        )}

        {/* contact / details */}
        <p className="mb-2 mt-4 text-sm font-bold text-slate-900">Please share about you</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field icon={User} placeholder="Name *" value={f.name} onValue={(v) => set("name", v)} />
          <Field icon={Phone} placeholder="Mobile Number *" value={f.phone} onValue={(v) => set("phone", v)} />
          <Field icon={Mail} placeholder="Email *" value={f.email} onValue={(v) => set("email", v)} type="email" />
          {type === "CARD"
            ? <Field icon={FileText} placeholder="PAN number" value={f.pan} onValue={(v) => set("pan", v.toUpperCase())} />
            : <Field icon={Banknote} placeholder="Approx. amount (optional)" value={f.amount} onValue={(v) => set("amount", v)} />}
          <div className="lg:col-span-2"><Field icon={MapPin} placeholder={type === "CARD" ? "Address *" : "Delivery address (optional)"} value={f.address} onValue={(v) => set("address", v)} /></div>
        </div>

        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>}
        <div className="mt-4 flex flex-col-reverse items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-slate-400">Best rates · doorstep delivery · RBI-authorised partners.</p>
          <Button className="w-full sm:w-auto sm:px-10" onClick={submit} disabled={busy}>{busy ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <><Send size={15} /> Submit Enquiry</>}</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, value, onValue, placeholder, type = "text" }: { icon: React.ElementType; value: string; onValue: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-brand">
      <Icon size={16} className="shrink-0 text-slate-400" />
      <input type={type} value={value} onChange={(e) => onValue(e.target.value)} placeholder={placeholder} className="w-full bg-transparent py-2.5 text-sm outline-none" />
    </div>
  );
}
