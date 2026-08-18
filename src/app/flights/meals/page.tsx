"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Salad, Drumstick, Nut, Apple, Soup, Check, Plane } from "lucide-react";
import { Header } from "@/components/Header";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/ui/Button";
import { InfoPopup } from "@/components/ui/InfoPopup";
import { PriceSummary } from "@/components/booking/PriceSummary";
import { useBooking } from "@/store/booking";
import { MEALS } from "@/lib/constants";
import { mealCharge, seatablePax, addOnsTotal, type SsrMap } from "@/lib/fare-rules";
import { cn, formatINR } from "@/lib/utils";

const ICONS: Record<string, React.ElementType> = { veg: Salad, nonveg: Drumstick, dryfruits: Nut, fruits: Apple, special: Soup };

interface Leg { label: string; from: string; to: string; fareId?: string }

/** Build the itinerary legs (onward + any return / multi-city legs) with their per-leg fare. */
function useLegs(): Leg[] {
  return useMemo(() => {
    const st = useBooking.getState();
    const q = st.query;
    const legs: Leg[] = [{ label: "", from: st.flight?.from || "", to: st.flight?.to || "", fareId: st.fare?.id }];
    st.extraFlights.forEach((e, i) => legs.push({
      label: q?.tripType === "ROUND_TRIP" ? "Return" : `Flight ${i + 2}`,
      from: e.flight.from, to: e.flight.to, fareId: e.fare?.id,
    }));
    if (legs.length > 1 && q?.tripType === "ROUND_TRIP") legs[0].label = "Onward";
    else if (legs.length > 1) legs[0].label = "Flight 1";
    return legs;
  }, []);
}

export default function MealsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pax, setPax] = useState<string[]>([]);
  const [activeLeg, setActiveLeg] = useState(0);
  const [active, setActive] = useState(0);
  const [meals, setMeals] = useState<SsrMap>({});
  const { setMeal } = useBooking();
  const legs = useLegs();

  useEffect(() => {
    setMounted(true);
    const st = useBooking.getState();
    if (!st.flight || !st.query) { router.replace("/"); return; }
    // Infants travel on lap — only adults + children pick a meal.
    const seatable = seatablePax(st.query.travellers);
    setPax(st.passengers.length ? st.passengers.slice(0, seatable).map((p) => p.fullName || "Passenger") : ["Passenger"]);
    setMeals(st.meals);
  }, [router]);

  if (!mounted) return null;

  const legFareId = legs[activeLeg]?.fareId;
  const legMeals = meals[activeLeg] || {};

  const recalc = (m: SsrMap) => {
    const st = useBooking.getState();
    const fareIds = [st.fare?.id, ...st.extraFlights.map((e) => e.fare?.id)];
    useBooking.setState({ addOns: addOnsTotal(st.seats, m, fareIds) });
  };

  const pick = (mealId: string) => {
    const nextLeg = { ...legMeals, [active]: legMeals[active] === mealId ? "" : mealId };
    const next: SsrMap = { ...meals, [activeLeg]: nextLeg };
    setMeals(next);
    setMeal(activeLeg, active, nextLeg[active]);
    recalc(next);
  };

  return (
    <>
      <Header active="flights" />
      <main className="flex-1 bg-background">
        <div className="border-b border-slate-200 bg-white py-4"><Stepper current={3} /></div>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              {/* Leg switcher — pick a meal for EACH flight (onward + return / multi-city) */}
              {legs.length > 1 && (
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="mb-2 px-1 text-xs font-medium text-slate-500">Choose meals for each flight — switch between them here.</p>
                  <div className="flex flex-wrap gap-2">
                    {legs.map((leg, i) => {
                      const filled = Object.values(meals[i] || {}).filter(Boolean).length;
                      return (
                        <button key={i} onClick={() => { setActiveLeg(i); setActive(0); }}
                          className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm", activeLeg === i ? "border-brand bg-brand/10" : "border-slate-200")}>
                          <Plane size={14} className="text-brand" />
                          <span>
                            <span className="block text-xs text-slate-400">{leg.label} · {leg.from} → {leg.to}</span>
                            <span className="font-semibold text-slate-800">{filled ? `${filled} meal${filled > 1 ? "s" : ""} chosen` : "Select meals"}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-white p-3 shadow-sm">
                {pax.length > 1 && <p className="mb-2 px-1 text-xs font-medium text-slate-500">Tap a traveller, then pick their meal — repeat for each passenger.</p>}
                <div className="flex flex-wrap gap-2">
                  {pax.map((name, i) => (
                    <button key={i} onClick={() => setActive(i)}
                      className={cn("rounded-xl border px-3 py-2 text-left text-sm", active === i ? "border-brand bg-brand/10" : "border-slate-200")}>
                      <span className="block text-xs text-slate-400">{name || `Passenger ${i + 1}`}</span>
                      <span className="font-semibold text-slate-800">{MEALS.find((m) => m.id === legMeals[i])?.label || "No meal"}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {MEALS.map((m) => {
                  const Icon = ICONS[m.id];
                  const selected = legMeals[active] === m.id;
                  return (
                    <div key={m.id} className={cn("flex items-center gap-3 rounded-2xl border-2 bg-white p-4 shadow-sm transition-colors", selected ? "border-brand" : "border-transparent ring-1 ring-slate-100")}>
                      <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl", selected ? "bg-brand text-white" : "bg-slate-100 text-slate-500")}>
                        <Icon size={22} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="flex items-center gap-1.5 font-semibold text-slate-800">{m.label}<InfoPopup title={m.label}><p className="text-sm text-slate-700">{m.info}</p></InfoPopup></p>
                        <p className="text-sm font-bold text-brand">{mealCharge(legFareId, m.id, m.price) === 0 ? "Included free" : formatINR(m.price)}</p>
                      </div>
                      <Button size="sm" variant={selected ? "primary" : "outline"} onClick={() => pick(m.id)}>
                        {selected ? <><Check size={14} /> Added</> : "Add"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:sticky lg:top-20 lg:self-start">
              <PriceSummary cta={
                <div className="space-y-2">
                  <Button className="w-full" onClick={() => router.push("/flights/payment")}>Continue to Payment <ChevronRight size={16} /></Button>
                  <button onClick={() => router.push("/flights/payment")} className="w-full text-center text-xs font-semibold text-slate-500 hover:text-brand">Skip meal selection</button>
                </div>
              } />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
