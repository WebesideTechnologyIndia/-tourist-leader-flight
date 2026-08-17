"use client";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMoney } from "@/store/preferences";

interface Day {
  date: string;
  price: number;
  cheapest?: boolean;
}

export function FareCalendar({ days, selected, onSelect }: { days: Day[]; selected: string; onSelect: (d: string) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const money = useMoney();
  const scroll = (dir: number) => scroller.current?.scrollBy({ left: dir * 240, behavior: "smooth" });

  return (
    <div className="relative flex items-center gap-1 rounded-2xl bg-white p-2 shadow-sm">
      <button onClick={() => scroll(-1)} className="hidden sm:grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
        <ChevronLeft size={18} />
      </button>
      <div ref={scroller} className="no-scrollbar flex flex-1 gap-2 overflow-x-auto scroll-smooth">
        {days.map((d) => {
          const dt = new Date(d.date);
          const active = d.date === selected;
          return (
            <button
              key={d.date}
              onClick={() => onSelect(d.date)}
              className={cn(
                "flex min-w-[88px] flex-col items-center rounded-xl border px-3 py-2 transition-colors",
                active ? "border-brand bg-brand text-white" : d.cheapest ? "border-emerald-300 bg-emerald-50" : "border-slate-100 hover:border-slate-300"
              )}
            >
              <span className={cn("text-[11px] font-medium", active ? "text-white/80" : "text-slate-400")}>
                {dt.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
              </span>
              <span className={cn("mt-0.5 text-sm font-bold", active ? "text-white" : d.cheapest ? "text-emerald-600" : "text-slate-800")}>
                {money(d.price)}
              </span>
              {d.cheapest && !active && <span className="text-[9px] font-bold uppercase text-emerald-600">Cheapest</span>}
            </button>
          );
        })}
      </div>
      <button onClick={() => scroll(1)} className="hidden sm:grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
