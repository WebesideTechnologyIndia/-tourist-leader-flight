"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

function isoOf(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function todayIso() {
  const d = new Date();
  return isoOf(d.getFullYear(), d.getMonth(), d.getDate());
}
function pretty(iso: string) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${d.toLocaleDateString("en-IN", { month: "short" })}' ${String(d.getFullYear()).slice(2)}`;
}

/** Deterministic, route-aware indicative fare for a date cell (preview only — search uses the live API). */
function seededFare(iso: string, from: string, to: string) {
  const s = from + to + iso;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const d = new Date(iso + "T00:00:00");
  const dow = d.getDay();
  const weekend = dow === 0 || dow === 5 || dow === 6;
  const base = 4200 + (h % 56) * 95; // ~4200–9450
  return Math.round((base * (weekend ? 1.2 : 1)) / 10) * 10;
}

const WD = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function MonthGrid({
  year, month, value, minIso, start, end, showFares, from, to, onPick,
}: {
  year: number; month: number; value: string; minIso: string;
  start: string; end: string; showFares: boolean; from: string; to: string;
  onPick: (iso: string) => void;
}) {
  const firstDow = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  // cheapest fare this month (for the green highlight)
  const minFare = useMemo(() => {
    if (!showFares) return 0;
    let m = Infinity;
    for (let d = 1; d <= days; d++) {
      const iso = isoOf(year, month, d);
      if (iso < minIso) continue;
      m = Math.min(m, seededFare(iso, from, to));
    }
    return m;
  }, [year, month, days, minIso, showFares, from, to]);

  const monthName = new Date(year, month, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="w-full">
      <p className="mb-2 text-center text-sm font-bold text-slate-800 sm:text-base">{monthName}</p>
      <div className="grid grid-cols-7 text-center">
        {WD.map((w) => <span key={w} className="pb-1 text-[11px] font-semibold text-slate-400">{w}</span>)}
        {cells.map((d, i) => {
          if (d === null) return <span key={i} />;
          const iso = isoOf(year, month, d);
          const disabled = iso < minIso;
          const isStart = !!start && iso === start;
          const isEnd = !!end && iso === end;
          const isSel = iso === value;
          const inRange = !!start && !!end && start !== end && iso > start && iso < end;
          const fare = showFares && !disabled ? seededFare(iso, from, to) : 0;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onPick(iso)}
              className={cn(
                "relative flex flex-col items-center justify-center py-1.5 text-sm transition-colors",
                showFares ? "h-12" : "h-10",
                disabled ? "cursor-not-allowed text-slate-300" : "text-slate-700 hover:bg-brand/10",
                inRange && "bg-brand/10",
                (isSel || isStart || isEnd) && "rounded-lg bg-brand font-bold text-white hover:bg-brand",
              )}
            >
              <span>{d}</span>
              {fare > 0 && (
                <span className={cn("text-[9px] leading-none", (isSel || isStart || isEnd) ? "text-white/90" : fare === minFare ? "text-emerald-600 font-semibold" : "text-slate-400")}>
                  ₹{fare.toLocaleString("en-IN")}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarPopover({
  value, minIso, onSelect, onClose, mode = "single", rangeOther = "", showFares = false, from = "", to = "", align = "left",
}: {
  value: string;
  minIso?: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
  mode?: "single" | "depart" | "return";
  rangeOther?: string;
  showFares?: boolean;
  from?: string;
  to?: string;
  align?: "left" | "right";
}) {
  const min = minIso || todayIso();
  const ref = useRef<HTMLDivElement>(null);

  // first visible month — anchored on the selected date (or min)
  const anchor = (value && value >= min ? value : min);
  const [view, setView] = useState(() => {
    const d = new Date(anchor + "T00:00:00");
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const next = () => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));
  const prev = () => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const second = view.m === 11 ? { y: view.y + 1, m: 0 } : { y: view.y, m: view.m + 1 };
  const canPrev = isoOf(view.y, view.m, 1) > min;

  // range endpoints (depart = start, return = end)
  const depart = mode === "return" ? rangeOther : mode === "depart" ? value : "";
  const ret = mode === "return" ? value : mode === "depart" ? rangeOther : "";
  const start = depart, end = ret;

  const pick = (iso: string) => { onSelect(iso); onClose(); };

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-full z-50 mt-2 w-[20rem] max-w-[94vw] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl sm:w-[40rem]",
        align === "right" ? "right-0" : "left-0",
      )}
    >
      {mode !== "single" && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-xs">
          <span className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5", mode === "depart" ? "border-brand bg-white font-semibold text-brand" : "border-transparent text-slate-500")}>
            <Calendar size={13} /> DEPART <b className="text-slate-800">{depart ? pretty(depart) : "select"}</b>
          </span>
          <span className="text-slate-300">—</span>
          <span className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5", mode === "return" ? "border-brand bg-white font-semibold text-brand" : "border-transparent text-slate-500")}>
            <Calendar size={13} /> RETURN <b className="text-slate-800">{ret ? pretty(ret) : "select"}</b>
          </span>
        </div>
      )}

      <div className="relative">
        <button type="button" onClick={prev} disabled={!canPrev} className="absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full text-brand hover:bg-slate-100 disabled:text-slate-200" aria-label="Previous month"><ChevronLeft size={20} /></button>
        <button type="button" onClick={next} className="absolute right-0 top-0 grid h-8 w-8 place-items-center rounded-full text-brand hover:bg-slate-100" aria-label="Next month"><ChevronRight size={20} /></button>
        <div className="grid grid-cols-1 gap-4 px-8 sm:grid-cols-2 sm:px-9">
          <MonthGrid year={view.y} month={view.m} value={value} minIso={min} start={start} end={end} showFares={showFares} from={from} to={to} onPick={pick} />
          <div className="hidden sm:block">
            <MonthGrid year={second.y} month={second.m} value={value} minIso={min} start={start} end={end} showFares={showFares} from={from} to={to} onPick={pick} />
          </div>
        </div>
      </div>
    </div>
  );
}
