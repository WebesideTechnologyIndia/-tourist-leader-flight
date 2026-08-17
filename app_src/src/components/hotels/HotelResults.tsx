"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BedDouble, SlidersHorizontal, X, Star } from "lucide-react";
import type { Hotel, HotelSearchQuery } from "@/lib/hotel-types";
import { HOTEL_AMENITIES } from "@/lib/hotel-constants";
import { cn, formatDayMonth } from "@/lib/utils";
import { useMoney } from "@/store/preferences";
import { HotelCard } from "./HotelCard";
import { ModifyHotelSearch } from "./ModifyHotelSearch";
import { HotelDetailModal } from "./HotelDetailModal";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useHotelBooking } from "@/store/hotel-booking";
import { useAuth } from "@/store/auth";

interface ApiResponse { query: HotelSearchQuery; hotels: Hotel[]; live: boolean }
const SORTS = [
  { id: "popularity", label: "Popularity" },
  { id: "price_low", label: "Price: Low to High" },
  { id: "price_high", label: "Price: High to Low" },
  { id: "rating", label: "User Rating" },
];

interface Filters { maxPrice: number; stars: number[]; minRating: number; amenities: string[] }
const DEFAULT: Filters = { maxPrice: 0, stars: [], minRating: 0, amenities: [] };
function toggle<T>(a: T[], v: T) { return a.includes(v) ? a.filter((x) => x !== v) : [...a, v]; }

