"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, Palmtree } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateField } from "@/components/home/DateField";
import { ProductTabs } from "@/components/home/ProductTabs";
import { CitySelect } from "@/components/hotels/CitySelect";
import { RoomsGuestsSelect, type RoomsGuests } from "@/components/hotels/RoomsGuestsSelect";
import { DEMO_PACKAGES, PACKAGE_CATEGORIES } from "@/lib/packages";

function dayOffset(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const DESTS = Array.from(new Set(DEMO_PACKAGES.map((p) => p.country))).map((c) => ({ value: c, label: c, type: "Country" }));
const CATS = PACKAGE_CATEGORIES.filter((c) => c.id !== "ALL").map((c) => ({ value: c.id, label: c.label, type: "Category" }));
const TO_OPTIONS = [...DESTS, ...CATS];

export function PackageSearchWidget() {
  const router = useRouter();
  const [from, setFrom] = useState("New Delhi");
  const [to, setTo] = useState("Vietnam");
  const [depart, setDepart] = useState(dayOffset(14));
  const [rg, setRg] = useState<RoomsGuests>({ rooms: 1, adults: 2, children: 0 });
  const [toOpen, setToOpen] = useState(false);
  const toRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (toRef.current && !toRef.current.contains(e.target as Node)) setToOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const search = () => {
    const params = new URLSearchParams({ from, to, depart, adults: String(rg.adults), children: String(rg.children) });
    router.push(`/holidays/search?${params.toString()}`);
  };

  return (
    <div className="relative rounded-2xl bg-white pb-14 shadow-2xl ring-1 ring-slate-100">
      <div className="border-b border-slate-100 px-4 pt-4 sm:px-6"><ProductTabs active="holidays" /></div>

      <div className="px-4 pt-4 sm:px-6">
        <div className="grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 sm:grid-cols-2 sm:divide-y-0 md:grid-cols-12 md:divide-x">
          <div className="border-b border-slate-200 sm:border-r sm:border-b-0 md:col-span-3 md:border-b-0"><CitySelect value={from} onChange={setFrom} label="From (your city)" /></div>

          {/* To City / Country / Category */}
          <div className="relative border-b border-slate-200 sm:border-b-0 md:col-span-4" ref={toRef}>
            <button type="button" onClick={() => setToOpen((o) => !o)} className="flex w-full flex-col items-start rounded-xl px-4 py-3 text-left hover:bg-slate-50">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">To City / Country / Category</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-2xl font-bold leading-tight text-slate-900"><Palmtree size={18} className="text-brand" /> {to} <ChevronDown size={16} className="text-slate-400" /></span>
            </button>
            {toOpen && (
              <div className="absolute left-0 top-full z-40 mt-2 w-80 max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Destinations</p>
                {DESTS.map((o) => <button key={o.value} onClick={() => { setTo(o.value); setToOpen(false); }} className={cn("block w-full rounded-lg px-3 py-2 text-left text-sm font-medium", to === o.value ? "bg-brand/5 text-brand" : "text-slate-700 hover:bg-slate-50")}>{o.label}</button>)}
                <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Categories</p>
                {CATS.map((o) => <button key={o.value} onClick={() => { setTo(o.label); setToOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">{o.label}</button>)}
              </div>
            )}
          </div>

          <div className="border-b border-slate-200 sm:border-r sm:border-b-0 md:col-span-2 md:border-b-0"><DateField label="Departure" value={depart} min={dayOffset(0)} onChange={setDepart} /></div>
          <div className="md:col-span-3"><RoomsGuestsSelect value={rg} onChange={setRg} maxRooms={9} /></div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Popular:</span>
          {["Honeymoon", "Maldives", "Bali", "Dubai", "Group Tours"].map((t) => (
            <button key={t} onClick={() => setTo(t)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-brand/10 hover:text-brand">{t}</button>
          ))}
        </div>
      </div>

      <button onClick={search} className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gradient-to-r from-brand to-sky-500 px-14 py-4 text-lg font-bold tracking-wide text-white shadow-xl shadow-brand/30 transition-transform hover:scale-[1.03] active:scale-95">
        <Search size={18} /> SEARCH
      </button>
    </div>
  );
}

export { TO_OPTIONS };
