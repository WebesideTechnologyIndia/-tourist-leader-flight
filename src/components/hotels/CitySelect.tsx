"use client";
import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { HOTEL_CITIES } from "@/lib/hotel-constants";
import { cn } from "@/lib/utils";

export function CitySelect({ value, onChange, compact = false, label = "City, Property or Location" }: { value: string; onChange: (city: string) => void; compact?: boolean; label?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = HOTEL_CITIES.find((c) => c.city === value);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = HOTEL_CITIES.filter((c) => `${c.city} ${c.country}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="relative min-w-0" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={cn("flex w-full flex-col items-start text-left transition-colors hover:bg-slate-50", compact ? "rounded-xl px-3 py-2" : "rounded-xl px-4 py-3")}>
        <span className="w-full truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <span className={cn("w-full truncate font-bold leading-tight text-slate-900", compact ? "text-base" : "mt-0.5 text-2xl")}>{selected?.city || value || "Where to?"}</span>
        <span className="w-full truncate text-xs text-slate-500">{selected ? `${selected.country} · ${selected.hint}` : "—"}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-80 max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search city or area" className="w-full bg-transparent text-sm outline-none" />
          </div>
          <ul className="mt-2 max-h-72 overflow-y-auto">
            {filtered.map((c) => (
              <li key={c.id}>
                <button onClick={() => { onChange(c.city); setOpen(false); setQ(""); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-brand/5">
                  <MapPin size={16} className="shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{c.city}</span>
                    <span className="block truncate text-xs text-slate-500">{c.country} · {c.hint}</span>
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-400">No cities found</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
