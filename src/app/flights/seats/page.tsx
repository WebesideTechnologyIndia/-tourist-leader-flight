"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Armchair, Plane } from "lucide-react";
import { Header } from "@/components/Header";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/ui/Button";
import { PriceSummary } from "@/components/booking/PriceSummary";
import { useBooking } from "@/store/booking";
import { seatCharge, seatablePax, seatBasePrice, addOnsTotal, type SsrMap } from "@/lib/fare-rules";
import { cn, formatINR } from "@/lib/utils";

const COLS = ["A", "B", "C", "D", "E", "F"];
const ROWS = 20;

type SeatState = "available" | "booked" | "premium" | "selected";

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

export default function SeatsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pax, setPax] = useState<string[]>([]);
  const [activeLeg, setActiveLeg] = useState(0);
  const [active, setActive] = useState(0);
  const [seats, setSeats] = useState<SsrMap>({});
  const { setSeat } = useBooking();
  const legs = useLegs();

  // deterministic "booked" seats
  const booked = useMemo(() => {
    const s = new Set<string>();
    for (let r = 1; r <= ROWS; r++) for (const c of COLS) if ((r * 7 + c.charCodeAt(0)) % 5 === 0) s.add(`${r}${c}`);
    return s;
  }, []);

  useEffect(() => {
    setMounted(true);
    const st = useBooking.getState();
    if (!st.flight || !st.query) { router.replace("/"); return; }
    // Infants travel on lap — only adults + children get a seat.
    const seatable = seatablePax(st.query.travellers);
    const names = st.passengers.length ? st.passengers.slice(0, seatable).map((p) => p.fullName || "Passenger") : ["Passenger"];
    setPax(names);
    setSeats(st.seats);
  }, [router]);

  if (!mounted) return null;

  const legFareId = legs[activeLeg]?.fareId;
  const legSeats = seats[activeLeg] || {};
  const chosen = new Set(Object.values(legSeats));

  const pick = (id: string) => {
    if (booked.has(id) || (chosen.has(id) && legSeats[active] !== id)) return;
    const nextLeg = { ...legSeats, [active]: id };
    const next: SsrMap = { ...seats, [activeLeg]: nextLeg };
    setSeats(next);
    setSeat(activeLeg, active, id);
    recalc(next);
    // advance to the next passenger on this leg
    if (active < pax.length - 1) setActive(active + 1);
  };

  const recalc = (s: SsrMap) => {
    const st = useBooking.getState();
    const fareIds = [st.fare?.id, ...st.extraFlights.map((e) => e.fare?.id)];
    useBooking.setState({ addOns: addOnsTotal(s, st.meals, fareIds) });
  };

  const proceed = () => router.push("/flights/meals");

  return (
    <>
      <Header active="flights" />
      <main className="flex-1 bg-background">
        <div className="border-b border-slate-200 bg-white py-4"><Stepper current={2} /></div>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              {/* Leg switcher — pick a seat for EACH flight (onward + return / multi-city) */}
              {legs.length > 1 && (
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="mb-2 px-1 text-xs font-medium text-slate-500">Choose seats for each flight — switch between them here.</p>
                  <div className="flex flex-wrap gap-2">
                    {legs.map((leg, i) => {
                      const filled = Object.keys(seats[i] || {}).length;
                      return (
                        <button key={i} onClick={() => { setActiveLeg(i); setActive(0); }}
                          className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm", activeLeg === i ? "border-brand bg-brand/10" : "border-slate-200")}>
                          <Plane size={14} className="text-brand" />
                          <span>
                            <span className="block text-xs text-slate-400">{leg.label} · {leg.from} → {leg.to}</span>
                            <span className="font-semibold text-slate-800">{filled ? `${filled} seat${filled > 1 ? "s" : ""} chosen` : "Select seats"}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* passenger tabs */}
              <div className="rounded-2xl bg-white p-3 shadow-sm">
                {pax.length > 1 && <p className="mb-2 px-1 text-xs font-medium text-slate-500">Tap a traveller, then choose their seat — repeat for each passenger.</p>}
                <div className="flex flex-wrap gap-2">
                  {pax.map((name, i) => (
                    <button key={i} onClick={() => setActive(i)}
                      className={cn("rounded-xl border px-3 py-2 text-left text-sm", active === i ? "border-brand bg-brand/10" : "border-slate-200")}>
                      <span className="block text-xs text-slate-400">{name || `Passenger ${i + 1}`}</span>
                      <span className="font-semibold text-slate-800">{legSeats[i] || "Select seat"}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* legend */}
              <div className="flex flex-wrap gap-4 rounded-2xl bg-white p-3 text-xs text-slate-600 shadow-sm">
                <Legend color="bg-white ring-1 ring-slate-300" label="Available" />
                <Legend color="bg-violet-200 ring-1 ring-violet-300" label="Premium" />
                <Legend color="bg-brand" label="Selected" />
                <Legend color="bg-slate-300" label="Booked" />
              </div>

              {/* seat map */}
              <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm">
                <div className="mx-auto w-fit">
                  <div className="mb-2 rounded-t-[3rem] border-b-2 border-slate-200 pb-2 text-center text-xs font-semibold text-slate-400">FRONT · Cockpit{legs.length > 1 ? ` · ${legs[activeLeg]?.label}` : ""}</div>
                  <div className="ml-8 mb-1 flex gap-2 text-[10px] text-slate-400">
                    {COLS.map((c, i) => <span key={c} className={cn("w-8 text-center", i === 3 && "ml-6")}>{c}</span>)}
                  </div>
                  {Array.from({ length: ROWS }).map((_, r) => {
                    const row = r + 1;
                    return (
                      <div key={row} className="mb-1 flex items-center gap-2">
                        <span className="w-6 text-right text-[10px] text-slate-400">{row}</span>
                        {COLS.map((c, i) => {
                          const id = `${row}${c}`;
                          const price = seatBasePrice(id);
                          let state: SeatState = price >= 450 ? "premium" : "available";
                          if (booked.has(id)) state = "booked";
                          if (legSeats[active] === id) state = "selected";
                          else if (chosen.has(id)) state = "booked";
                          return (
                            <button key={id} onClick={() => pick(id)} disabled={state === "booked"}
                              title={state === "booked" ? "Unavailable" : `${id} · ${seatCharge(legFareId, price) === 0 ? "Free" : formatINR(seatCharge(legFareId, price))}`}
                              className={cn(
                                "group relative grid h-8 w-8 place-items-center rounded-lg text-[9px] font-bold transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100",
                                i === 3 && "ml-6",
                                state === "available" && "bg-white text-slate-500 ring-1 ring-slate-300 hover:ring-brand",
                                state === "premium" && "bg-violet-200 text-violet-700 ring-1 ring-violet-300",
                                state === "selected" && "bg-brand text-white ring-2 ring-brand",
                                state === "booked" && "bg-slate-300 text-slate-400"
                              )}>
                              <Armchair size={14} />
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <PriceSummary cta={
                <div className="space-y-2">
                  <Button className="w-full" onClick={proceed}>Continue to Meals <ChevronRight size={16} /></Button>
                  <button onClick={proceed} className="w-full text-center text-xs font-semibold text-slate-500 hover:text-brand">Skip seat selection</button>
                </div>
              } />
              {legFareId && <p className="px-1 text-[11px] text-slate-400">{legFareId === "COMFORT" || legFareId === "YOUR_CHOICE" ? "Your fare includes a free standard seat." : "Tip: Emergency row seats may be restricted to adults only."}</p>}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={cn("h-4 w-4 rounded", color)} /> {label}</span>;
}
