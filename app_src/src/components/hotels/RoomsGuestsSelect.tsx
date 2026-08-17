"use client";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus, BedDouble } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RoomsGuests { rooms: number; adults: number; children: number }

function Counter({ label, sub, value, onChange, min }: { label: string; sub: string; value: number; onChange: (n: number) => void; min: number }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div><p className="text-sm font-semibold text-slate-800">{label}</p><p className="text-xs text-slate-400">{sub}</p></div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="grid h-8 w-8 place-items-center rounded-full border border-slate-300 text-slate-600 disabled:opacity-40 hover:border-brand hover:text-brand"><Minus size={14} /></button>
        <span className="w-5 text-center text-sm font-bold">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-slate-300 text-slate-600 hover:border-brand hover:text-brand"><Plus size={14} /></button>
      </div>
    </div>
  );
}

export function RoomsGuestsSelect({ value, onChange, compact = false, maxRooms = 4 }: { value: RoomsGuests; onChange: (v: RoomsGuests) => void; compact?: boolean; maxRooms?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={cn("flex h-full w-full flex-col items-start text-left transition-colors hover:bg-slate-50", compact ? "rounded-xl px-3 py-2" : "rounded-xl px-4 py-3")}>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Rooms & Guests</span>
        <span className={cn("flex items-baseline gap-1 font-bold leading-tight text-slate-900", compact ? "text-base" : "mt-0.5 text-2xl")}>
          {value.rooms}<span className={cn("font-semibold text-slate-500", compact ? "text-xs" : "text-sm")}>Room{value.rooms > 1 ? "s" : ""}</span>
          {value.adults + value.children}<span className={cn("font-semibold text-slate-500", compact ? "text-xs" : "text-sm")}>Guest{value.adults + value.children > 1 ? "s" : ""}</span>
        </span>
        <span className="truncate text-xs text-slate-500">{value.adults} Adults{value.children ? `, ${value.children} Children` : ""}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <Counter label="Rooms" sub={`Up to ${maxRooms}`} value={value.rooms} min={1} onChange={(n) => onChange({ ...value, rooms: Math.min(maxRooms, n) })} />
          <Counter label="Adults" sub="12+ years" value={value.adults} min={1} onChange={(n) => onChange({ ...value, adults: n })} />
          <Counter label="Children" sub="Under 12" value={value.children} min={0} onChange={(n) => onChange({ ...value, children: n })} />
          <button type="button" onClick={() => setOpen(false)} className="mt-3 w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"><BedDouble size={14} className="mr-1 inline" /> Done</button>
        </div>
      )}
    </div>
  );
}
