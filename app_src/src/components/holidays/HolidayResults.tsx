"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Palmtree } from "lucide-react";
import { DEMO_PACKAGES, PACKAGE_CATEGORIES, type Package } from "@/lib/packages";
import { PackageCard } from "./PackageCard";
import { ModifyHolidaySearch } from "./ModifyHolidaySearch";
import { cn } from "@/lib/utils";

const SORTS = [
  { id: "popular", label: "Popularity" },
  { id: "price_low", label: "Price: Low to High" },
  { id: "price_high", label: "Price: High to Low" },
  { id: "rating", label: "Rating" },
];

export function HolidayResults() {
  const sp = useSearchParams();
  const to = (sp.get("to") || "").trim();
  const [sort, setSort] = useState("popular");
  const [packages, setPackages] = useState<Package[]>(DEMO_PACKAGES);

  useEffect(() => {
    fetch("/api/packages", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (Array.isArray(d.packages) && d.packages.length) setPackages(d.packages); }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = to.toLowerCase();
    const catId = PACKAGE_CATEGORIES.find((c) => c.label.toLowerCase() === q)?.id;
    let list = packages.filter((p) => {
      if (!q) return true;
      if (catId && catId !== "ALL") return p.categories.includes(catId);
      return [p.country, p.destination, p.title, ...p.themes].join(" ").toLowerCase().includes(q);
    });
    if (list.length === 0) list = packages; // graceful fallback to all
    return [...list].sort((a, b) => {
      switch (sort) {
        case "price_low": return a.priceINR - b.priceINR;
        case "price_high": return b.priceINR - a.priceINR;
        case "rating": return b.rating - a.rating;
        default: return b.reviews - a.reviews;
      }
    });
  }, [to, sort, packages]);

  return (
    <>
    <ModifyHolidaySearch />
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 sm:text-xl"><Palmtree size={20} className="text-brand" /> Holiday packages{to ? ` for ${to}` : ""}</h1>
      <div className="mb-4 mt-3 flex items-center gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm no-scrollbar">
        <span className="shrink-0 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Sort</span>
        {SORTS.map((s) => <button key={s.id} onClick={() => setSort(s.id)} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold", sort === s.id ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100")}>{s.label}</button>)}
      </div>
      <p className="mb-3 text-sm text-slate-500">{filtered.length} package{filtered.length !== 1 ? "s" : ""} found</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((p) => <PackageCard key={p.id} pkg={p} />)}</div>
    </div>
    </>
  );
}
