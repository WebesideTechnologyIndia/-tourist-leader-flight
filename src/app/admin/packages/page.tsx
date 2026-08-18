"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ExternalLink, Loader2, Eye, EyeOff } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/utils";

interface Row {
  id: string; slug: string; title: string; destination: string; image: string;
  priceINR: number; nights: number; days: number; published: boolean; _demo: boolean;
}

export default function AdminPackagesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/packages", { cache: "no-store" }).then((r) => r.json()).then((d) => setRows(d.packages || [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const remove = async (slug: string) => {
    if (!confirm("Delete this package? This can't be undone.")) return;
    setBusy(slug);
    await fetch(`/api/admin/packages?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
    setBusy(""); load();
  };

  return (
    <AdminShell title="Holiday Packages">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{rows.length} package{rows.length !== 1 ? "s" : ""}</p>
        <Link href="/admin/packages/new"><Button><Plus size={16} /> Create Package</Button></Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="hidden grid-cols-[1fr_140px_120px_100px_120px] gap-3 border-b border-slate-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 sm:grid">
            <span>Package</span><span>Destination</span><span>Price</span><span>Status</span><span className="text-right">Actions</span>
          </div>
          {rows.map((p) => (
            <div key={p.slug} className="grid grid-cols-1 items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-0 sm:grid-cols-[1fr_140px_120px_100px_120px]">
              <div className="flex items-center gap-3 min-w-0">
                <Image src={p.image} alt="" width={48} height={36} className="h-9 w-12 shrink-0 rounded-md object-cover" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{p.title}</p>
                  <p className="text-xs text-slate-400">{p.nights}N/{p.days}D{p._demo ? " · demo (editable)" : ""}</p>
                </div>
              </div>
              <span className="truncate text-sm text-slate-600">{p.destination}</span>
              <span className="text-sm font-bold text-slate-900">{formatINR(p.priceINR)}</span>
              <span className={p.published ? "flex items-center gap-1 text-xs font-semibold text-emerald-600" : "flex items-center gap-1 text-xs font-semibold text-slate-400"}>{p.published ? <Eye size={13} /> : <EyeOff size={13} />} {p.published ? "Live" : "Hidden"}</span>
              <div className="flex items-center justify-start gap-1 sm:justify-end">
                <Link href={`/holidays/${p.slug}`} target="_blank" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand" title="View"><ExternalLink size={15} /></Link>
                <Link href={`/admin/packages/${p.slug}/edit`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand" title="Edit"><Pencil size={15} /></Link>
                <button onClick={() => remove(p.slug)} disabled={busy === p.slug} className="grid h-8 w-8 place-items-center rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600" title="Delete">{busy === p.slug ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={15} />}</button>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-400">No packages yet. Create your first one.</p>}
        </div>
      )}
    </AdminShell>
  );
}
