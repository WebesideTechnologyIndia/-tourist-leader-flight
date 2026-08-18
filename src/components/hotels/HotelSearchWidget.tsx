"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateField } from "@/components/home/DateField";
import { ProductTabs } from "@/components/home/ProductTabs";
import { CitySelect } from "./CitySelect";
import { RoomsGuestsSelect, type RoomsGuests } from "./RoomsGuestsSelect";
import { HOTEL_PRICE_BANDS, TRENDING_HOTEL_SEARCHES } from "@/lib/hotel-constants";

function dayOffset(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function HotelSearchWidget() {
  const router = useRouter();
  const [city, setCity] = useState("Goa");
  const [checkIn, setCheckIn] = useState(dayOffset(3));
  const [checkOut, setCheckOut] = useState(dayOffset(4));
  const [rg, setRg] = useState<RoomsGuests>({ rooms: 1, adults: 2, children: 0 });
  const [priceBand, setPriceBand] = useState("any");
  const [mode, setMode] = useState<"rooms" | "group">("rooms");
  const [priceOpen, setPriceOpen] = useState(false);

  const maxRooms = mode === "group" ? 30 : 4;

  const switchMode = (m: "rooms" | "group") => {
    setMode(m);
    if (m === "group" && rg.rooms <= 4) setRg({ rooms: 5, adults: 10, children: 0 });
    if (m === "rooms" && rg.rooms > 4) setRg({ rooms: 4, adults: Math.min(rg.adults, 8), children: rg.children });
  };

  const search = () => {
    const params = new URLSearchParams({
      city, checkIn, checkOut,
      rooms: String(rg.rooms), adults: String(rg.adults), children: String(rg.children),
      priceBand,
    });
    router.push(`/hotels/search?${params.toString()}`);
  };

  const priceLabel = HOTEL_PRICE_BANDS.find((p) => p.id === priceBand)?.label || "Any price";

  return (
    <div className="relative rounded-2xl bg-white pb-14 shadow-2xl ring-1 ring-slate-100">
      {/* Product tabs */}
      <div className="border-b border-slate-100 px-4 pt-4 sm:px-6">
        <ProductTabs active="hotels" />
      </div>

      <div className="px-4 pt-4 sm:px-6">
        {/* mode + hint */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {([["rooms", "Up to 4 Rooms"], ["group", "Group Deals"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => switchMode(id)} className={cn("flex items-center gap-2 text-sm font-semibold", mode === id ? "text-brand" : "text-slate-600")}>
              <span className={cn("grid h-4 w-4 place-items-center rounded-full border-2", mode === id ? "border-brand" : "border-slate-300")}>{mode === id && <span className="h-2 w-2 rounded-full bg-brand" />}</span>
              {label}
              {id === "group" && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-600">NEW</span>}
            </button>
          ))}
          <span className="ml-auto hidden text-sm font-medium text-slate-500 sm:block">Book Domestic & International Hotels</span>
        </div>

        {/* Field box */}
        <div className="mt-3 grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 sm:grid-cols-2 sm:divide-y-0 md:grid-cols-12 md:divide-x">
          <div className="border-b border-slate-200 sm:border-r sm:border-b-0 md:col-span-4 md:border-b-0">
            <CitySelect value={city} onChange={setCity} />
          </div>
          <div className="grid grid-cols-2 border-b border-slate-200 sm:border-b-0 md:col-span-4">
            <div className="border-r border-slate-200"><DateField label="Check-In" value={checkIn} min={dayOffset(0)} onChange={(v) => { setCheckIn(v); if (v >= checkOut) setCheckOut(dayOffset(0) === v ? v : v); }} /></div>
            <DateField label="Check-Out" value={checkOut} min={checkIn} onChange={setCheckOut} />
          </div>
          <div className="border-b border-slate-200 sm:border-r sm:border-b-0 md:col-span-2 md:border-b-0">
            <RoomsGuestsSelect value={rg} onChange={setRg} maxRooms={maxRooms} />
          </div>
          <div className="relative md:col-span-2">
            <button type="button" onClick={() => setPriceOpen((o) => !o)} className="flex h-full w-full flex-col items-start rounded-xl px-4 py-3 text-left hover:bg-slate-50">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Price / Night</span>
              <span className="mt-0.5 flex items-center gap-1 text-base font-bold leading-tight text-slate-900">{priceLabel} <ChevronDown size={14} /></span>
            </button>
            {priceOpen && (
              <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                {HOTEL_PRICE_BANDS.map((p) => (
                  <button key={p.id} onClick={() => { setPriceBand(p.id); setPriceOpen(false); }} className={cn("block w-full rounded-lg px-3 py-2 text-left text-sm font-medium", priceBand === p.id ? "bg-brand/5 text-brand" : "text-slate-700 hover:bg-slate-50")}>{p.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {mode === "group" && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
            <b>Group Deals:</b> booking 5+ rooms unlocks special group pricing & dedicated assistance. Add up to {maxRooms} rooms.
          </p>
        )}

        {/* Trending */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Trending:</span>
          {TRENDING_HOTEL_SEARCHES.map((t) => (
            <button key={t} onClick={() => setCity(t)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-brand/10 hover:text-brand">{t}</button>
          ))}
        </div>
      </div>

      <button onClick={search} className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gradient-to-r from-brand to-sky-500 px-14 py-4 text-lg font-bold tracking-wide text-white shadow-xl shadow-brand/30 transition-transform hover:scale-[1.03] active:scale-95">
        <Search size={18} /> SEARCH
      </button>
    </div>
  );
}
