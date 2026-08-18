"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, ChevronRight, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { HotelSummaryCard, HotelPriceSummary } from "@/components/hotels/HotelBookingSummary";
import { useHotelBooking } from "@/store/hotel-booking";
import { useAuth } from "@/store/auth";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function HotelGuestPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { hotel, guest, setGuest } = useHotelBooking();
  const user = useAuth((s) => s.user);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", requests: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    if (!useHotelBooking.getState().hotel) { router.replace("/hotels"); return; }
    const g = useHotelBooking.getState().guest;
    const u = useAuth.getState().user;
    setForm({ fullName: g?.fullName || u?.name || "", email: g?.email || u?.email || "", phone: g?.phone || u?.phone || "", requests: g?.requests || "" });
  }, [router]);

  if (!mounted || !hotel) return null;

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const e: Record<string, string> = {};
    if (form.fullName.trim().length < 3) e.fullName = "Enter the guest's full name";
    if (!emailRe.test(form.email)) e.email = "Enter a valid email";
    if (form.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a valid 10-digit number";
    setErrors(e);
    if (Object.keys(e).length) return;
    setGuest(form);
    router.push("/hotels/payment");
  };

  return (
    <>
      <Header active="hotels" />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="mb-4 text-xl font-extrabold text-slate-900">Guest details</h1>
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-5">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900"><User size={18} className="text-brand" /> Lead Guest</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Full name" error={errors.fullName}><input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="e.g. Rahul Sharma" className="inp" /></Field>
                  <Field label="Email" error={errors.email}><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" className="inp" /></Field>
                  <Field label="Mobile number" error={errors.phone}><input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98xxxxxxx" className="inp" /></Field>
                  <Field label="Special requests (optional)"><input value={form.requests} onChange={(e) => set("requests", e.target.value)} placeholder="Early check-in, high floor…" className="inp" /></Field>
                </div>
                <p className="mt-2 text-xs text-slate-400">Booking voucher will be emailed to {form.email || "this address"}.{!user && " Sign in keeps it in My Trips."}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <h2 className="mb-2 font-bold text-slate-900">Cancellation policy</h2>
                <p className="text-sm text-slate-500">{hotel.freeCancellation ? "Free cancellation available as per the hotel's policy. Convenience fee is non-refundable." : "This is a non-refundable rate. Convenience fee is non-refundable."}</p>
              </div>
            </div>
            <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <HotelSummaryCard />
              <HotelPriceSummary cta={<Button className="w-full" onClick={submit}>Proceed to Pay <ChevronRight size={16} /></Button>} />
            </div>
          </div>
        </div>
      </main>
      <style>{`.inp{width:100%;border:1px solid #e2e8f0;border-radius:0.75rem;padding:0.625rem 0.875rem;font-size:0.875rem;outline:none}.inp:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(11,99,214,.12)}`}</style>
    </>
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