function FilterPanel({ filters, set, bounds }: { filters: Filters; set: (f: Filters) => void; bounds: [number, number] }) {
  const [min, max] = bounds;
  const cur = filters.maxPrice || max;
  const money = useMoney();
  return (
    <div className="space-y-5 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between"><h3 className="font-bold text-slate-900">Filters</h3><button onClick={() => set(DEFAULT)} className="text-xs font-semibold text-brand hover:underline">Clear all</button></div>
      <div>
        <div className="mb-2 flex justify-between"><p className="text-sm font-semibold text-slate-700">Max price / night</p><span className="text-sm font-bold text-brand">{money(cur)}</span></div>
        <input type="range" min={min} max={max} value={cur} onChange={(e) => set({ ...filters, maxPrice: Number(e.target.value) })} className="w-full accent-[var(--brand)]" />
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Star rating</p>
        <div className="flex flex-wrap gap-2">
          {[3, 4, 5].map((s) => (
            <button key={s} onClick={() => set({ ...filters, stars: toggle(filters.stars, s) })} className={cn("flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold", filters.stars.includes(s) ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-600")}>{s} <Star size={11} className="fill-current" /></button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Guest rating</p>
        <div className="flex flex-wrap gap-2">
          {[{ v: 4.5, l: "4.5+" }, { v: 4, l: "4.0+" }, { v: 3.5, l: "3.5+" }].map((r) => (
            <button key={r.v} onClick={() => set({ ...filters, minRating: filters.minRating === r.v ? 0 : r.v })} className={cn("rounded-lg border px-3 py-1.5 text-xs font-semibold", filters.minRating === r.v ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-600")}>{r.l}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Amenities</p>
        <div className="space-y-1.5">
          {HOTEL_AMENITIES.slice(0, 8).map((a) => (
            <label key={a} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-slate-50">
              <input type="checkbox" checked={filters.amenities.includes(a)} onChange={() => set({ ...filters, amenities: toggle(filters.amenities, a) })} className="accent-[var(--brand)]" />
              <span className="text-sm text-slate-700">{a}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function parseHotelQuery(sp: URLSearchParams): HotelSearchQuery {
  const today = new Date().toISOString().slice(0, 10);
  const tmrw = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return {
    city: sp.get("city") || "Goa",
    checkIn: sp.get("checkIn") || today,
    checkOut: sp.get("checkOut") || tmrw,
    rooms: Number(sp.get("rooms") || 1),
    adults: Number(sp.get("adults") || 2),
    children: Number(sp.get("children") || 0),
    priceBand: sp.get("priceBand") || undefined,
  };
}

export function HotelResults() {
  const sp = useSearchParams();
  const router = useRouter();
  const qs = sp.toString();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("popularity");
  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Hotel | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/hotels/search?${qs}`).then((r) => r.json()).then((d: ApiResponse) => { setData(d); setFilters(DEFAULT); }).finally(() => setLoading(false));
  }, [qs]);

  const bounds = useMemo<[number, number]>(() => {
    if (!data?.hotels.length) return [500, 20000];
    const p = data.hotels.map((h) => h.pricePerNight);
    return [Math.min(...p), Math.max(...p)];
  }, [data]);

  const nights = useMemo(() => {
    if (!data) return 1;
    const ci = new Date(data.query.checkIn), co = new Date(data.query.checkOut);
    return Math.max(1, Math.round((co.getTime() - ci.getTime()) / 86400000));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.hotels.filter((h) => {
      if (filters.maxPrice && h.pricePerNight > filters.maxPrice) return false;
      if (filters.stars.length && !filters.stars.includes(h.starRating)) return false;
      if (filters.minRating && h.userRating < filters.minRating) return false;
      if (filters.amenities.length && !filters.amenities.every((a) => h.amenities.includes(a))) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "price_low": return a.pricePerNight - b.pricePerNight;
        case "price_high": return b.pricePerNight - a.pricePerNight;
        case "rating": return b.userRating - a.userRating;
        default: return b.reviews - a.reviews;
      }
    });
    return list;
  }, [data, filters, sort]);

  const q = data?.query;
  const urlQuery = parseHotelQuery(sp);
  const onBook = (h: Hotel, roomName: string, roomPrice: number) => {
    setSelected(null);
    useHotelBooking.getState().select(h, roomName, roomPrice, nights, data?.query || urlQuery);
    useAuth.getState().requireAuth(() => router.push("/hotels/guest"));
  };

  return (
    <>
    <ModifyHotelSearch query={urlQuery} />
    <div className="mx-auto max-w-7xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 sm:text-xl"><BedDouble size={20} className="text-brand" /> Hotels in {q?.city || "…"}</h1>
        {q && <span className="text-sm text-slate-500">{formatDayMonth(q.checkIn)} – {formatDayMonth(q.checkOut)} · {nights} night{nights > 1 ? "s" : ""} · {q.rooms} room, {q.adults + q.children} guests</span>}
        {data && !data.live && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">Demo hotels — live Benzy API pending IP whitelist</span>}
      </div>

      <div className="mb-4 flex items-center gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm no-scrollbar">
        <button onClick={() => setShowFilters(true)} className="lg:hidden flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"><SlidersHorizontal size={15} /> Filters</button>
        <span className="shrink-0 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Sort</span>
        {SORTS.map((s) => (
          <button key={s.id} onClick={() => setSort(s.id)} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold", sort === s.id ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100")}>{s.label}</button>
        ))}
      </div>

      <div className="flex gap-5">
        <aside className="hidden w-72 shrink-0 lg:block"><FilterPanel filters={filters} set={setFilters} bounds={bounds} /></aside>
        <div className="flex-1 space-y-3">
          {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer h-44 rounded-2xl bg-white shadow-sm" />)}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm"><p className="text-lg font-bold text-slate-800">No hotels match your filters</p><button onClick={() => setFilters(DEFAULT)} className="mt-2 text-sm font-semibold text-brand hover:underline">Clear filters</button></div>
          )}
          {!loading && (<><p className="text-sm text-slate-500">{filtered.length} propert{filtered.length !== 1 ? "ies" : "y"} found</p>{filtered.map((h) => <HotelCard key={h.id} hotel={h} nights={nights} onView={() => setSelected(h)} />)}</>)}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Filters</h3><button onClick={() => setShowFilters(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-200"><X size={18} /></button></div>
            <FilterPanel filters={filters} set={setFilters} bounds={bounds} />
            <button onClick={() => setShowFilters(false)} className="mt-3 w-full rounded-xl bg-brand py-3 font-semibold text-white">Show {filtered.length} hotels</button>
          </div>
        </div>
      )}
    </div>

    <HotelDetailModal hotel={selected} nights={nights} onClose={() => setSelected(null)} onBook={onBook} />

    {toast && (
      <div className="fixed bottom-6 left-1/2 z-[200] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl animate-fade-up">
        <Check size={15} className="shrink-0 text-emerald-400" /> {toast}
      </div>
    )}
    </>
  );
}
