"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { DEMO_PACKAGES, PACKAGE_CATEGORIES, type Package } from "@/lib/packages";
import { PackageCard } from "./PackageCard";
import { cn } from "@/lib/utils";

export function PackageGrid() {
  const [packages, setPackages] = useState<Package[]>(DEMO_PACKAGES);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("ALL");

  useEffect(() => {
    fetch("/api/packages", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.packages) && d.packages.length) setPackages(d.packages); })
      .finally(() => setLoading(false));
  }, []);

  const list = cat === "ALL" ? packages : packages.filter((p) => p.categories.includes(cat));
  return (
    <div>
      <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {PACKAGE_CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors", cat === c.id ? "bg-brand text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand/40")}>{c.label}</button>
        ))}
      </div>
      {loading && <div className="mb-4 flex items-center gap-2 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" /> Loading packages…</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => <PackageCard key={p.id} pkg={p} />)}
      </div>
    </div>
  );
}
