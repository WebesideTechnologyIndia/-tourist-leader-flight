"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, ChevronDown, Search, ShieldCheck } from "lucide-react";
import { AirportSelect } from "@/components/home/AirportSelect";
import { TravellerSelect } from "@/components/home/TravellerSelect";
import { DateField } from "@/components/home/DateField";
import { PASSENGER_TYPES, TRIP_TYPES } from "@/lib/constants";
import type { CabinClass, SearchQuery, TravellerCount, TripType } from "@/lib/types";
import { cn } from "@/lib/utils";

function tomorrow(offset = 1) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

const FARE_SHORT = ["REGULAR", "STUDENT", "SENIOR", "ARMED_FORCES", "MEDICAL", "DISABILITY"];

export function ModifySearch({ query }: { query: SearchQuery }) {
  const router = useRouter();
  const [tripType, setTripType] = useState<TripType>(query.tripType);
  const [from, setFrom] = useState(query.from);
  const [to, setTo] = useState(query.to);
  const [departDate, setDepartDate] = useState(query.departDate);
  const [returnDate, setReturnDate] = useState(query.returnDate || "");
  const [cabinClass, setCabinClass] = useState<CabinClass>(query.cabinClass);
  const [travellers, setTravellers] = useState<TravellerCount>(query.travellers);
  const [passengerType, setPassengerType] = useState(query.passengerType);
  const [tripOpen, setTripOpen] = useState(false);
  const tripRef = useRef<HTMLDivElement>(null);

  // keep in sync if the URL/query changes (e.g. fare-calendar date click)
  useEffect(() => {
    setTripType(query.tripType); setFrom(query.from); setTo(query.to);
    setDepartDate(query.departDate); setReturnDate(query.returnDate || "");
    setCabinClass(query.cabinClass); setTravellers(query.travellers); setPassengerType(query.passengerType);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (tripRef.current && !tripRef.current.contains(e.target as Node)) setTripOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const swap = () => { setFrom(to); setTo(from); };

  const submit = () => {
    const params = new URLSearchParams({
      tripType, from, to, departDate, cabinClass,
      adults: String(travellers.adults), children: String(travellers.children), infants: String(travellers.infants),
      passengerType,
    });
    if (tripType === "ROUND_TRIP" && returnDate) params.set("returnDate", returnDate);
    router.push(`/flights/search?${params.toString()}`);
  };

  const tripLabel = TRIP_TYPES.find((t) => t.id === tripType)?.label;
  const fareTypes = PASSENGER_TYPES.filter((p) => FARE_SHORT.includes(p.id));

  return (
    <div className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-3">
        {/* Fields */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:items-stretch">
            {/* Trip type */}
            <div className="relative" ref={tripRef}>
              <button onClick={() => setTripOpen((o) => !o)} className="flex h-full w-full flex-col items-start rounded-xl border border-slate-200 px-3 py-2 text-left hover:border-brand">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Trip Type</span>
                <span className="flex items-center gap-1 text-base font-bold text-slate-900">{tripLabel} <ChevronDown size={14} /></span>
              </button>
              {tripOpen && (
                <div className="absolute left-0 top-full z-40 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                  {TRIP_TYPES.map((t) => (
                    <button key={t.id} onClick={() => { setTripType(t.id as TripType); setTripOpen(false); if (t.id === "ROUND_TRIP" && !returnDate) setReturnDate(tomorrow(7)); }}
                      className={cn("block w-full rounded-lg px-3 py-2 text-left text-sm font-medium", tripType === t.id ? "bg-brand/5 text-brand" : "text-slate-700 hover:bg-slate-50")}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* From / To */}
            <div className="relative col-span-2 grid grid-cols-2 rounded-xl border border-slate-200 sm:col-span-1 lg:min-w-[280px]">
              <div className="min-w-0 border-r border-slate-200 pr-4"><AirportSelect label="From" value={from} onChange={setFrom} compact /></div>
              <div className="min-w-0 pl-4"><AirportSelect label="To" value={to} onChange={setTo} align="right" compact /></div>
              <button onClick={swap} className="absolute left-1/2 top-1/2 z-20 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-brand shadow transition-transform hover:rotate-180" aria-label="Swap">
                <ArrowLeftRight size={13} />
              </button>
            </div>

            {/* Depart */}
            <div className="rounded-xl border border-slate-200 lg:min-w-[120px]">
              <DateField label="Depart" value={departDate} min={tomorrow(0)} onChange={setDepartDate} compact mode="depart" rangeOther={returnDate} showFares from={from} to={to} />
            </div>

            {/* Return */}
            <div className="rounded-xl border border-slate-200 lg:min-w-[120px]">
              <DateField label="Return" value={returnDate} min={departDate} placeholder="Select Return" compact mode="return" rangeOther={departDate} showFares from={from} to={to} align="right"
                onActivate={() => { if (tripType !== "ROUND_TRIP") { setTripType("ROUND_TRIP"); if (!returnDate) setReturnDate(tomorrow(7)); } }}
                onChange={(v) => { setReturnDate(v); if (v) setTripType("ROUND_TRIP"); }} />
            </div>

            {/* Travellers */}
            <div className="rounded-xl border border-slate-200 lg:min-w-[150px]">
              <TravellerSelect travellers={travellers} cabinClass={cabinClass} compact onChange={(t, c) => { setTravellers(t); setCabinClass(c); }} />
            </div>
          </div>

          <button onClick={submit} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-sky-500 px-8 py-2.5 text-sm font-bold tracking-wide text-white shadow hover:opacity-95 lg:px-10">
            <Search size={16} /> SEARCH
          </button>
        </div>

        {/* Fare type row */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">Fare Type</span>
          {fareTypes.map((p) => {
            const on = passengerType === p.id;
            return (
              <button key={p.id} onClick={() => setPassengerType(p.id)}
                className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors", on ? "border-brand bg-brand/5 text-brand" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                <span className={cn("grid h-3.5 w-3.5 place-items-center rounded-full border-2", on ? "border-brand" : "border-slate-300")}>{on && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}</span>
                {p.label}
              </button>
            );
          })}
          <span className="ml-1 hidden shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 sm:flex">
            <ShieldCheck size={13} className="text-brand" /> Add Price Drop Protection
          </span>
        </div>
      </div>
    </div>
  );
}
