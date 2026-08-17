"use client";
import Image from "next/image";
import { Star, MapPin, Wifi, Utensils, Waves, Check } from "lucide-react";
import type { Hotel } from "@/lib/hotel-types";
import { formatINR } from "@/lib/utils";
import { useMoney } from "@/store/preferences";
import { Button } from "@/components/ui/Button";
import { WishlistButton } from "@/components/WishlistButton";

const AMENITY_ICONS: Record<string, React.ElementType> = { "Free WiFi": Wifi, Breakfast: Utensils, "Swimming Pool": Waves };

function ratingWord(r: number) {
  if (r >= 4.5) return "Excellent";
  if (r >= 4.2) return "Very Good";
  if (r >= 3.8) return "Good";
  return "Pleasant";
}

export function HotelCard({ hotel, nights, onView }: { hotel: Hotel; nights: number; onView: () => void }) {
  const off = Math.round((1 - hotel.pricePerNight / hotel.originalPrice) * 100);
  const money = useMoney();
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md sm:flex-row">
      <div className="relative h-44 w-full shrink-0 sm:h-auto sm:w-60">
        <Image src={hotel.image} alt={hotel.name} fill sizes="(max-width:640px) 100vw, 240px" className="object-cover" />
        {hotel.tag && <span className="absolute left-2 top-2 rounded-md bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{hotel.tag}</span>}
        <WishlistButton
          className="absolute right-2 top-2"
          size={16}
          item={{ itemType: "HOTEL", itemKey: `${hotel.city}:${hotel.name}`, title: hotel.name, subtitle: `${hotel.area}, ${hotel.city}`, image: hotel.image, price: `${formatINR(hotel.pricePerNight)}/night`, href: `/hotels/search?city=${encodeURIComponent(hotel.city)}` }}
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-amber-400">
              {Array.from({ length: hotel.starRating }).map((_, i) => <Star key={i} size={13} className="fill-amber-400" />)}
            </div>
            <h3 className="mt-1 truncate text-lg font-bold text-slate-900">{hotel.name}</h3>
            <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} /> {hotel.area}, {hotel.city}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="ml-auto flex w-fit items-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white">{hotel.userRating}</div>
            <p className="mt-1 text-[11px] font-semibold text-slate-600">{ratingWord(hotel.userRating)}</p>
            <p className="text-[10px] text-slate-400">{hotel.reviews.toLocaleString("en-IN")} reviews</p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {hotel.amenities.slice(0, 4).map((a) => {
            const Icon = AMENITY_ICONS[a];
            return <span key={a} className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{Icon && <Icon size={11} />} {a}</span>;
          })}
          {hotel.amenities.length > 4 && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">+{hotel.amenities.length - 4} more</span>}
        </div>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium">
          {hotel.freeCancellation && <span className="flex items-center gap-1 text-emerald-600"><Check size={12} /> Free Cancellation</span>}
          {hotel.breakfastIncluded && <span className="flex items-center gap-1 text-emerald-600"><Check size={12} /> Free Breakfast</span>}
        </div>

        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <p className="text-xs text-slate-400 line-through">{money(hotel.originalPrice)}</p>
            <p className="text-xl font-extrabold text-slate-900">{money(hotel.pricePerNight)} <span className="text-xs font-normal text-slate-400">/night</span></p>
            <p className="text-[11px] text-slate-400">+ {money(hotel.taxes)} taxes · <span className="font-semibold text-emerald-600">{off}% off</span></p>
          </div>
          <Button size="sm" variant="accent" onClick={onView}>View Details</Button>
        </div>
      </div>
    </div>
  );
}
