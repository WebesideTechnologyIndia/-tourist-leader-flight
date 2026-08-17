"use client";
import { Star, Armchair, Clock, Zap, Wifi, ChevronDown, Bus } from "lucide-react";
import type { BusTrip } from "@/lib/bus-types";
import { formatTime, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useMoney } from "@/store/preferences";

const AM_ICONS: Record<string, React.ElementType> = { "Charging Point": Zap, WiFi: Wifi };

export function BusCard({ bus, onSelect, open }: { bus: BusTrip; onSelect: () => void; open?: boolean }) {
  const off = bus.originalFare > bus.fare ? Math.round((1 - bus.fare / bus.originalFare) * 100) : 0;
  const money = useMoney();
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 sm:w-52">
          <p className="truncate font-bold text-slate-900">{bus.operator}</p>
          <p className="text-xs text-slate-500">{bus.busType}</p>
          <span className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] font-bold text-white"><Star size={10} className="fill-white" /> {bus.rating}</span>
          <span className="ml-1 text-[11px] text-slate-400">{bus.ratingCount} ratings</span>
        </div>

        <div className="flex flex-1 items-center justify-between gap-2">
          <div className="text-center"><p className="text-lg font-extrabold text-slate-900">{formatTime(bus.departTime)}</p><p className="text-xs text-slate-400">{bus.from}</p></div>
          <div className="flex flex-1 flex-col items-center px-2">
            <p className="flex items-center gap-1 text-[11px] text-slate-400"><Clock size={11} /> {formatDuration(bus.durationMinutes)}</p>
            <div className="my-1 flex w-full items-center"><span className="h-1.5 w-1.5 rounded-full bg-slate-300" /><span className="h-px flex-1 bg-slate-200" /><Bus size={12} className="mx-1 text-slate-400" /><span className="h-px flex-1 bg-slate-200" /><span className="h-1.5 w-1.5 rounded-full bg-slate-300" /></div>
            {bus.liveTracking && <p className="text-[10px] font-medium text-emerald-600">Live tracking</p>}
          </div>
          <div className="text-center"><p className="text-lg font-extrabold text-slate-900">{formatTime(bus.arriveTime)}</p><p className="text-xs text-slate-400">{bus.to}</p></div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:w-44 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="sm:text-right">
            {off > 0 && <p className="text-xs text-slate-400 line-through">{money(bus.originalFare)}</p>}
            <p className="text-xl font-extrabold text-slate-900">{money(bus.fare)}</p>
            <p className="text-[11px] text-emerald-600">{bus.seatsAvailable} seats · {bus.windowSeats} window</p>
          </div>
          <button onClick={onSelect} className={cn("flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm", open ? "bg-slate-600" : "bg-gradient-to-r from-accent to-orange-500 hover:opacity-95")}>
            <Armchair size={15} /> {open ? "Hide Seats" : "Select Seats"} <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[11px] text-slate-500">
        {bus.amenities.slice(0, 5).map((a) => { const I = AM_ICONS[a]; return <span key={a} className="flex items-center gap-1">{I && <I size={11} />} {a}</span>; })}
        {bus.amenities.length > 5 && <span>+{bus.amenities.length - 5} more</span>}
      </div>
    </div>
  );
}
