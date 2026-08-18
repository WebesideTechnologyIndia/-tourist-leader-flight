"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, ChevronRight, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/InfoPopup";
import { PriceSummary } from "@/components/booking/PriceSummary";
import { useBooking, type PassengerInput } from "@/store/booking";
import { paxTypes, isDomesticRoute, dobErrorForType, TYPE_AGE_LABEL } from "@/lib/fare-rules";
import { cn } from "@/lib/utils";

const ID_TYPES = ["Aadhaar", "PAN", "Passport", "Driving Licence"];
const ASSIST = [
  { id: "none", label: "None" },
  { id: "wheelchair", label: "Wheelchair" },
  { id: "priority", label: "Priority check-in" },
  { id: "escort", label: "Escorting services" },
];

type Errors = Record<string, string>;

function blank(): PassengerInput {
  return { fullName: "", dob: "", gender: "Male", nationality: "Indian", idType: "Aadhaar", idNumber: "", assistance: "none" };
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateField(key: string, value: string): string {
  const v = (value || "").trim();
  if (key === "email") {
    if (!v) return "Email is required";
    if (!emailRe.test(v)) return "Enter a valid email address";
  }
  if (key === "phone") {
    if (!v) return "Mobile number is required";
    if (v.replace(/\D/g, "").length < 10) return "Enter a valid 10-digit number";
  }
  if (key.endsWith("fullName")) {
    if (!v) return "Name is required";
    if (v.length < 3) return "Name looks too short";
    if (!/^[a-zA-Z .'-]+$/.test(v)) return "Use letters only";
    if (!v.includes(" ")) return "Enter first & last name";
  }
  if (key.endsWith("dob")) {
    if (!v) return "Date of birth is required";
    if (new Date(v) > new Date()) return "Date can't be in the future";
  }
  if (key.endsWith("idNumber")) {
    if (!v) return "ID number is required";
    if (v.length < 4) return "ID number looks too short";
  }
  return "";
}

export default function PassengersPage() {
  const router = useRouter();
  const { query, setPassengers, setContact, contactEmail, contactPhone } = useBooking();
  const [mounted, setMounted] = useState(false);
  const [pax, setPax] = useState<PassengerInput[]>([]);
  const [email, setEmail] = useState(contactEmail);
  const [phone, setPhone] = useState(contactPhone);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    setMounted(true);
    const st = useBooking.getState();
    if (!st.flight || !st.query) { router.replace("/"); return; }
    // One form per traveller — adults, then children, then infants.
    const count = Math.max(1, paxTypes(st.query.travellers).length);
    setPax(st.passengers.length === count ? st.passengers : Array.from({ length: count }, () => blank()));
  }, [router]);

  if (!mounted || !query) return null;

  // Per-passenger type labels (Adult / Child / Infant) + domestic ID exemption.
  const types = paxTypes(query.travellers);
  const domestic = isDomesticRoute(query.from, query.to);
  const travelISO = query.departDate || new Date().toISOString().slice(0, 10);

  // DOB must match the passenger's age band (Infant 0–2, Child 2–12, Adult 12+) on the travel date.
  const dobErr = (dob: string, i: number) => dobErrorForType(dob, types[i] || "Adult", travelISO);
  const clearDobIfValid = (i: number, value: string) =>
    setErrors((e) => (e[`p${i}_dob`] && !dobErr(value, i) ? { ...e, [`p${i}_dob`]: "" } : e));
  const blurDob = (i: number, value: string) =>
    setErrors((e) => ({ ...e, [`p${i}_dob`]: dobErr(value, i) }));

  const update = (i: number, patch: Partial<PassengerInput>) =>
    setPax((p) => p.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  // live-clear an error as soon as the field becomes valid
  const clearIfValid = (key: string, value: string) =>
    setErrors((e) => (e[key] && !validateField(key, value) ? { ...e, [key]: "" } : e));

  const blurValidate = (key: string, value: string) =>
    setErrors((e) => ({ ...e, [key]: validateField(key, value) }));

  const validateAll = (): Errors => {
    const e: Errors = {};
    const set = (k: string, v: string) => { const m = validateField(k, v); if (m) e[k] = m; };
    set("email", email);
    set("phone", phone);
    pax.forEach((p, i) => {
      set(`p${i}_fullName`, p.fullName);
      const dm = dobErr(p.dob, i); if (dm) e[`p${i}_dob`] = dm; // age band per passenger type
      if (!domestic) set(`p${i}_idNumber`, p.idNumber); // ID not required for domestic travel
    });
    return e;
  };

  const submit = () => {
    const e = validateAll();
    setErrors(e);
    const firstKey = Object.keys(e)[0];
    if (firstKey) {
      document.getElementById(`fld-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById(`fld-${firstKey}`)?.focus({ preventScroll: true });
      return;
    }
    setPassengers(pax);
    setContact(email, phone);
    router.push("/flights/seats");
  };

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <>
      <Header active="flights" />
      <main className="flex-1 bg-background">
        <div className="border-b border-slate-200 bg-white py-4"><Stepper current={1} /></div>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-5">
              {errorCount > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                  <AlertCircle size={16} /> Please fix {errorCount} field{errorCount > 1 ? "s" : ""} below to continue.
                </div>
              )}

              {/* Contact */}
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <h2 className="mb-3 font-bold text-slate-900">Contact details</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Email" error={errors.email} htmlFor="fld-email">
                    <Input id="fld-email" type="email" value={email} error={errors.email} placeholder="you@email.com"
                      onChange={(e) => { setEmail(e.target.value); clearIfValid("email", e.target.value); }}
                      onBlur={(e) => blurValidate("email", e.target.value)} />
                  </Field>
                  <Field label="Mobile number" error={errors.phone} htmlFor="fld-phone">
                    <Input id="fld-phone" inputMode="tel" value={phone} error={errors.phone} placeholder="+91 98xxxxxxx"
                      onChange={(e) => { setPhone(e.target.value); clearIfValid("phone", e.target.value); }}
                      onBlur={(e) => blurValidate("phone", e.target.value)} />
                  </Field>
                </div>
                <p className="mt-2 text-xs text-slate-400">Your ticket & booking updates will be sent to this email.</p>
              </div>

              {pax.map((p, i) => {
                const k = (f: string) => `p${i}_${f}`;
                return (
                  <div key={i} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                    <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900"><User size={18} className="text-brand" /> Passenger {i + 1} <span className="text-xs font-normal text-slate-400">({types[i] || "Adult"} · {TYPE_AGE_LABEL[types[i] || "Adult"]})</span></h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label={<Tooltip text="Enter the exact name on your government ID. Mismatched names may lead to boarding denial."><span className="border-b border-dashed border-slate-300">Full Name (as per ID)</span></Tooltip>} error={errors[k("fullName")]} htmlFor={`fld-${k("fullName")}`}>
                        <Input id={`fld-${k("fullName")}`} value={p.fullName} error={errors[k("fullName")]} placeholder="e.g. Rahul Sharma"
                          onChange={(e) => { update(i, { fullName: e.target.value }); clearIfValid(k("fullName"), e.target.value); }}
                          onBlur={(e) => blurValidate(k("fullName"), e.target.value)} />
                      </Field>
                      <Field label={<Tooltip text="Required for infant, child, student, senior, and special fares."><span className="border-b border-dashed border-slate-300">Date of Birth</span></Tooltip>} error={errors[k("dob")]} htmlFor={`fld-${k("dob")}`}>
                        <Input id={`fld-${k("dob")}`} type="date" value={p.dob} error={errors[k("dob")]} max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => { update(i, { dob: e.target.value }); clearDobIfValid(i, e.target.value); }}
                          onBlur={(e) => blurDob(i, e.target.value)} />
                      </Field>
                      <Field label="Gender">
                        <select value={p.gender} onChange={(e) => update(i, { gender: e.target.value })} className="inp">
                          <option>Male</option><option>Female</option><option>Other</option>
                        </select>
                      </Field>
                      <Field label="Nationality"><input value={p.nationality} onChange={(e) => update(i, { nationality: e.target.value })} className="inp" /></Field>
                      <Field label="ID Type">
                        <select value={p.idType} onChange={(e) => update(i, { idType: e.target.value })} className="inp">
                          {ID_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                      </Field>
                      <Field label={domestic ? "ID Number (optional)" : "ID Number"} error={errors[k("idNumber")]} htmlFor={`fld-${k("idNumber")}`}>
                        <Input id={`fld-${k("idNumber")}`} value={p.idNumber} error={errors[k("idNumber")]} placeholder={domestic ? "Not required for domestic" : "ID number"}
                          onChange={(e) => { update(i, { idNumber: e.target.value }); clearIfValid(k("idNumber"), e.target.value); }}
                          onBlur={(e) => { if (!domestic) blurValidate(k("idNumber"), e.target.value); }} />
                      </Field>
                    </div>
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs font-semibold text-slate-600">Special assistance</p>
                      <div className="flex flex-wrap gap-2">
                        {ASSIST.map((a) => (
                          <button key={a.id} onClick={() => update(i, { assistance: a.id })}
                            className={cn("rounded-lg border px-3 py-1.5 text-xs font-semibold", p.assistance === a.id ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-600")}>
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                      <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" /> Save this traveller for faster future bookings
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="lg:sticky lg:top-20 lg:self-start">
              <PriceSummary cta={<Button className="w-full" onClick={submit}>Continue to Seats <ChevronRight size={16} /></Button>} />
            </div>
          </div>
        </div>
      </main>
      <style>{`.inp{width:100%;border:1px solid #e2e8f0;border-radius:0.75rem;padding:0.625rem 1rem;font-size:0.875rem;outline:none;transition:border-color .15s,box-shadow .15s}.inp:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(11,99,214,.12)}.inp-error{border-color:#fb7185!important}.inp-error:focus{border-color:#f43f5e!important;box-shadow:0 0 0 3px rgba(244,63,94,.12)}`}</style>
    </>
  );
}

function Input({ error, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return <input {...props} className={cn("inp", error && "inp-error", className)} aria-invalid={!!error} />;
}

function Field({ label, error, htmlFor, children }: { label: React.ReactNode; error?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {error && (
        <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-500">
          <AlertCircle size={11} /> {error}
        </span>
      )}
    </label>
  );
}
