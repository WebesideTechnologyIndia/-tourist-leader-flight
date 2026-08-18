"use client";
import { Plane } from "lucide-react";
import { useBooking } from "@/store/booking";
import { AirlineLogo } from "@/components/AirlineLogo";
import { FlightSourceBadge } from "@/components/FlightSourceBadge";
import { formatTime, formatDuration, formatDate } from "@/lib/utils";
import type { Flight, FareOption } from "@/lib/types";

function legLabel(tripType: string | undefined, index: number, total: number): string {
  if (total <= 1) return "";
  if (tripType === "ROUND_TRIP") return index === 0 ? "Onward" : "Return";
  return `Flight ${index + 1}`;
}

function Leg({ flight, fare, label }: { flight: Flight; fare: FareOption | null; label: string }) {
  return (
    <div>
      {label && <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-brand">{label}</p>}
      <div className="flex items-center gap-3">
        <AirlineLogo code={flight.airlineCode} size={40} />
        <div className="flex-1">
          <p className="flex items-center gap-1.5 font-bold text-slate-900">
            {flight.airlineName} <span className="text-xs font-normal text-slate-400">{flight.flightNumber}</span>
            <FlightSourceBadge source={flight.source} />
          </p>
          <p className="text-xs text-slate-500">{formatDate(flight.departTime)}</p>
        </div>
        {fare && <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">{fare.label}</span>}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-xl font-extrabold text-slate-900">{formatTime(flight.departTime)}</p>
          <p className="text-xs text-slate-400">{flight.from}</p>
        </div>
        <div className="flex-1 px-3 text-center">
          <p className="text-[11px] text-slate-400">{formatDuration(flight.durationMinutes)}</p>
          <div className="my-1 flex items-center"><span className="h-px flex-1 bg-slate-200" /><Plane size={12} className="mx-1 text-slate-400" /><span className="h-px flex-1 bg-slate-200" /></div>
          <p className="text-[11px] font-medium text-slate-500">{flight.stops === 0 ? "Non-stop" : `${flight.stops} stop(s)`}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold text-slate-900">{formatTime(flight.arriveTime)}</p>
          <p className="text-xs text-slate-400">{flight.to}</p>
        </div>
      </div>
    </div>
  );
}

export function FlightSummaryCard() {
  const { flight, fare, extraFlights, query } = useBooking();
  if (!flight) return null;
  const legs = [{ flight, fare }, ...extraFlights];
  return (
    <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      {legs.map((leg, i) => (
        <div key={i} className={i > 0 ? "border-t border-dashed border-slate-200 pt-4" : ""}>
          <Leg flight={leg.flight} fare={leg.fare} label={legLabel(query?.tripType, i, legs.length)} />
        </div>
      ))}
    </div>
  );
}
