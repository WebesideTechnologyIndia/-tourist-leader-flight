"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, Palmtree } from "lucide-react";
import { cn } from "@/lib/utils";
import { CitySelect } from "@/components/hotels/CitySelect";
import { RoomsGuestsSelect, type RoomsGuests } from "@/components/hotels/RoomsGuestsSelect";
import { DateField } from "@/components/home/DateField";
import { DEMO_PACKAGES, PACKAGE_CATEGORIES } from "@/lib/packages";

function dayOffset(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
const DESTS = Array.from(new Set(DEMO_PACKAGES.map((p) => p.country)));
const CATS = PACKAGE_CATEGORIES.filter((c) => c.id !== "ALL").map((c) => c.label);

export function ModifyHolidaySearch() {
  const router = useRouter();
  const [from, setFrom] = useState("New Delhi");
  const [to, setTo] = useState("Vietnam");
  const [depart, setDepart] = useState(dayOffset(14));
  const [rg, setRg] = useState<RoomsGuests>({ rooms: 1, adults: 2, children: 0 });
  const [toOpen, setToOpen] = useState(false);
  const toRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setFrom(sp.get("from") || "New Delhi");
    setTo(sp.get("to") || "Vietnam");
    setDepart(sp.get("depart") || dayOffset(14));
    setRg({ rooms: 1, adults: Number(sp.get("adults") || 2), children: Number(sp.get("children") || 0) });
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (toRef.current && !toRef.current.contains(e.target as Node)) setToOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const submit = () => {
    const params = new URLSearchParams({ from, to, depart, adults: String(rg.adults), children: String(rg.children) });
    router.push(`/holidays/search?${params.toString()}`);
  };

  return (
    <div className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:items-stretch">
            <div className="rounded-xl border border-slate-200 lg:min-w-[180px] lg:flex-1"><CitySelect value={from} onChange={setFrom} compact /></div>

            <div className="relative rounded-xl border border-slate-200 lg:min-w-[200px] lg:flex-1" ref={toRef}>
              <button type="button" onClick={() => setToOpen((o) => !o)} className="flex h-full w-full flex-col items-start rounded-xl px-3 py-2 text-left hover:bg-slate-50">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">To / Category</span>
                <span className="flex items-center gap-1 text-base font-bold leading-tight text-slate-900"><Palmtree size={14} className="text-brand" /> {to} <ChevronDown size={13} /></span>
              </button>
              {toOpen && (
                <div className="absolute left-0 top-full z-40 mt-1 max-h-72 w-72 max-w-[90vw] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  <p className="px-3 pt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Destinations</p>
                  {DESTS.map((d) => <button key={d} onClick={() => { setTo(d); setToOpen(false); }} className={cn("block w-full rounded-lg px-3 py-2 text-left text-sm font-medium", to === d ? "bg-brand/5 text-brand" : "text-slate-700 hover:bg-slate-50")}>{d}</button>)}
                  <p className="px-3 pt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Categories</p>
                  {CATS.map((c) => <button key={c} onClick={() => { setTo(c); setToOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">{c}</button>)}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 lg:min-w-[130px]"><DateField label="Departure" value={depart} min={dayOffset(0)} onChange={setDepart} compact /></div>
            <div className="rounded-xl border border-slate-200 lg:min-w-[160px]"><RoomsGuestsSelect value={rg} onChange={setRg} compact maxRooms={9} /></div>
          </div>
          <button onClick={submit} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-sky-500 px-8 py-2.5 text-sm font-bold tracking-wide text-white shadow hover:opacity-95 lg:px-10">
            <Search size={16} /> SEARCH
          </button>
        </div>
      </div>
    </div>
  );
}
