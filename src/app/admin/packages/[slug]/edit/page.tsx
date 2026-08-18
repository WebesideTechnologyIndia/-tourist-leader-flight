"use client";
import { use, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PackageForm } from "@/components/admin/PackageForm";
import type { Package } from "@/lib/packages";

export default function EditPackagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [pkg, setPkg] = useState<Package | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    fetch("/api/admin/packages", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const found = (d.packages || []).find((p: Package) => p.slug === slug);
        if (found) { setPkg(found); setState("ready"); }
        else setState("missing");
      })
      .catch(() => setState("missing"));
  }, [slug]);

  return (
    <AdminShell title={pkg ? `Edit · ${pkg.title}` : "Edit Package"}>
      {state === "loading" ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : state === "missing" ? (
        <p className="rounded-2xl bg-white p-10 text-center text-slate-500 shadow-sm">Package not found.</p>
      ) : (
        <PackageForm initial={pkg} />
      )}
    </AdminShell>
  );
}
