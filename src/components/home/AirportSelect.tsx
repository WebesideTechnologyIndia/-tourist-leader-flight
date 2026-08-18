"use client";
import { useEffect, useRef, useState } from "react";
import { Plane, Search } from "lucide-react";
import { AIRPORTS } from "@/lib/constants";
import type { Airport } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AirportSelect({
  label,
  value,
  onChange,
  align = "left",
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
  align?: "left" | "right";
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = AIRPORTS.find((a) => a.code === value);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = AIRPORTS.filter((a) => {
    const s = q.toLowerCase();
    return a.city.toLowerCase().includes(s) || a.code.toLowerCase().includes(s) || a.name.toLowerCase().includes(s);
  });

  const pick = (a: Airport) => {
    onChange(a.code);
    setOpen(false);
    setQ("");
  };

  return (
    <div className="relative min-w-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn("flex w-full flex-col items-start text-left transition-colors", compact ? "rounded-xl px-3 py-2 hover:bg-slate-50" : "rounded-xl px-4 py-3 hover:bg-slate-50")}
      >
        <span className="w-full truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <span className={cn("w-full truncate font-bold leading-tight text-slate-900", compact ? "text-base" : "mt-0.5 text-2xl")}>{selected?.city || "Select"}</span>
        <span className="w-full truncate text-xs text-slate-500">{compact ? selected?.country || "—" : selected ? `${selected.code}, ${selected.name}` : "—"}</span>
      </button>

      {open && (
        <div className={cn("absolute top-full z-40 mt-2 w-80 max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl", align === "right" ? "right-0" : "left-0")}>
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="City or airport"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <ul className="mt-2 max-h-72 overflow-y-auto">
            {filtered.map((a) => (
              <li key={a.code}>
                <button
                  onClick={() => pick(a)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-brand/5"
                >
                  <Plane size={16} className="shrink-0 text-slate-400" />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">{a.city} <span className="text-slate-400">({a.code})</span></span>
                    <span className="block truncate text-xs text-slate-500">{a.name}, {a.country}</span>
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-400">No airports found</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
