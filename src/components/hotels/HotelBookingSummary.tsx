"use client";
import Image from "next/image";
import { Star, MapPin, BedDouble, CalendarDays } from "lucide-react";
import { useHotelBooking, HOTEL_CONVENIENCE } from "@/store/hotel-booking";
import { formatINR, formatDate } from "@/lib/utils";
import { ServiceChargeLines, GstStateSelect, type Quote } from "@/components/billing/Billing";
import type { BillingConfigData } from "@/lib/billing-core";

export function HotelSummaryCard() {
  const { hotel, roomName, nights, query } = useHotelBooking();
  if (!hotel || !query) return null;
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="relative h-32">
        <Image src={hotel.image} alt={hotel.name} fill sizes="400px" className="object-cover" />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1 text-amber-400">{Array.from({ length: hotel.starRating }).map((_, i) => <Star key={i} size={12} className="fill-amber-400" />)}</div>
        <h3 className="mt-1 font-bold text-slate-900">{hotel.name}</h3>
        <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} /> {hotel.area}, {hotel.city}</p>
        <div className="mt-2 space-y-1 text-sm text-slate-600">
          <p className="flex items-center gap-1.5"><BedDouble size={14} className="text-brand" /> {roomName} · {query.rooms} room{query.rooms > 1 ? "s" : ""}, {query.adults + query.children} guests</p>
          <p className="flex items-center gap-1.5"><CalendarDays size={14} className="text-brand" /> {formatDate(query.checkIn)} → {formatDate(query.checkOut)} · {nights} night{nights > 1 ? "s" : ""}</p>
        </div>
      </div>
    </div>
  );
}

export function HotelPriceSummary({ cta, q, config, state, onState }: { cta?: React.ReactNode; q?: Quote; config?: BillingConfigData; state?: string; onState?: (s: string) => void }) {
  const { roomPrice, nights, hotel } = useHotelBooking();
  if (!hotel) return null;
  const room = roomPrice * nights;
  const taxes = Math.round(room * 0.12);
  const subtotal = room + taxes + HOTEL_CONVENIENCE;
  const total = subtotal + (q?.addon || 0);
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <h3 className="font-bold text-slate-900">Price Summary</h3>
      <div className="mt-3 space-y-2 text-sm">
        <Row label={`Room price (${formatINR(roomPrice)} × ${nights})`} value={formatINR(room)} />
        <Row label="Taxes & service fees" value={formatINR(taxes)} />
        <Row label="Convenience fee" value={formatINR(HOTEL_CONVENIENCE)} />
        {onState && <div className="py-1"><GstStateSelect value={state || ""} onChange={onState} /></div>}
        {q && config && <ServiceChargeLines q={q} config={config} />}
        <div className="my-2 border-t border-dashed border-slate-200" />
        <Row label={<span className="font-bold text-slate-900">Total Amount</span>} value={<span className="text-lg font-extrabold text-slate-900">{formatINR(total)}</span>} />
      </div>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return <div className="flex items-center justify-between text-slate-600"><span>{label}</span><span className="font-semibold text-slate-800">{value}</span></div>;
}
