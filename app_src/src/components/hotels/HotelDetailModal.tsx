"use client";
import Image from "next/image";
import { useState } from "react";
import { Star, MapPin, Check, BedDouble, Wifi, Utensils, Waves, Car, Dumbbell, Wine, ShieldCheck, Clock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Hotel } from "@/lib/hotel-types";
import { HOTEL_IMAGES } from "@/lib/hotel-constants";
import { useMoney } from "@/store/preferences";

const ICONS: Record<string, React.ElementType> = {
  "Free WiFi": Wifi, Breakfast: Utensils, "Swimming Pool": Waves, Parking: Car, Gym: Dumbbell, Bar: Wine, Restaurant: Utensils,
};

function ratingWord(r: number) {
  if (r >= 4.5) return "Excellent"; if (r >= 4.2) return "Very Good"; if (r >= 3.8) return "Good"; return "Pleasant";
}

export function HotelDetailModal({ hotel, nights, onClose, onBook }: { hotel: Hotel | null; nights: number; onClose: () => void; onBook: (h: Hotel, roomName: string, pricePerNight: number) => void }) {
  const [active, setActive] = useState(0);
  const [room, setRoom] = useState(0);
  const money = useMoney();
  if (!hotel) return null;

  const startIdx = HOTEL_IMAGES.indexOf(hotel.image);
  const gallery = Array.from({ length: 4 }, (_, i) => HOTEL_IMAGES[(Math.max(0, startIdx) + i) % HOTEL_IMAGES.length]);

  const rooms = [
    { name: "Standard Room", mult: 1, bed: "1 Queen Bed", perks: ["Room only", "Free WiFi"] },
    { name: "Deluxe Room", mult: 1.35, bed: "1 King Bed", perks: ["Free Breakfast", "Free WiFi", "City view"] },
    { name: "Suite", mult: 1.9, bed: "1 King + Living area", perks: ["Breakfast included", "Free Cancellation", "Lounge access"] },
  ].map((r) => ({ ...r, price: Math.round((hotel.pricePerNight * r.mult) / 50) * 50 }));

  return (
    <Modal open={!!hotel} onClose={onClose} title="Hotel Details" className="sm:max-w-3xl">
      {/* Gallery */}
      <div className="relative h-56 overflow-hidden rounded-xl">
        <Image src={gallery[active]} alt={hotel.name} fill sizes="(max-width:768px) 100vw, 700px" className="object-cover" />
        {hotel.tag && <span className="absolute left-3 top-3 rounded-md bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{hotel.tag}</span>}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {gallery.map((g, i) => (
          <button key={i} onClick={() => setActive(i)} className={`relative h-16 overflow-hidden rounded-lg ring-2 ${active === i ? "ring-brand" : "ring-transparent"}`}>
            <Image src={g} alt="" fill sizes="120px" className="object-cover" />
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1 text-amber-400">{Array.from({ length: hotel.starRating }).map((_, i) => <Star key={i} size={14} className="fill-amber-400" />)}</div>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">{hotel.name}</h2>
          <p className="flex items-center gap-1 text-sm text-slate-500"><MapPin size={13} /> {hotel.area}, {hotel.city}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="inline-block rounded-lg bg-emerald-600 px-2.5 py-1 text-sm font-bold text-white">{hotel.userRating}</span>
          <p className="mt-1 text-xs font-semibold text-slate-600">{ratingWord(hotel.userRating)}</p>
          <p className="text-[11px] text-slate-400">{hotel.reviews.toLocaleString("en-IN")} reviews</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-600">
        Set in {hotel.area}, {hotel.name} offers a comfortable {hotel.starRating}-star stay with thoughtful amenities and easy access to the city&apos;s highlights — caring, seamless and made for great trips.
      </p>

      {/* Amenities */}
      <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Amenities</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {hotel.amenities.map((a) => {
          const Icon = ICONS[a] || Check;
          return <span key={a} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"><Icon size={15} className="text-brand" /> {a}</span>;
        })}
      </div>

      {/* Rooms */}
      <p className="mt-5 mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Choose your room</p>
      <div className="space-y-2">
        {rooms.map((r, i) => (
          <button key={i} onClick={() => setRoom(i)} className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 p-3 text-left transition-colors ${room === i ? "border-brand bg-brand/5" : "border-slate-200 hover:border-slate-300"}`}>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-bold text-slate-900"><BedDouble size={15} className="text-brand" /> {r.name}</p>
              <p className="text-xs text-slate-500">{r.bed}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">{r.perks.map((p) => <span key={p} className="flex items-center gap-1 text-[11px] font-medium text-emerald-600"><Check size={11} /> {p}</span>)}</div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-extrabold text-slate-900">{money(r.price)}</p>
              <p className="text-[10px] text-slate-400">/night</p>
            </div>
          </button>
        ))}
      </div>

      {/* Policies */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><Clock size={14} className="text-brand" /> Check-in 2 PM · Check-out 11 AM</div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><ShieldCheck size={14} className="text-brand" /> {hotel.freeCancellation ? "Free cancellation available" : "Non-refundable rate"}</div>
      </div>

      {/* Book */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-xl font-extrabold text-slate-900">{money(rooms[room].price * nights)}</p>
          <p className="text-[11px] text-slate-400">{nights} night{nights > 1 ? "s" : ""} · {rooms[room].name} · + taxes</p>
        </div>
        <Button variant="accent" onClick={() => onBook(hotel, rooms[room].name, rooms[room].price)}>Book this hotel</Button>
      </div>
    </Modal>
  );
}
