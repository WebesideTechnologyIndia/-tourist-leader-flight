"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, IdCard, FileText, CalendarClock, Accessibility, BadgePercent, ChevronRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/ui/Button";
import { InfoPopup } from "@/components/ui/InfoPopup";
import { FlightSummaryCard } from "@/components/booking/FlightSummaryCard";
import { PriceSummary } from "@/components/booking/PriceSummary";
import { OFFERS } from "@/lib/constants";
import { isKnownPromo } from "@/lib/offers";
import { useBooking } from "@/store/booking";
import { useAuth } from "@/store/auth";

export default function BookPage() {
  const router = useRouter();
  const { flight, promoCode, setPromo, setAddOns, addOns } = useBooking();
  const user = useAuth((s) => s.user);
  const authFetched = useAuth((s) => s.fetched);
  const requireAuth = useAuth((s) => s.requireAuth);
  const [promo, setPromoLocal] = useState(promoCode);
  const [promoErr, setPromoErr] = useState("");
  const [wheelchair, setWheelchair] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!useBooking.getState().flight) { router.replace("/"); return; }
    // Require login to be in the booking flow.
    const auth = useAuth.getState();
    if (!auth.fetched) auth.fetchMe();
  }, [router]);

  // open the login gate if the user isn't authenticated once we know the session
  useEffect(() => {
    if (authFetched && !user) requireAuth(() => {});
  }, [authFetched, user, requireAuth]);

  if (!mounted || !flight) return null;

  const applyPromo = () => {
    const code = promo.trim().toUpperCase();
    if (!code) return;
    if (!isKnownPromo(code)) { setPromoErr("Invalid or expired promo code."); return; }
    setPromoErr("");
    setPromo(code);
  };
  const removePromo = () => { setPromo(""); setPromoLocal(""); setPromoErr(""); };

  const toggleWheelchair = () => {
    const next = !wheelchair;
    setWheelchair(next);
    setAddOns(next ? addOns + 0 : Math.max(0, addOns - 0)); // wheelchair is free
  };

  return (
    <>
      <Header active="flights" />
      <main className="flex-1 bg-background">
        <div className="border-b border-slate-200 bg-white py-4"><Stepper current={0} /></div>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-5">
              <FlightSummaryCard />

              {/* Promo + offers */}
              <Section title="Promo code & offers" icon={Tag}>
                <div className="flex gap-2">
                  <input value={promo} onChange={(e) => { setPromoLocal(e.target.value); setPromoErr(""); }} placeholder="Enter promo code"
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm uppercase outline-none focus:border-brand" />
                  <Button variant="outline" onClick={applyPromo}>Apply</Button>
                </div>
                {promoErr && <p className="mt-2 text-xs font-semibold text-rose-500">{promoErr}</p>}
                {promoCode && <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-600">✓ {promoCode} applied — discount shown in Fare Summary <button onClick={removePromo} className="text-slate-400 underline hover:text-rose-500">Remove</button></p>}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {OFFERS.map((o) => (
                    <button key={o.id} onClick={() => { setPromoLocal(o.code); setPromo(o.code); }}
                      className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-left hover:border-brand">
                      <BadgePercent size={16} className="text-brand" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-slate-800">{o.code}</span>
                        <span className="block truncate text-[11px] text-slate-500">{o.title}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </Section>

              {/* Important info */}
              <Section title="Important information" icon={FileText}>
                <div className="divide-y divide-slate-100">
                  <InfoRow icon={IdCard} title="Government ID requirements"
                    body="For all domestic flights carry any one: Aadhaar / PAN / Passport / Driving Licence."
                    popupTitle="ID Proof Required"
                    popup={<p className="text-sm text-slate-700">For all domestic flights, passengers must carry any one of: Aadhaar Card, PAN Card, Passport, Driving Licence. For special fares (student, senior, etc.), carry the supporting document as well.</p>} />
                  <InfoRow icon={FileText} title="Documents for special fares"
                    body="Student ID · Medical ID · Senior citizen proof — as applicable to your fare." />
                  <InfoRow icon={CalendarClock} title="Cancellation & date change"
                    body="Airline rules apply; refunds depend on fare type & timing. Convenience fee non-refundable."
                    popupTitle="Cancellation Policy"
                    popup={<ul className="space-y-1.5 text-sm text-slate-700"><li>• Airline cancellation rules apply.</li><li>• Refunds depend on fare type and timing of cancellation.</li><li>• Tourist Leader convenience fee is non-refundable.</li><li>• No-shows may receive zero refund.</li></ul>} />
                </div>
              </Section>

              {/* Wheelchair */}
              <Section title="Wheelchair assistance" icon={Accessibility}>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-3">
                  <span className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={wheelchair} onChange={toggleWheelchair} className="accent-[var(--brand)]" />
                    Add Wheelchair Assistance <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">FREE</span>
                  </span>
                  <InfoPopup title="Wheelchair Assistance"><p className="text-sm text-slate-700">Airline staff will assist the passenger from check-in counter to boarding gate, and from aircraft to arrival terminal. Prior booking is required to guarantee availability.</p></InfoPopup>
                </label>
              </Section>
            </div>

            <div className="lg:sticky lg:top-20 lg:self-start">
              <PriceSummary cta={
                <Button className="w-full" onClick={() => router.push("/flights/passengers")}>
                  Continue to Travellers <ChevronRight size={16} />
                </Button>
              } />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900"><Icon size={18} className="text-brand" /> {title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, title, body, popup, popupTitle }: { icon: React.ElementType; title: string; body: string; popup?: React.ReactNode; popupTitle?: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">{title}{popup && <InfoPopup title={popupTitle || title}>{popup}</InfoPopup>}</p>
        <p className="mt-0.5 text-xs text-slate-500">{body}</p>
      </div>
    </div>
  );
}
