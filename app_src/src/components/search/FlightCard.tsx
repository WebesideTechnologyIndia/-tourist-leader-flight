"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, ChevronDown, Check, Luggage, Armchair, Utensils, RefreshCw, Plane } from "lucide-react";
import type { Flight, FareOption } from "@/lib/types";
import { FARE_TYPES } from "@/lib/constants";
import { cn, formatTime, formatDuration } from "@/lib/utils";
import { AirlineLogo } from "@/components/AirlineLogo";
import { FlightSourceBadge } from "@/components/FlightSourceBadge";
import { Button } from "@/components/ui/Button";
import { useMoney } from "@/store/preferences";
import { useBooking } from "@/store/booking";
import { useAuth } from "@/store/auth";
import type { SearchQuery } from "@/lib/types";

const ACCENTS: Record<string, string> = {
  FEE_SAVER: "border-emerald-200 bg-emerald-50/40",
  REGULAR: "border-sky-200 bg-sky-50/40",
  COMFORT: "border-violet-200 bg-violet-50/40",
  YOUR_CHOICE: "border-amber-200 bg-amber-50/40",
};
const BADGE: Record<string, string> = {
  FEE_SAVER: "bg-emerald-500",
  REGULAR: "bg-sky-500",
  COMFORT: "bg-violet-500",
  YOUR_CHOICE: "bg-amber-500",
};

function FareRow({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <li className="flex items-center gap-2 text-xs text-slate-600">
      <Icon size={13} className="shrink-0 text-slate-400" />
      {text}
    </li>
  );
}

export function FlightCard({ flight, query, onPick, selected, selectedFareId }: { flight: Flight; query: SearchQuery; onPick?: (flight: Flight, fare: FareOption) => void; selected?: boolean; selectedFareId?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const money = useMoney();
  const selectFlight = useBooking((s) => s.selectFlight);
  const setQuery = useBooking((s) => s.setQuery);
  const requireAuth = useAuth((s) => s.requireAuth);

  const choose = (fare: FareOption) => {
    // Multi-leg selection mode (round trip / multi-city): hand the pick back to the
    // parent instead of navigating, so the user can complete the other legs first.
    if (onPick) { onPick(flight, fare); return; }
    setQuery(query);
    selectFlight(flight, fare);
    // Require login before starting the booking flow.
    requireAuth(() => router.push("/flights/book"));
  };

  const stopsLabel = flight.stops === 0 ? "Non-stop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`;

  return (
    <div className={cn("overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition-shadow hover:shadow-md", selected ? "ring-2 ring-brand" : "ring-slate-100")}>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        {/* Airline */}
        <div className="flex items-center gap-3 sm:w-44">
          <AirlineLogo code={flight.airlineCode} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{flight.airlineName}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-slate-400">{flight.flightNumber}</p>
              <FlightSourceBadge source={flight.source} />
            </div>
          </div>
        </div>

        {/* Times */}
        <div className="flex flex-1 items-center justify-between gap-2">
          <div className="text-center">
            <p className="text-lg font-extrabold text-slate-900">{formatTime(flight.departTime)}</p>
            <p className="text-xs text-slate-400">{flight.from}</p>
          </div>
          <div className="flex flex-1 flex-col items-center px-2">
            <p className="text-[11px] text-slate-400">{formatDuration(flight.durationMinutes)}</p>
            <div className="my-1 flex w-full items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              <span className="h-px flex-1 bg-slate-200" />
              <Plane size={11} className="text-slate-400" />
              <span className="h-px flex-1 bg-slate-200" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            </div>
            <p className={cn("text-[11px] font-medium", flight.stops === 0 ? "text-emerald-600" : "text-orange-500")}>
              {stopsLabel}{flight.layoverAirports.length ? ` · ${flight.layoverAirports.join(", ")}` : ""}
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg font-extrabold text-slate-900">{formatTime(flight.arriveTime)}</p>
            <p className="text-xs text-slate-400">{flight.to}</p>
          </div>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:w-48 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="sm:text-right">
            <p className="text-xl font-extrabold text-slate-900">{money(flight.basePrice)}</p>
            <p className="text-[11px] text-slate-400">{flight.refundable ? "Refundable" : "Non-refundable"}</p>
          </div>
          <Button variant={open ? "soft" : "primary"} size="sm" onClick={() => setOpen((o) => !o)}>
            View Prices <ChevronDown size={15} className={cn("transition-transform", open && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* Baggage strip */}
      <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><Briefcase size={12} /> Cabin {flight.cabinBaggage}</span>
        <span className="flex items-center gap-1"><Luggage size={12} /> Check-in {flight.checkInBaggage}</span>
      </div>

      {/* Fare types */}
      {open && (
        <div className="animate-fade-up border-t border-slate-100 bg-slate-50/70 p-4">
          <p className="mb-3 text-sm font-bold text-slate-800">Choose your fare</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {flight.fares.map((fare) => {
              const info = FARE_TYPES.find((f) => f.id === fare.id)!;
              return (
                <div key={fare.id} className={cn("relative flex flex-col rounded-xl border-2 bg-white p-3.5", ACCENTS[fare.id])}>
                  {fare.badge && (
                    <span className={cn("absolute -top-2.5 left-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white", BADGE[fare.id])}>{fare.badge}</span>
                  )}
                  <p className="text-sm font-extrabold text-slate-900">{fare.label}</p>
                  <p className="mt-0.5 text-lg font-extrabold text-slate-900">{money(fare.price)}</p>
                  <ul className="mt-2.5 flex-1 space-y-1.5">
                    <FareRow icon={Briefcase} text={`Cabin ${fare.cabinBaggage}`} />
                    <FareRow icon={Luggage} text={`Check-in ${fare.checkInBaggage}`} />
                    <FareRow icon={Armchair} text={fare.seat} />
                    <FareRow icon={Utensils} text={fare.meal} />
                    <FareRow icon={RefreshCw} text={fare.cancellation} />
                  </ul>
                  <p className="mt-2 text-[11px] italic text-slate-400">{info.tagline}</p>
                  <Button size="sm" className="mt-3 w-full" variant={selectedFareId === fare.id ? "primary" : "accent"} onClick={() => choose(fare)}>
                    <Check size={14} /> {selectedFareId === fare.id ? "Selected" : onPick ? "Select this flight" : "Select"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
