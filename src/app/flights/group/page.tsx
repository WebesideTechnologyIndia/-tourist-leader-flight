"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Users, Minus, Plus, ArrowLeftRight, Check, Loader2, AlertCircle, CheckCircle2, Home, Tag, CreditCard, UserCog } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { AirportSelect } from "@/components/home/AirportSelect";
import { CABIN_CLASSES } from "@/lib/constants";
import {
  GROUP_MIN_TRAVELLERS, DOMESTIC_ID_TYPES, VISA_NOTE, validatePassengers,
  type GroupPassenger, type JourneyType, type PaxType,
} from "@/lib/group";
import { paxTypes } from "@/lib/fare-rules";
import { cn } from "@/lib/utils";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function tomorrow(offset = 7) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

const PERKS = [
  { icon: Tag, label: "Attractive bulk discounts" },
  { icon: CreditCard, label: "Pay part amount to reserve seats" },
  { icon: UserCog, label: "Flexibility in passenger names" },
];

function GroupForm() {
  const sp = useSearchParams();
  const [tripType, setTripType] = useState<"ONE_WAY" | "ROUND_TRIP">("ONE_WAY");
  const [from, setFrom] = useState("DEL");
  const [to, setTo] = useState("BOM");
  const [departDate, setDepartDate] = useState(tomorrow(7));
  const [returnDate, setReturnDate] = useState("");
  const [cabinClass, setCabinClass] = useState("Economy");
  const [adults, setAdults] = useState(GROUP_MIN_TRAVELLERS);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [journeyType, setJourneyType] = useState<JourneyType>("DOMESTIC");
  const [pax, setPax] = useState<GroupPassenger[]>([]);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  // Seed trip basics from the search widget (if the user came from there).
  useEffect(() => {
    if (sp.get("from")) setFrom(sp.get("from")!);
    if (sp.get("to")) setTo(sp.get("to")!);
    if (sp.get("departDate")) setDepartDate(sp.get("departDate")!);
    if (sp.get("cabinClass")) setCabinClass(sp.get("cabinClass")!);
    if (sp.get("returnDate")) { setReturnDate(sp.get("returnDate")!); setTripType("ROUND_TRIP"); }
    const seededAdults = Number(sp.get("adults") || 0);
    const seededChildren = Number(sp.get("children") || 0);
    const seededInfants = Number(sp.get("infants") || 0);
    if (seededAdults || seededChildren || seededInfants) {
      setChildren(seededChildren);
      setInfants(seededInfants);
      // Ensure the party is at least the group minimum.
      setAdults(Math.max(seededAdults, GROUP_MIN_TRAVELLERS - seededChildren - seededInfants, 1));
    }
  }, [sp]);

  const total = adults + children + infants;
  const intl = journeyType === "INTERNATIONAL";
  const types = useMemo(() => paxTypes({ adults, children, infants }), [adults, children, infants]);

  // Keep the traveller rows sized to the count, preserving what is already typed
  // and re-labelling each row's pax type as the adult/child/infant mix changes.
  useEffect(() => {
    setPax((prev) =>
      Array.from({ length: total }, (_, i) => ({
        ...(prev[i] ?? { name: "" }),
        paxType: ((types[i] || "Adult").toUpperCase() as PaxType),
      }))
    );
  }, [total, types]);

  const setPaxField = (i: number, field: keyof GroupPassenger, v: string) =>
    setPax((list) => list.map((p, idx) => (idx === i ? { ...p, [field]: v } : p)));

  const validate = () => {
    const e: Record<string, string> = {};
    if (total < GROUP_MIN_TRAVELLERS) e.total = `A group booking needs at least ${GROUP_MIN_TRAVELLERS} travellers.`;
    if (!contact.name.trim()) e.name = "Contact name is required";
    if (!emailRe.test(contact.email.trim())) e.email = "Enter a valid email";
    if (contact.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a valid 10-digit number";
    if (tripType === "ROUND_TRIP" && !returnDate) e.returnDate = "Pick a return date";
    // Same rules the API enforces: any photo ID domestically, passport abroad.
    Object.assign(e, validatePassengers(pax, journeyType));
    return e;
  };

  const submit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/flights/group-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripType, from, to, departDate, returnDate: tripType === "ROUND_TRIP" ? returnDate : "",
          cabinClass, adults, children, infants,
          journeyType, passengers: pax, passengerNames: pax.map((p) => p.name),
          name: contact.name, email: contact.email, phone: contact.phone, company: contact.company, message: contact.message,
        }),
      });
      const data = await res.json();
      if (data.enquiryNo) setDone(data.enquiryNo);
      else setErrors({ submit: data.error || "Could not send your query. Please try again." });
    } catch {
      setErrors({ submit: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <CheckCircle2 size={56} className="mx-auto text-emerald-500" />
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Group query sent!</h1>
        <p className="mt-2 text-slate-600">Your query number is <b className="text-brand">{done}</b>. Our group desk will contact you shortly with fares and a held-seat quote.</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white"><Home size={16} /> Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 rounded-2xl bg-gradient-to-r from-brand to-sky-500 p-5 text-white shadow-sm">
        <h1 className="flex items-center gap-2 text-xl font-extrabold"><Users size={22} /> Group Booking Query</h1>
        <p className="mt-1 text-sm text-white/90">Travelling with {GROUP_MIN_TRAVELLERS} or more? Send us a query with your details and traveller names — we&apos;ll reserve seats and send the best group fare.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PERKS.map((p) => (
            <span key={p.label} className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold"><p.icon size={13} /> {p.label}</span>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {/* Trip */}
        <Card title="Trip details">
          <div className="mb-3 flex flex-wrap gap-2">
            {(["ONE_WAY", "ROUND_TRIP"] as const).map((t) => (
              <button key={t} onClick={() => setTripType(t)} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", tripType === t ? "bg-brand text-white" : "bg-slate-100 text-slate-600")}>
                {t === "ONE_WAY" ? "One Way" : "Round Trip"}
              </button>
            ))}
            {/* Decides which travel document the traveller rows ask for. */}
            <span className="mx-1 hidden w-px self-stretch bg-slate-200 sm:block" />
            {(["DOMESTIC", "INTERNATIONAL"] as const).map((j) => (
              <button key={j} onClick={() => setJourneyType(j)} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", journeyType === j ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600")}>
                {j === "DOMESTIC" ? "Domestic" : "International"}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative grid grid-cols-2 rounded-xl border border-slate-200">
              <div className="border-r border-slate-200 pr-5"><AirportSelect label="From" value={from} onChange={setFrom} /></div>
              <div className="pl-5"><AirportSelect label="To" value={to} onChange={setTo} align="right" /></div>
              <button onClick={() => { setFrom(to); setTo(from); }} className="absolute left-1/2 top-1/2 z-20 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-brand shadow" aria-label="Swap"><ArrowLeftRight size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Departure">
                <input type="date" value={departDate} min={tomorrow(0)} onChange={(e) => setDepartDate(e.target.value)} className="inp" />
              </Field>
              <Field label="Return" error={errors.returnDate}>
                <input type="date" value={returnDate} min={departDate} disabled={tripType !== "ROUND_TRIP"} onChange={(e) => setReturnDate(e.target.value)} className={cn("inp", tripType !== "ROUND_TRIP" && "opacity-40")} />
              </Field>
            </div>
          </div>
          <div className="mt-3">
            <Field label="Cabin class">
              <select value={cabinClass} onChange={(e) => setCabinClass(e.target.value)} className="inp max-w-xs">
                {CABIN_CLASSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        {/* Travellers */}
        <Card title="Travellers" sub={`Minimum ${GROUP_MIN_TRAVELLERS} for a group booking`}>
          <div className="grid gap-2 sm:grid-cols-3">
            <Stepper label="Adults" sub="12+ yrs" value={adults} min={1} onChange={setAdults} />
            <Stepper label="Children" sub="2–12 yrs" value={children} min={0} onChange={setChildren} />
            <Stepper label="Infants" sub="Under 2 yrs" value={infants} min={0} max={adults} onChange={setInfants} />
          </div>
          <p className={cn("mt-2 text-sm font-semibold", total >= GROUP_MIN_TRAVELLERS ? "text-emerald-600" : "text-rose-500")}>
            {total} traveller{total !== 1 ? "s" : ""} {total >= GROUP_MIN_TRAVELLERS ? <Check size={14} className="inline" /> : `· add ${GROUP_MIN_TRAVELLERS - total} more`}
          </p>
          {errors.total && <ErrLine msg={errors.total} />}
        </Card>

        {/* Travellers & travel documents */}
        <Card
          title="Traveller details"
          sub={intl
            ? "Passport number and expiry are mandatory for every international traveller."
            : "Any government photo ID is accepted for domestic travel."}
        >
          {intl && (
            <p className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              <AlertCircle size={14} className="mt-px shrink-0" /> {VISA_NOTE}
            </p>
          )}
          <div className="space-y-3">
            {pax.map((p, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Traveller {i + 1} · {(p.paxType || "ADULT").toLowerCase()}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Full name (as on document)" error={errors[`p${i}.name`]}>
                    <input value={p.name} onChange={(e) => setPaxField(i, "name", e.target.value)} className="inp" placeholder="Full name" />
                  </Field>
                  {intl ? (
                    <>
                      <Field label="Passport number" error={errors[`p${i}.passportNo`]}>
                        <input value={p.passportNo || ""} onChange={(e) => setPaxField(i, "passportNo", e.target.value.toUpperCase())} className="inp" placeholder="e.g. M1234567" />
                      </Field>
                      <Field label="Passport expiry" error={errors[`p${i}.passportExpiry`]}>
                        <input type="date" value={p.passportExpiry || ""} onChange={(e) => setPaxField(i, "passportExpiry", e.target.value)} className="inp" />
                      </Field>
                      <Field label="Nationality (optional)">
                        <input value={p.nationality || ""} onChange={(e) => setPaxField(i, "nationality", e.target.value)} className="inp" placeholder="Indian" />
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field label="ID type" error={errors[`p${i}.idType`]}>
                        <select value={p.idType || ""} onChange={(e) => setPaxField(i, "idType", e.target.value)} className="inp">
                          <option value="">Select ID</option>
                          {DOMESTIC_ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </Field>
                      <Field label="ID number" error={errors[`p${i}.idNumber`]}>
                        <input value={p.idNumber || ""} onChange={(e) => setPaxField(i, "idNumber", e.target.value)} className="inp" placeholder="Number on the ID" />
                      </Field>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Contact */}
        <Card title="Contact details">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Contact name" error={errors.name}><input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className="inp" placeholder="Your name" /></Field>
            <Field label="Organisation / Agency (optional)"><input value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} className="inp" placeholder="Company / group name" /></Field>
            <Field label="Email" error={errors.email}><input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="inp" placeholder="you@email.com" /></Field>
            <Field label="Mobile number" error={errors.phone}><input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className="inp" placeholder="+91 98xxxxxxx" /></Field>
          </div>
          <div className="mt-3">
            <Field label="Message (optional)"><textarea value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} rows={3} className="inp" placeholder="Any special requirements — dates flexibility, meals, etc." /></Field>
          </div>
        </Card>

        {errors.submit && <ErrLine msg={errors.submit} />}
        <Button className="w-full" onClick={submit} disabled={submitting}>
          {submitting ? <><Loader2 size={16} className="animate-spin" /> Sending query…</> : <>Send Group Query <Users size={16} /></>}
        </Button>
      </div>

      <style>{`.inp{width:100%;border:1px solid #e2e8f0;border-radius:0.75rem;padding:0.55rem 0.9rem;font-size:0.875rem;outline:none;transition:border-color .15s}.inp:focus{border-color:var(--brand)}`}</style>
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <h2 className="font-bold text-slate-900">{title}</h2>
      {sub && <p className="mb-3 text-xs text-slate-500">{sub}</p>}
      {!sub && <div className="mb-3" />}
      {children}
    </div>
  );
}
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {error && <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-500"><AlertCircle size={11} /> {error}</span>}
    </label>
  );
}
function ErrLine({ msg }: { msg: string }) {
  return <p className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600"><AlertCircle size={14} /> {msg}</p>;
}
function Stepper({ label, sub, value, onChange, min = 0, max }: { label: string; sub: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
      <div><p className="text-sm font-semibold text-slate-800">{label}</p><p className="text-xs text-slate-400">{sub}</p></div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="grid h-7 w-7 place-items-center rounded-full border border-slate-300 text-slate-600 disabled:opacity-40"><Minus size={13} /></button>
        <span className="w-5 text-center text-sm font-bold">{value}</span>
        <button type="button" onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)} disabled={max !== undefined && value >= max} className="grid h-7 w-7 place-items-center rounded-full border border-slate-300 text-slate-600 disabled:opacity-40"><Plus size={13} /></button>
      </div>
    </div>
  );
}

export default function GroupBookingPage() {
  return (
    <>
      <Header active="flights" />
      <main className="flex-1 bg-background">
        <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading…</div>}>
          <GroupForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
