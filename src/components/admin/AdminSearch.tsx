"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ReceiptText, Palmtree, Ticket, LifeBuoy, User as UserIcon, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Hit { type: string; label: string; sub: string; href: string }
interface Group { title: string; hits: Hit[] }
const TYPE_ICON: Record<string, React.ElementType> = { booking: ReceiptText, package: Palmtree, enquiry: Ticket, ticket: LifeBuoy, user: UserIcon };

export function AdminSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setGroups([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(s)}`, { cache: "no-store" })
        .then((r) => r.json()).then((d) => { setGroups(d.groups || []); setOpen(true); }).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const go = (href: string) => { setOpen(false); setQ(""); setGroups([]); router.push(href); };
  const total = groups.reduce((a, g) => a + g.hits.length, 0);

  return (
    <div className="relative w-full max-w-md" ref={ref}>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-brand focus-within:bg-white">
        <Search size={16} className="shrink-0 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => q.length >= 2 && setOpen(true)} placeholder="Search bookings, packages, users, tickets…" className="w-full bg-transparent text-sm outline-none" />
        {loading && <Loader2 size={14} className="animate-spin text-slate-400" />}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl">
          {total === 0 && !loading ? (
            <p className="px-3 py-6 text-center text-sm text-slate-400">No results for “{q}”</p>
          ) : groups.map((g) => (
            <div key={g.title} className="mb-1">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{g.title}</p>
              {g.hits.map((h, i) => { const Icon = TYPE_ICON[h.type] || Search; return (
                <button key={i} onClick={() => go(h.href)} className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-brand/5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-brand/10 group-hover:text-brand"><Icon size={14} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{h.label}</span><span className="block truncate text-xs text-slate-400">{h.sub}</span></span>
                  <CornerDownLeft size={13} className="shrink-0 text-slate-300 opacity-0 group-hover:opacity-100" />
                </button>
              ); })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
