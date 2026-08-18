"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, ChevronRight, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { BusPriceSummary } from "@/components/bus/BusPriceSummary";
import { useBusBooking, type BusPassengerInput } from "@/store/bus-booking";
import { formatTime } from "@/lib/utils";

export default function BusPassengersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pax, setPax] = useState<BusPassengerInput[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    const st = useBusBooking.getState();
    if (!st.bus || st.seats.length === 0) { router.replace("/bus"); return; }
    setPax(st.passengers.length === st.seats.length ? st.passengers : st.seats.map((s) => ({ fullName: "", age: "", gender: "Male", seatId: s.id })));
    setEmail(st.contactEmail); setPhone(st.contactPhone);
  }, [router]);

  if (!mounted) return null;
  const st = useBusBooking.getState();
  const bus = st.bus;
  if (!bus) return null;

  const update = (i: number, patch: Partial<BusPassengerInput>) => setPax((p) => p.map((x, idx) => idx === i ? { ...x, ...patch } : x));

  const submit = () => {
    const errs: string[] = [];
    pax.forEach((p, i) => { if (!p.fullName.trim()) errs.push(`Passenger ${i + 1}: name required`); if (!p.age.trim() || Number(p.age) < 1) errs.push(`Passenger ${i + 1}: valid age required`); });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push("Valid email required");
    if (phone.replace(/\D/g, "").length < 10) errs.push("Valid mobile number required");
    setErrors(errs);
    if (errs.length) return;
    useBusBooking.getState().setPassengers(pax);
    useBusBooking.getState().setContact(email, phone);
    router.push("/bus/payment");
  };

  return (
    <>
      <Header active="bus" />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="mb-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="font-bold text-slate-900">{bus.operator} <span className="text-xs font-normal text-slate-400">· {bus.busType}</span></p>
            <p className="text-sm text-slate-500">{st.query?.from} → {st.query?.to} · {formatTime(bus.departTime)} · Boarding: {st.boarding?.name}</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-5">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <h2 className="mb-3 font-bold text-slate-900">Contact details</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="binp" /></label>
                  <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Mobile</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxxxxxx" className="binp" /></label>
                </div>
                <p className="mt-2 text-xs text-slate-400">Your ticket will be emailed here.</p>
              </div>

              {pax.map((p, i) => (
                <div key={i} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                  <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900"><User size={18} className="text-brand" /> Passenger {i + 1} <span className="rounded bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">Seat {p.seatId}</span></h2>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block sm:col-span-1"><span className="mb-1 block text-xs font-semibold text-slate-600">Full Name</span><input value={p.fullName} onChange={(e) => update(i, { fullName: e.target.value })} placeholder="Name" className="binp" /></label>
                    <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Age</span><input type="number" min={1} value={p.age} onChange={(e) => update(i, { age: e.target.value })} placeholder="Age" className="binp" /></label>
                    <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Gender</span><select value={p.gender} onChange={(e) => update(i, { gender: e.target.value })} className="binp"><option>Male</option><option>Female</option><option>Other</option></select></label>
                  </div>
                </div>
              ))}

              {errors.length > 0 && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">{errors.map((e, i) => <p key={i} className="flex items-center gap-1.5"><AlertCircle size={13} /> {e}</p>)}</div>}
            </div>
            <div className="lg:sticky lg:top-20 lg:self-start"><BusPriceSummary cta={<Button className="w-full" onClick={submit}>Continue to Payment <ChevronRight size={16} /></Button>} /></div>
          </div>
        </div>
      </main>
      <style>{`.binp{width:100%;border:1px solid #e2e8f0;border-radius:0.75rem;padding:0.55rem 0.85rem;font-size:0.875rem;outline:none}.binp:focus{border-color:var(--brand)}`}</style>
    </>
  );
}
