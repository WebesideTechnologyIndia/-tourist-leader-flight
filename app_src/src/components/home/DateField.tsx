"use client";
import { useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarPopover } from "./CalendarPopover";

function prettyDate(iso: string) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return {
    day: d.getDate(),
    mon: d.toLocaleDateString("en-IN", { month: "short" }),
    yr: String(d.getFullYear()).slice(2),
    wd: d.toLocaleDateString("en-IN", { weekday: "long" }),
  };
}

/** A fully-clickable date cell that opens an MMT-style dual-month calendar
 *  (with optional fare hints and depart/return range highlighting). */
export function DateField({
  label, value, min, onChange, placeholder, onActivate, compact = false,
  // calendar options
  mode = "single", rangeOther = "", showFares = false, from = "", to = "", align = "left",
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onActivate?: () => void;
  compact?: boolean;
  mode?: "single" | "depart" | "return";
  rangeOther?: string;
  showFares?: boolean;
  from?: string;
  to?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const p = prettyDate(value);
  const openPicker = () => { onActivate?.(); setOpen(true); };

  return (
    <div className="relative h-full">
      <button type="button" onClick={openPicker} className={cn("flex h-full w-full flex-col items-start text-left transition-colors hover:bg-slate-50", compact ? "rounded-xl px-3 py-2" : "rounded-xl px-4 py-3")}>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
        {p ? (
          <>
            <span className={cn("flex items-baseline gap-1.5 leading-tight", compact ? "" : "mt-0.5")}>
              {!compact && <Calendar size={16} className="self-center text-brand" />}
              <span className={cn("font-bold text-slate-900", compact ? "text-base" : "text-2xl")}>{p.day}</span>
              <span className={cn("font-semibold text-slate-600", compact ? "text-xs" : "text-sm")}>{p.mon}&apos;{p.yr}</span>
            </span>
            <span className="text-xs text-slate-500">{p.wd}</span>
          </>
        ) : (
          <span className={cn("text-xs text-slate-400", compact ? "mt-1" : "mt-1.5")}>{placeholder}</span>
        )}
      </button>

      {open && (
        <CalendarPopover
          value={value}
          minIso={min}
          onSelect={onChange}
          onClose={() => setOpen(false)}
          mode={mode}
          rangeOther={rangeOther}
          showFares={showFares}
          from={from}
          to={to}
          align={align}
        />
      )}
    </div>
  );
}
