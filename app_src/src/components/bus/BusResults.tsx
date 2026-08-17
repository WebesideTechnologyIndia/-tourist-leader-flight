"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bus as BusIcon, SlidersHorizontal, X } from "lucide-react";
import type { BusTrip } from "@/lib/bus-types";
import { BUS_OPERATORS } from "@/lib/bus-constants";
import { cn, formatDate } from "@/lib/utils";
import { useMoney } from "@/store/preferences";
import { BusCard } from "./BusCard";
import { BusSeatMap } from "./BusSeatMap";
import { ModifyBusSearch } from "./ModifyBusSearch";

interface ApiResponse { query: { from: string; to: string; date: string }; buses: BusTrip[]; live: boolean }
const SORTS = [
  { id: "depart", label: "Departure" },
  { id: "price_low", label: "Cheapest" },
  { id: "duration", label: "Fastest" },
  { id: "rating", label: "Top Rated" },
];
const TIME_SLOTS = [
  { id: "before6", label: "Before 6 AM" },
  { id: "6to12", label: "6 AM – 12 PM" },
  { id: "12to18", label: "12 – 6 PM" },
  { id: "after18", label: "After 6 PM" },
];
interface Filters { ac: "all" | "ac" | "nonac"; type: "all" | "sleeper" | "seater"; operators: string[]; slots: string[]; maxPrice: number }
const DEFAULT: Filters = { ac: "all", type: "all", operators: [], slots: [], maxPrice: 0 };

function slotOf(iso: string) { const h = new Date(iso).getHours(); return h < 6 ? "before6" : h < 12 ? "6to12" : h < 18 ? "12to18" : "after18"; }
function toggle<T>(a: T[], v: T) { return a.includes(v) ? a.filter((x) => x !== v) : [...a, v]; }

