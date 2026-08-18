"use client";
import { AIRLINES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useMoney } from "@/store/preferences";
import { AirlineLogo } from "@/components/AirlineLogo";

export interface Filters {
  stops: number[]; // 0,1,2
  airlines: string[];
  maxPrice: number;
  refundable: "all" | "yes" | "no";
  departBuckets: string[]; // early, morning, afternoon, evening
}

export const DEFAULT_FILTERS: Filters = { stops: [], airlines: [], maxPrice: 0, refundable: "all", departBuckets: [] };

const TIME_BUCKETS = [
  { id: "early", label: "Before 6 AM" },
  { id: "morning", label: "6 AM – 12 PM" },
  { id: "afternoon", label: "12 – 6 PM" },
  { id: "evening", label: "After 6 PM" },
];

function toggle<T>(arr: T[], v: T) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function FilterPanel({ filters, onChange, priceBounds }: { filters: Filters; onChange: (f: Filters) => void; priceBounds: [number, number] }) {
  const money = useMoney();
  const [min, max] = priceBounds;
  const cur = filters.maxPrice || max;
  return (
    <div className="space-y-5 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900">Filters</h3>
        <button onClick={() => onChange(DEFAULT_FILTERS)} className="text-xs font-semibold text-brand hover:underline">Clear all</button>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Stops</p>
        <div className="flex flex-wrap gap-2">
          {[{ v: 0, l: "Non-stop" }, { v: 1, l: "1 Stop" }, { v: 2, l: "2+ Stops" }].map((s) => (
            <button key={s.v} onClick={() => onChange({ ...filters, stops: toggle(filters.stops, s.v) })}
              className={cn("rounded-lg border px-3 py-1.5 text-xs font-semibold", filters.stops.includes(s.v) ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-600")}>
              {s.l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Departure time</p>
        <div className="grid grid-cols-2 gap-2">
          {TIME_BUCKETS.map((b) => (
            <button key={b.id} onClick={() => onChange({ ...filters, departBuckets: toggle(filters.departBuckets, b.id) })}
              className={cn("rounded-lg border px-2 py-1.5 text-xs font-medium", filters.departBuckets.includes(b.id) ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-600")}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Max price</p>
          <span className="text-sm font-bold text-brand">{money(cur)}</span>
        </div>
        <input type="range" min={min} max={max} value={cur} onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
          className="w-full accent-[var(--brand)]" />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Airlines</p>
        <div className="space-y-1.5">
          {AIRLINES.map((a) => (
            <label key={a.code} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-slate-50">
              <input type="checkbox" checked={filters.airlines.includes(a.code)} onChange={() => onChange({ ...filters, airlines: toggle(filters.airlines, a.code) })} className="accent-[var(--brand)]" />
              <AirlineLogo code={a.code} size={24} />
              <span className="text-sm text-slate-700">{a.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Fare type</p>
        <div className="flex gap-2">
          {[{ v: "all", l: "All" }, { v: "yes", l: "Refundable" }, { v: "no", l: "Non-refundable" }].map((r) => (
            <button key={r.v} onClick={() => onChange({ ...filters, refundable: r.v as Filters["refundable"] })}
              className={cn("flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold", filters.refundable === r.v ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-600")}>
              {r.l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
