"use client";
import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Check, ChevronRight } from "lucide-react";
import type { BusTrip, BusSeat } from "@/lib/bus-types";
import { generateSeatLayout } from "@/lib/mock-bus";
import { formatINR, cn } from "@/lib/utils";
import { useBusBooking } from "@/store/bus-booking";
import { useAuth } from "@/store/auth";

function Seat({ seat, selected, onClick }: { seat: BusSeat; selected: boolean; onClick: () => void }) {
  const disabled = seat.status === "booked";
  const sleeper = seat.type === "sleeper";
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={disabled ? "Booked" : `${seat.id} · ${formatINR(seat.price)}${seat.status === "ladies" ? " · Ladies" : ""}`}
      className={cn(
        "rounded-md border text-[9px] font-bold transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:hover:scale-100",
        sleeper ? "h-6 w-12" : "h-7 w-7",
        selected ? "border-brand bg-brand text-white" :
        seat.status === "booked" ? "border-slate-200 bg-slate-200 text-slate-400" :
        seat.status === "ladies" ? "border-pink-300 bg-pink-50 text-pink-500" :
        "border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-500"
      )}
    >
      {seat.id}
    </button>
  );
}

function Deck({ title, seats, selected, toggle }: { title: string; seats: BusSeat[]; selected: Set<string>; toggle: (s: BusSeat) => void }) {
  const rows = Array.from(new Set(seats.map((s) => s.row))).sort((a, b) => a - b);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const rowSeats = seats.filter((s) => s.row === r).sort((a, b) => a.col - b.col);
          return (
            <div key={r} className="flex items-center justify-center gap-1.5">
              {rowSeats.map((s, i) => (
                <Fragment key={s.id}>
                  {i === 2 && <span className="w-3" />}
                  <Seat seat={s} selected={selected.has(s.id)} onClick={() => toggle(s)} />
                </Fragment>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BusSeatMap({ bus, query }: { bus: BusTrip; query: { from: string; to: string; date: string } }) {
  const router = useRouter();
  const layout = useMemo(() => generateSeatLayout(bus.id, bus.fare, bus.sleeper), [bus.id, bus.fare, bus.sleeper]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [boarding, setBoarding] = useState(bus.boardingPoints[0]?.id || "");
  const [dropping, setDropping] = useState(bus.droppingPoints[0]?.id || "");

  const toggle = (s: BusSeat) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s.id)) next.delete(s.id);
      else if (next.size < 6) next.add(s.id);
      return next;
    });
  };

  const seatObjs = layout.filter((s) => selected.has(s.id));
  const total = seatObjs.reduce((a, s) => a + s.price, 0);
  const lower = layout.filter((s) => s.deck === "lower");
  const upper = layout.filter((s) => s.deck === "upper");

  const proceed = () => {
    const bp = bus.boardingPoints.find((b) => b.id === boarding)!;
    const dp = bus.droppingPoints.find((d) => d.id === dropping)!;
    useBusBooking.getState().select(bus, query, seatObjs.map((s) => ({ id: s.id, price: s.price })), bp, dp, total);
    useAuth.getState().requireAuth(() => router.push("/bus/passengers"));
  };

  return (
    <div className="animate-fade-up border-t border-slate-100 bg-slate-50/70 p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Seat layout */}
        <div>
          <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-slate-600">
            <Legend cls="border-emerald-300 bg-emerald-50" label="Available" />
            <Legend cls="border-brand bg-brand" label="Selected" />
            <Legend cls="border-pink-300 bg-pink-50" label="Ladies" />
            <Legend cls="border-slate-200 bg-slate-200" label="Booked" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Deck title="Lower Deck" seats={lower} selected={selected} toggle={toggle} />
            {upper.length > 0 && <Deck title="Upper Deck" seats={upper} selected={selected} toggle={toggle} />}
          </div>
        </div>

        {/* Boarding / dropping + summary */}
        <div className="space-y-3">
          <Points title="Boarding Point" points={bus.boardingPoints} value={boarding} onChange={setBoarding} />
          <Points title="Dropping Point" points={bus.droppingPoints} value={dropping} onChange={setDropping} />
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{selected.size} seat{selected.size !== 1 ? "s" : ""}{selected.size ? ` · ${[...selected].join(", ")}` : ""}</span>
              <span className="font-extrabold text-slate-900">{formatINR(total)}</span>
            </div>
            <button onClick={proceed} disabled={selected.size === 0} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 text-sm font-bold text-white disabled:opacity-50">
              Continue <ChevronRight size={16} />
            </button>
            {selected.size === 0 && <p className="mt-1.5 text-center text-[11px] text-slate-400">Select at least one seat</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={cn("h-4 w-4 rounded border", cls)} /> {label}</span>;
}

function Points({ title, points, value, onChange }: { title: string; points: { id: string; name: string; time: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400"><MapPin size={12} /> {title}</p>
      <div className="max-h-32 space-y-1 overflow-y-auto">
        {points.map((p) => (
          <button key={p.id} onClick={() => onChange(p.id)} className={cn("flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm", value === p.id ? "bg-brand/5 text-brand" : "text-slate-700 hover:bg-slate-50")}>
            <span className="flex items-center gap-1.5">{value === p.id && <Check size={13} />} {p.name}</span>
            <span className="text-xs text-slate-400">{p.time}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
