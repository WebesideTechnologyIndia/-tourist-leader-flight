"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, Loader2, Check, ArrowRight } from "lucide-react";
import type { Flight, FareOption, SearchQuery, TripType, CabinClass } from "@/lib/types";
import { SORT_OPTIONS } from "@/lib/constants";
import { fareBreakdown } from "@/lib/fare-rules";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useMoney } from "@/store/preferences";
import { useBooking, type ItineraryLeg } from "@/store/booking";
import { useAuth } from "@/store/auth";
import { InfoPopup } from "@/components/ui/InfoPopup";
import { FlightSourceBadge } from "@/components/FlightSourceBadge";
import { FareCalendar } from "./FareCalendar";
import { FilterPanel, DEFAULT_FILTERS, type Filters } from "./FilterPanel";
import { FlightCard } from "./FlightCard";
import { ModifySearch } from "./ModifySearch";

interface Leg { from: string; to: string; date: string; label: string }

/** Expand a search query into its itinerary legs (1 one-way, 2 round-trip, N multi-city). */
function buildLegs(sp: URLSearchParams, q: SearchQuery): Leg[] {
  if (q.tripType === "ROUND_TRIP") {
    return [
      { from: q.from, to: q.to, date: q.departDate, label: "Onward" },
      { from: q.to, to: q.from, date: q.returnDate || q.departDate, label: "Return" },
    ];
  }
  if (q.tripType === "MULTI_CITY") {
    const raw = (sp.get("legs") || "").split("~").filter(Boolean);
    const legs = raw.map((s, i) => {
      const p = s.split("-");
      return { from: p[0], to: p[1], date: p.slice(2).join("-"), label: `Flight ${i + 1}` };
    });
    return legs.length ? legs : [{ from: q.from, to: q.to, date: q.departDate, label: "Flight 1" }];
  }
  return [{ from: q.from, to: q.to, date: q.departDate, label: "" }];
}

