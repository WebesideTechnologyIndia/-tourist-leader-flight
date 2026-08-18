"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Search } from "lucide-react";
import { BusCitySelect } from "./BusCitySelect";
import { DateField } from "@/components/home/DateField";

function dayOffset(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function ModifyBusSearch({ query }: { query: { from: string; to: string; date: string; fromId?: number; toId?: number } }) {
  const router = useRouter();
  // Carry the BDSD city id alongside the name — the name alone is ambiguous for
  // 318 cities in their master list.
  const [from, setFrom] = useState({ name: query.from, id: query.fromId });
  const [to, setTo] = useState({ name: query.to, id: query.toId });
  const [date, setDate] = useState(query.date);

  useEffect(() => {
    setFrom({ name: query.from, id: query.fromId });
    setTo({ name: query.to, id: query.toId });
    setDate(query.date);
  }, [query]);

  const submit = () => {
    const p = new URLSearchParams({ from: from.name, to: to.name, date });
    if (from.id) p.set("fromId", String(from.id));
    if (to.id) p.set("toId", String(to.id));
    router.push(`/bus/search?${p}`);
  };

  return (
    <div className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:items-stretch">
            <div className="relative grid grid-cols-2 rounded-xl border border-slate-200 sm:col-span-2 lg:min-w-[300px] lg:flex-1">
              <div className="min-w-0 border-r border-slate-200 pr-4"><BusCitySelect label="From" value={from.name} onChange={(name, id) => setFrom({ name, id })} compact /></div>
              <div className="min-w-0 pl-4"><BusCitySelect label="To" value={to.name} onChange={(name, id) => setTo({ name, id })} compact /></div>
              <button onClick={() => { setFrom(to); setTo(from); }} className="absolute left-1/2 top-1/2 z-20 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-brand shadow transition-transform hover:rotate-180" aria-label="Swap"><ArrowLeftRight size={13} /></button>
            </div>
            <div className="rounded-xl border border-slate-200 lg:min-w-[150px]"><DateField label="Travel Date" value={date} min={dayOffset(0)} onChange={setDate} compact /></div>
          </div>
          <button onClick={submit} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-sky-500 px-8 py-2.5 text-sm font-bold tracking-wide text-white shadow hover:opacity-95 lg:px-10"><Search size={16} /> SEARCH</button>
        </div>
      </div>
    </div>
  );
}
