"use client";
import { useEffect, useState } from "react";
import { Plane, Car, Home, HeartPulse, User, Mail, Phone, MapPin, Send, Loader2, CheckCircle2, ChevronDown, Users, FileText, Calendar } from "lucide-react";
import { ProductTabs } from "@/components/home/ProductTabs";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/store/auth";
import { CITIZENSHIP, VEHICLE_TYPES, PROPERTY_KIND, INSURANCE_TYPE_LABEL } from "@/lib/insurance";
import { VISA_COUNTRIES } from "@/lib/visa";
import { cn } from "@/lib/utils";

type Type = "TRAVEL" | "MOTOR" | "HOUSE" | "LIFE";
const TYPE_ICON: Record<Type, React.ElementType> = { TRAVEL: Plane, MOTOR: Car, HOUSE: Home, LIFE: HeartPulse };

function dayOffset(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

export function InsuranceWidget() {
  const { user } = useAuth();
  const [type, setType] = useState<Type>("TRAVEL");
  const [f, setF] = useState({
    name: "", email: "", phone: "", city: "", message: "",
    citizen: "Indian", destination: "", departure: dayOffset(14), ret: dayOffset(21), travellers: "1",
    vehicleType: "", registration: "", prevExpiry: "",
    propertyKind: "", age: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => { if (user) setF((p) => ({ ...p, name: p.name || user.name || "", email: p.email || user.email, phone: p.phone || user.phone || "" })); }, [user]);

  // Prefill the insurance type from links elsewhere on the page (?type=TRAVEL|MOTOR|HOUSE|LIFE).
  useEffect(() => {
    const tp = new URLSearchParams(window.location.search).get("type") as Type | null;
    if (tp && ["TRAVEL", "MOTOR", "HOUSE", "LIFE"].includes(tp)) setType(tp);
  }, []);

  const submit = async () => {
    setError("");
    if (type === "TRAVEL" && !f.destination) { setError("Please select where you're going."); return; }
    if (type === "MOTOR" && !f.vehicleType) { setError("Please select a vehicle type."); return; }
    if (!f.name.trim()) { setError("Please enter your name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { setError("Please enter a valid email."); return; }
    if (f.phone.replace(/\D/g, "").length < 10) { setError("Please enter a valid mobile number."); return; }
    const details: Record<string, string> = {};
    if (type === "TRAVEL") Object.assign(details, { citizen: f.citizen, destination: f.destination, departure: f.departure, return: f.ret, travellers: f.travellers });
    if (type === "MOTOR") Object.assign(details, { vehicleType: f.vehicleType, registration: f.registration, prevExpiry: f.prevExpiry });
    if (type === "HOUSE") Object.assign(details, { propertyKind: f.propertyKind });
    if (type === "LIFE") Object.assign(details, { age: f.age });
    setBusy(true);
    try {
      const res = await fetch("/api/insurance/enquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, name: f.name, email: f.email, phone: f.phone, city: f.city, message: f.message, details }) });
      const d = await res.json();
      if (res.ok && d.enquiryNo) setDone(d.enquiryNo);
      else setError(d.error || "Could not submit. Please try again.");
    } catch { setError("Network error."); } finally { setBusy(false); }
  };

  if (done) return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-2xl ring-1 ring-slate-100">
      <CheckCircle2 size={52} className="mx-auto text-emerald-500" />
      <h2 className="mt-3 text-xl font-extrabold text-slate-900">Enquiry submitted!</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Your reference is <b className="text-brand">{done}</b>. Our insurance desk will share the best quotes shortly.</p>
      <Button className="mt-5" onClick={() => setDone("")}>New enquiry</Button>
    </div>
  );

  return (
    <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-slate-100">
      <div className="border-b border-slate-100 px-4 pt-4 sm:px-6"><ProductTabs active="insurance" /></div>
      <div className="p-4 sm:p-6">
        {/* insurance type tabs */}
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
          {(["TRAVEL", "MOTOR", "HOUSE", "LIFE"] as Type[]).map((t) => {
            const Icon = TYPE_ICON[t];
            return <button key={t} onClick={() => setType(t)} className={cn("flex shrink-0 items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold transition-colors", type === t ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-600 hover:border-brand/40")}><Icon size={16} /> {INSURANCE_TYPE_LABEL[t].replace(" Insurance", "")}</button>;
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {type === "TRAVEL" && <>
            <Select icon={User} label="Citizen" value={f.citizen} options={CITIZENSHIP} onValue={(v) => set("citizen", v)} />
            <Select icon={Plane} label="Going to *" value={f.destination} placeholder="Select country" options={VISA_COUNTRIES} onValue={(v) => set("destination", v)} />
            <DateInput label="Departure" value={f.departure} min={dayOffset(0)} onValue={(v) => set("departure", v)} />
            <DateInput label="Return" value={f.ret} min={f.departure} onValue={(v) => set("ret", v)} />
            <Select icon={Users} label="Travellers" value={f.travellers} options={Array.from({ length: 9 }, (_, i) => String(i + 1))} onValue={(v) => set("travellers", v)} />
          </>}
          {type === "MOTOR" && <>
            <Select icon={Car} label="Vehicle type *" value={f.vehicleType} placeholder="Select vehicle" options={VEHICLE_TYPES} onValue={(v) => set("vehicleType", v)} />
            <Field icon={FileText} placeholder="Registration number" value={f.registration} onValue={(v) => set("registration", v)} />
            <DateInput label="Previous policy expiry" value={f.prevExpiry} onValue={(v) => set("prevExpiry", v)} />
          </>}
          {type === "HOUSE" && <Select icon={Home} label="Property type" value={f.propertyKind} placeholder="Select type" options={PROPERTY_KIND} onValue={(v) => set("propertyKind", v)} />}
          {type === "LIFE" && <Field icon={HeartPulse} placeholder="Your age" value={f.age} onValue={(v) => set("age", v)} type="number" />}

          {/* common contact */}
          <Field icon={User} placeholder="Name *" value={f.name} onValue={(v) => set("name", v)} />
          <Field icon={Phone} placeholder="Mobile Number *" value={f.phone} onValue={(v) => set("phone", v)} />
          <Field icon={Mail} placeholder="Email *" value={f.email} onValue={(v) => set("email", v)} type="email" />
          <Field icon={MapPin} placeholder="City" value={f.city} onValue={(v) => set("city", v)} />
        </div>

        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>}
        <div className="mt-4 flex flex-col-reverse items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-slate-400">Instant policy · cashless hospitalisation · quick claims.</p>
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

function DateInput({ label, value, min, onValue }: { label: string; value: string; min?: string; onValue: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-brand">
      <Calendar size={16} className="shrink-0 text-slate-400" />
      <span className="shrink-0 text-xs font-medium text-slate-400">{label}</span>
      <input type="date" value={value} min={min} onChange={(e) => onValue(e.target.value)} aria-label={label} className="w-full bg-transparent py-2.5 text-sm text-slate-700 outline-none" />
    </div>
  );
}

function Select({ icon: Icon, label, value, placeholder, options, onValue }: { icon: React.ElementType; label: string; value: string; placeholder?: string; options: string[]; onValue: (v: string) => void }) {
  return (
    <div className="relative flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-brand">
      <Icon size={16} className="shrink-0 text-slate-400" />
      <select aria-label={label} value={value} onChange={(e) => onValue(e.target.value)} className={cn("w-full appearance-none bg-transparent py-2.5 pr-5 text-sm outline-none", value ? "text-slate-800" : "text-slate-400")}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o} value={o} className="text-slate-800">{o}</option>)}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 text-slate-400" />
    </div>
  );
}