/** Round-trip / multi-city: pick one flight per leg, then book the combined itinerary. */
function MultiLegResults({ legs, query }: { legs: Leg[]; query: SearchQuery }) {
  const router = useRouter();
  const money = useMoney();
  const setItinerary = useBooking((s) => s.setItinerary);
  const setQuery = useBooking((s) => s.setQuery);
  const requireAuth = useAuth((s) => s.requireAuth);
  const [legFlights, setLegFlights] = useState<Flight[][]>([]);
  const [picks, setPicks] = useState<(ItineraryLeg | null)[]>(() => legs.map(() => null));
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);

  const legsKey = legs.map((l) => `${l.from}-${l.to}-${l.date}`).join("|");

  useEffect(() => {
    setLoading(true);
    setPicks(legs.map(() => null));
    setActive(0);
    Promise.all(
      legs.map((l) => {
        const p = new URLSearchParams({
          from: l.from, to: l.to, departDate: l.date, tripType: "ONE_WAY",
          cabinClass: query.cabinClass, passengerType: query.passengerType || "REGULAR",
          adults: String(query.travellers.adults), children: String(query.travellers.children), infants: String(query.travellers.infants),
        });
        return fetch(`/api/flights/search?${p}`).then((r) => r.json()).then((d) => ((d.flights || []) as Flight[]).slice().sort((a, b) => a.basePrice - b.basePrice));
      })
    ).then(setLegFlights).finally(() => setLoading(false));
  }, [legsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (i: number, flight: Flight, fare: FareOption) => {
    const next = picks.map((p, idx) => (idx === i ? { flight, fare } : p));
    setPicks(next);
    setActive(next.findIndex((p) => !p)); // jump to the next unpicked leg (-1 = all done)
  };

  const allPicked = picks.every(Boolean);
  // Combined per-passenger fare across picked legs; infants billed at the reduced rate.
  const perPaxPicked = picks.reduce((s, p) => s + (p ? p.fare.price : 0), 0);
  const fb = fareBreakdown(query.travellers, perPaxPicked);
  const travellerCount = query.travellers.adults + query.travellers.children + query.travellers.infants;
  const fareTotal = fb.fareTotal;

  const proceed = () => {
    if (!allPicked) return;
    setQuery(query);
    setItinerary(picks as ItineraryLeg[]);
    requireAuth(() => router.push("/flights/book"));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 pb-28">
      {legs.map((leg, i) => {
        const picked = picks[i];
        const isActive = active === i;
        return (
          <div key={i} className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <button onClick={() => setActive(isActive ? -1 : i)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">{i + 1}</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{leg.label} · {leg.from} → {leg.to}</p>
                  <p className="text-xs text-slate-400">{formatDate(leg.date)}{picked ? ` · ${picked.flight.airlineName} ${picked.flight.flightNumber} · ${money(picked.fare.price)} (${picked.fare.label})` : ""}</p>
                </div>
              </div>
              {picked
                ? <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600"><Check size={13} /> {isActive ? "Change" : "Selected"}</span>
                : <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-600">Choose a flight</span>}
            </button>
            {isActive && (
              <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 p-4">
                {loading ? <div className="flex justify-center py-8 text-slate-400"><Loader2 className="animate-spin" /></div>
                  : (legFlights[i] || []).length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No flights found for this leg.</p>
                  : (legFlights[i] || []).map((f, idx) => (
                    <FlightCard key={`${f.source || "SRC"}-${f.id}-${idx}`} flight={f} query={query} onPick={(fl, fr) => pick(i, fl, fr)} selected={picked?.flight.id === f.id} selectedFareId={picked?.flight.id === f.id ? picked?.fare.id : undefined} />
                  ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs text-slate-400">{picks.filter(Boolean).length} of {legs.length} flights selected</p>
            <p className="text-lg font-extrabold text-slate-900">{money(fareTotal)} <span className="text-xs font-medium text-slate-400">· {travellerCount} traveller{travellerCount > 1 ? "s" : ""} · fares only</span></p>
          </div>
          <Button onClick={proceed} disabled={!allPicked}>Continue to book <ArrowRight size={16} /></Button>
        </div>
      </div>
    </div>
  );
}

function parseUrlQuery(sp: URLSearchParams): SearchQuery {
  return {
    tripType: (sp.get("tripType") as TripType) || "ONE_WAY",
    from: sp.get("from") || "DEL",
    to: sp.get("to") || "BOM",
    departDate: sp.get("departDate") || new Date().toISOString().slice(0, 10),
    returnDate: sp.get("returnDate") || undefined,
    cabinClass: (sp.get("cabinClass") as CabinClass) || "Economy",
    travellers: { adults: Number(sp.get("adults") || 1), children: Number(sp.get("children") || 0), infants: Number(sp.get("infants") || 0) },
    passengerType: sp.get("passengerType") || "REGULAR",
  };
}

interface ApiResponse {
  query: SearchQuery;
  flights: Flight[];
  calendar: { date: string; price: number; cheapest?: boolean }[];
  live: boolean;
}

function timeBucket(iso: string) {
  const h = new Date(iso).getHours();
  if (h < 6) return "early";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function SkeletonCard() {
  return <div className="shimmer h-28 rounded-2xl bg-white shadow-sm" />;
}

export function SearchResults() {
  const sp = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("cheapest");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const qs = sp.toString();
  const urlQuery = useMemo(() => parseUrlQuery(sp), [qs]); // eslint-disable-line react-hooks/exhaustive-deps
  const isMultiLeg = urlQuery.tripType === "ROUND_TRIP" || urlQuery.tripType === "MULTI_CITY";
  const legs = useMemo(() => buildLegs(sp, urlQuery), [qs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isMultiLeg) { setLoading(false); return; } // multi-leg fetches per leg in MultiLegResults
    setLoading(true);
    fetch(`/api/flights/search?${qs}`)
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        setData(d);
        // Seed filters from the search query: Advanced Search airline + Non-Stop popular filter.
        const seeded: Filters = { ...DEFAULT_FILTERS };
        const airline = sp.get("airline");
        if (airline) seeded.airlines = [airline.toUpperCase()];
        if (sp.get("nonstop") === "1") seeded.stops = [0];
        setFilters(seeded);
      })
      .finally(() => setLoading(false));
  }, [qs]);

  const priceBounds = useMemo<[number, number]>(() => {
    if (!data?.flights.length) return [1000, 50000];
    const prices = data.flights.map((f) => f.basePrice);
    return [Math.min(...prices), Math.max(...prices)];
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.flights.filter((f) => {
      if (filters.stops.length && !filters.stops.includes(Math.min(f.stops, 2))) return false;
      if (filters.airlines.length && !filters.airlines.includes(f.airlineCode)) return false;
      if (filters.maxPrice && f.basePrice > filters.maxPrice) return false;
      if (filters.refundable === "yes" && !f.refundable) return false;
      if (filters.refundable === "no" && f.refundable) return false;
      if (filters.departBuckets.length && !filters.departBuckets.includes(timeBucket(f.departTime))) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "fastest": return a.durationMinutes - b.durationMinutes;
        case "earliest": return new Date(a.departTime).getTime() - new Date(b.departTime).getTime();
        case "latest": return new Date(b.departTime).getTime() - new Date(a.departTime).getTime();
        default: return a.basePrice - b.basePrice;
      }
    });
    return list;
  }, [data, filters, sort]);

  const onSelectDate = (date: string) => {
    const params = new URLSearchParams(qs);
    params.set("departDate", date);
    router.push(`/flights/search?${params.toString()}`);
  };

  const q = data?.query;

  return (
    <>
    {/* MakeMyTrip-style editable modify-search bar under the header */}
    <ModifySearch query={urlQuery} />

    {isMultiLeg ? (
      <MultiLegResults legs={legs} query={urlQuery} />
    ) : (
    <div className="mx-auto max-w-7xl px-4 py-5">
      {data && !data.live && (
        <div className="mb-3">
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
            Demo fares — live supplier API pending IP whitelist
          </span>
        </div>
      )}

      {/* Fare calendar */}
      {data && <FareCalendar days={data.calendar} selected={q!.departDate} onSelect={onSelectDate} />}

      {/* Sort + filter bar */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm no-scrollbar">
        <button onClick={() => setShowFilters(true)} className="lg:hidden flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700">
          <SlidersHorizontal size={15} /> Filters
        </button>
        <span className="shrink-0 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Sort</span>
        {SORT_OPTIONS.map((s) => (
          <div key={s.id} className="flex shrink-0 items-center">
            <button onClick={() => setSort(s.id)} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors", sort === s.id ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100")}>
              {s.label}
            </button>
            <InfoPopup title={s.label}><p className="text-sm text-slate-700">{s.info}</p></InfoPopup>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-5">
        {/* Desktop filters */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <FilterPanel filters={filters} onChange={setFilters} priceBounds={priceBounds} />
        </aside>

        {/* Results */}
        <div className="flex-1 space-y-3">
          {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-bold text-slate-800">No flights match your filters</p>
              <button onClick={() => setFilters(DEFAULT_FILTERS)} className="mt-2 text-sm font-semibold text-brand hover:underline">Clear filters</button>
            </div>
          )}
          {!loading && (
            <>
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-500">{filtered.length} flight{filtered.length !== 1 ? "s" : ""} found</p>
                {Array.from(new Set(filtered.map((f) => f.source).filter(Boolean))).map((src) => (
                  <FlightSourceBadge key={src} source={src} />
                ))}
              </div>
              {filtered.map((f, idx) => (
                <FlightCard key={`${f.source || "SRC"}-${f.id}-${idx}`} flight={f} query={q!} />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Filters</h3>
              <button onClick={() => setShowFilters(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-200"><X size={18} /></button>
            </div>
            <FilterPanel filters={filters} onChange={setFilters} priceBounds={priceBounds} />
            <button onClick={() => setShowFilters(false)} className="mt-3 w-full rounded-xl bg-brand py-3 font-semibold text-white">Show {filtered.length} flights</button>
          </div>
        </div>
      )}
    </div>
    )}
    </>
  );
}
