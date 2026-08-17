"use client";
import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface City {
  id: number;
  name: string;
}

/**
 * City picker backed by BDSD's master list (~15k cities).
 *
 * The list is far too big to ship to the browser, so this queries
 * /api/bus/cities instead of a bundled array. It reports the BDSD city id
 * alongside the name because 318 names in that list belong to two different
 * cities — the id is the only thing that identifies one unambiguously.
 */
export function BusCitySelect({
  label,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (city: string, id: number) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Debounced lookup; an empty query returns BDSD's featured cities.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/bus/cities?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d: { cities: City[] }) => setCities(d.cities ?? []))
        .catch(() => { /* aborted or offline — keep the previous list */ })
        .finally(() => setLoading(false));
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q, open]);

  return (
    <div className="relative min-w-0" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className={cn("flex w-full flex-col items-start text-left transition-colors hover:bg-slate-50", compact ? "rounded-xl px-3 py-2" : "rounded-xl px-4 py-3")}>
        <span className="w-full truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <span className={cn("w-full truncate font-bold leading-tight text-slate-900", compact ? "text-base" : "mt-0.5 text-2xl")}>{value || "Select city"}</span>
        <span className="w-full truncate text-xs text-slate-500">India</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-72 max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search city" className="w-full bg-transparent text-sm outline-none" />
          </div>
          <ul className="mt-2 max-h-72 overflow-y-auto">
            {cities.map((c) => (
              <li key={c.id}>
                <button onClick={() => { onChange(c.name, c.id); setOpen(false); setQ(""); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-brand/5">
                  <MapPin size={16} className="shrink-0 text-slate-400" />
                  <span className="truncate text-sm font-semibold text-slate-800">{c.name}</span>
                </button>
              </li>
            ))}
            {!loading && cities.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-400">No cities found</li>}
            {loading && cities.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-400">Searching…</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