function FilterPanel({ f, set, bounds }: { f: Filters; set: (x: Filters) => void; bounds: [number, number] }) {
  const [min, max] = bounds; const cur = f.maxPrice || max;
  const money = useMoney();
  return (
    <div className="space-y-5 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between"><h3 className="font-bold text-slate-900">Filters</h3><button onClick={() => set(DEFAULT)} className="text-xs font-semibold text-brand hover:underline">Clear all</button></div>
      <div><p className="mb-2 text-sm font-semibold text-slate-700">AC</p><div className="flex gap-2">{[["all", "All"], ["ac", "AC"], ["nonac", "Non-AC"]].map(([v, l]) => <button key={v} onClick={() => set({ ...f, ac: v as Filters["ac"] })} className={cn("flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold", f.ac === v ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-600")}>{l}</button>)}</div></div>
      <div><p className="mb-2 text-sm font-semibold text-slate-700">Type</p><div className="flex gap-2">{[["all", "All"], ["sleeper", "Sleeper"], ["seater", "Seater"]].map(([v, l]) => <button key={v} onClick={() => set({ ...f, type: v as Filters["type"] })} className={cn("flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold", f.type === v ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-600")}>{l}</button>)}</div></div>
      <div><div className="mb-2 flex justify-between"><p className="text-sm font-semibold text-slate-700">Max fare</p><span className="text-sm font-bold text-brand">{money(cur)}</span></div><input type="range" min={min} max={max} value={cur} onChange={(e) => set({ ...f, maxPrice: Number(e.target.value) })} className="w-full accent-[var(--brand)]" /></div>
      <div><p className="mb-2 text-sm font-semibold text-slate-700">Departure time</p><div className="grid grid-cols-2 gap-2">{TIME_SLOTS.map((s) => <button key={s.id} onClick={() => set({ ...f, slots: toggle(f.slots, s.id) })} className={cn("rounded-lg border px-2 py-1.5 text-xs font-medium", f.slots.includes(s.id) ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-600")}>{s.label}</button>)}</div></div>
      <div><p className="mb-2 text-sm font-semibold text-slate-700">Operators</p><div className="max-h-44 space-y-1.5 overflow-y-auto">{BUS_OPERATORS.map((o) => <label key={o} className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50"><input type="checkbox" checked={f.operators.includes(o)} onChange={() => set({ ...f, operators: toggle(f.operators, o) })} className="accent-[var(--brand)]" /><span className="text-sm text-slate-700">{o}</span></label>)}</div></div>
    </div>
  );
}

export function BusResults() {
  const sp = useSearchParams();
  const qs = sp.toString();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("depart");
  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const [showFilters, setShowFilters] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/bus/search?${qs}`).then((r) => r.json()).then((d: ApiResponse) => { setData(d); setFilters(DEFAULT); setOpenId(null); }).finally(() => setLoading(false));
  }, [qs]);

  const bounds = useMemo<[number, number]>(() => { if (!data?.buses.length) return [300, 3000]; const p = data.buses.map((b) => b.fare); return [Math.min(...p), Math.max(...p)]; }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.buses.filter((b) => {
      if (filters.ac === "ac" && !b.ac) return false;
      if (filters.ac === "nonac" && b.ac) return false;
      if (filters.type === "sleeper" && !b.sleeper) return false;
      if (filters.type === "seater" && b.sleeper) return false;
      if (filters.maxPrice && b.fare > filters.maxPrice) return false;
      if (filters.operators.length && !filters.operators.includes(b.operator)) return false;
      if (filters.slots.length && !filters.slots.includes(slotOf(b.departTime))) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "price_low": return a.fare - b.fare;
        case "duration": return a.durationMinutes - b.durationMinutes;
        case "rating": return b.rating - a.rating;
        default: return new Date(a.departTime).getTime() - new Date(b.departTime).getTime();
      }
    });
    return list;
  }, [data, filters, sort]);

  const q = data?.query;

  return (
    <>
      {q && <ModifyBusSearch query={q} />}
      <div className="mx-auto max-w-7xl px-4 py-5">
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 sm:text-xl"><BusIcon size={20} className="text-brand" /> {q?.from} → {q?.to}</h1>
          {q && <span className="text-sm text-slate-500">{formatDate(q.date)}</span>}
          {data && !data.live && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">Demo buses — live BDSD API pending endpoint docs</span>}
        </div>

        <div className="mb-4 flex items-center gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm no-scrollbar">
          <button onClick={() => setShowFilters(true)} className="lg:hidden flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"><SlidersHorizontal size={15} /> Filters</button>
          <span className="shrink-0 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Sort</span>
          {SORTS.map((s) => <button key={s.id} onClick={() => setSort(s.id)} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold", sort === s.id ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100")}>{s.label}</button>)}
        </div>

        <div className="flex gap-5">
          <aside className="hidden w-72 shrink-0 lg:block"><FilterPanel f={filters} set={setFilters} bounds={bounds} /></aside>
          <div className="flex-1 space-y-3">
            {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer h-28 rounded-2xl bg-white shadow-sm" />)}
            {!loading && filtered.length === 0 && <div className="rounded-2xl bg-white p-10 text-center shadow-sm"><p className="text-lg font-bold text-slate-800">No buses match your filters</p><button onClick={() => setFilters(DEFAULT)} className="mt-2 text-sm font-semibold text-brand hover:underline">Clear filters</button></div>}
            {!loading && q && <>
              <p className="text-sm text-slate-500">{filtered.length} bus{filtered.length !== 1 ? "es" : ""} found</p>
              {filtered.map((b) => (
                <div key={b.id}>
                  <BusCard bus={b} open={openId === b.id} onSelect={() => setOpenId(openId === b.id ? null : b.id)} />
                  {openId === b.id && <div className="-mt-2 overflow-hidden rounded-b-2xl bg-white shadow-sm ring-1 ring-slate-100"><BusSeatMap bus={b} query={q} /></div>}
                </div>
              ))}
            </>}
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Filters</h3><button onClick={() => setShowFilters(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-200"><X size={18} /></button></div>
            <FilterPanel f={filters} set={setFilters} bounds={bounds} />
            <button onClick={() => setShowFilters(false)} className="mt-3 w-full rounded-xl bg-brand py-3 font-semibold text-white">Show {filtered.length} buses</button>
          </div>
        </div>
      )}
    </>
  );
}
