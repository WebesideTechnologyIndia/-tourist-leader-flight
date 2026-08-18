"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import { DateField } from "@/components/home/DateField";
import { ProductTabs } from "@/components/home/ProductTabs";
import { BusCitySelect } from "./BusCitySelect";
import { BUS_TRENDING } from "@/lib/bus-constants";

function dayOffset(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function BusSearchWidget() {
  const router = useRouter();
  // Names are for display; the BDSD city id is what the search API needs, since
  // 318 names in their master list belong to two different cities.
  const [from, setFrom] = useState({ name: "Delhi", id: 1354 });
  const [to, setTo] = useState({ name: "Kanpur", id: 142 });
  const [date, setDate] = useState(dayOffset(1));

  const swap = () => { setFrom(to); setTo(from); };
  const search = () => router.push(
    `/bus/search?from=${encodeURIComponent(from.name)}&fromId=${from.id}&to=${encodeURIComponent(to.name)}&toId=${to.id}&date=${date}`
  );

  return (
    <div className="relative rounded-2xl bg-white pb-14 shadow-2xl ring-1 ring-slate-100">
      <div className="border-b border-slate-100 px-4 pt-4 sm:px-6"><ProductTabs active="bus" /></div>
      <div className="px-4 pt-4 sm:px-6">
        <p className="mb-2 text-center text-sm font-semibold text-slate-500">Bus Ticket Booking</p>
        <div className="grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 sm:grid-cols-2 sm:divide-y-0 md:grid-cols-12 md:divide-x">
          <div className="relative grid grid-cols-2 border-b border-slate-200 sm:border-b-0 md:col-span-7">
            <div className="min-w-0 border-r border-slate-200 pr-5"><BusCitySelect label="From" value={from.name} onChange={(name, id) => setFrom({ name, id })} /></div>
            <div className="min-w-0 pl-5"><BusCitySelect label="To" value={to.name} onChange={(name, id) => setTo({ name, id })} /></div>
            <button onClick={swap} className="absolute left-1/2 top-1/2 z-20 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-brand shadow-md transition-transform hover:rotate-180" aria-label="Swap"><ArrowLeftRight size={16} /></button>
          </div>
          <div className="md:col-span-5"><DateField label="Travel Date" value={date} min={dayOffset(0)} onChange={setDate} /></div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Trending routes:</span>
          {BUS_TRENDING.map((t) => (
            <button key={`${t.from}-${t.to}`} onClick={() => { setFrom({ name: t.from, id: t.fromId }); setTo({ name: t.to, id: t.toId }); }} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-brand/10 hover:text-brand">{t.from} → {t.to}</button>
          ))}
        </div>
      </div>
      <button onClick={search} className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gradient-to-r from-brand to-sky-500 px-14 py-4 text-lg font-bold tracking-wide text-white shadow-xl shadow-brand/30 transition-transform hover:scale-[1.03] active:scale-95"><Search size={18} /> SEARCH</button>
    </div>
  );
}
