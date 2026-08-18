"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { CitySelect } from "./CitySelect";
import { RoomsGuestsSelect, type RoomsGuests } from "./RoomsGuestsSelect";
import { DateField } from "@/components/home/DateField";
import type { HotelSearchQuery } from "@/lib/hotel-types";

function dayOffset(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function ModifyHotelSearch({ query }: { query: HotelSearchQuery }) {
  const router = useRouter();
  const [city, setCity] = useState(query.city);
  const [checkIn, setCheckIn] = useState(query.checkIn);
  const [checkOut, setCheckOut] = useState(query.checkOut);
  const [rg, setRg] = useState<RoomsGuests>({ rooms: query.rooms, adults: query.adults, children: query.children });

  useEffect(() => {
    setCity(query.city); setCheckIn(query.checkIn); setCheckOut(query.checkOut);
    setRg({ rooms: query.rooms, adults: query.adults, children: query.children });
  }, [query]);

  const submit = () => {
    const params = new URLSearchParams({
      city, checkIn, checkOut,
      rooms: String(rg.rooms), adults: String(rg.adults), children: String(rg.children),
      ...(query.priceBand ? { priceBand: query.priceBand } : {}),
    });
    router.push(`/hotels/search?${params.toString()}`);
  };

  return (
    <div className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:items-stretch">
            <div className="rounded-xl border border-slate-200 lg:min-w-[220px] lg:flex-1"><CitySelect value={city} onChange={setCity} compact /></div>
            <div className="rounded-xl border border-slate-200 lg:min-w-[130px]"><DateField label="Check-In" value={checkIn} min={dayOffset(0)} onChange={(v) => { setCheckIn(v); if (v >= checkOut) setCheckOut(v); }} compact /></div>
            <div className="rounded-xl border border-slate-200 lg:min-w-[130px]"><DateField label="Check-Out" value={checkOut} min={checkIn} onChange={setCheckOut} compact /></div>
            <div className="rounded-xl border border-slate-200 lg:min-w-[170px]"><RoomsGuestsSelect value={rg} onChange={setRg} compact /></div>
          </div>
          <button onClick={submit} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-sky-500 px-8 py-2.5 text-sm font-bold tracking-wide text-white shadow hover:opacity-95 lg:px-10">
            <Search size={16} /> SEARCH
          </button>
        </div>
      </div>
    </div>
  );
}
