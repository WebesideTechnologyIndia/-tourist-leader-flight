"use client";
import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, Moon, Sun } from "lucide-react";
import type { Package } from "@/lib/packages";
import { formatINR } from "@/lib/utils";
import { useMoney } from "@/store/preferences";
import { WishlistButton } from "@/components/WishlistButton";

export function PackageCard({ pkg }: { pkg: Package }) {
  const money = useMoney();
  return (
    <div className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md">
      <Link href={`/holidays/${pkg.slug}`} className="relative block h-44 overflow-hidden">
        <Image src={pkg.image} alt={pkg.destination} fill sizes="(max-width:640px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">{pkg.nights}N / {pkg.days}D</span>
        <WishlistButton className="absolute right-2 top-2" size={15} item={{ itemType: "DESTINATION", itemKey: `PKG:${pkg.slug}`, title: pkg.title, subtitle: pkg.destination, image: pkg.image, price: `${formatINR(pkg.priceINR)}/person`, href: `/holidays/${pkg.slug}` }} />
        <div className="absolute bottom-2 left-3 right-3 text-white">
          <p className="text-lg font-extrabold leading-tight drop-shadow">{pkg.title}</p>
          <p className="flex items-center gap-1 text-xs text-white/90"><MapPin size={11} /> {pkg.destination}</p>
        </div>
      </Link>
      <div className="p-4">
        <div className="flex flex-wrap gap-1.5">
          {pkg.themes.slice(0, 3).map((t) => <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{t}</span>)}
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <span className="flex items-center gap-1 text-xs text-amber-500"><Star size={12} className="fill-amber-400" /> {pkg.rating} <span className="text-slate-400">({pkg.reviews})</span></span>
            <p className="mt-1 text-[11px] text-slate-400">from</p>
            <p className="text-xl font-extrabold text-slate-900">{money(pkg.priceINR)} <span className="text-xs font-normal text-slate-400">/person</span></p>
          </div>
          <Link href={`/holidays/${pkg.slug}`} className="rounded-xl bg-gradient-to-r from-accent to-orange-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-95">View Details</Link>
        </div>
        <p className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1"><Moon size={11} /> {pkg.nights} nights</span>
          <span className="flex items-center gap-1"><Sun size={11} /> Best: {pkg.bestTime}</span>
        </p>
      </div>
    </div>
  );
}
