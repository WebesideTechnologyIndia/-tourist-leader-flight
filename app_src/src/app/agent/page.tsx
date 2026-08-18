"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Ticket, LifeBuoy, ReceiptText, ArrowRight, Loader2, Plus, Headset, FilePlus2, UsersRound } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";

interface Stats { bookings: number; enquiries: number; openEnquiries: number; tickets: number; openTickets: number }

export default function AgentHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()).then((d) => setStats(d.stats || null)).catch(() => {}),
      fetch("/api/admin/me", { cache: "no-store" }).then((r) => r.json()).then((d) => setName(d.user?.name || d.user?.email?.split("@")[0] || "")).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const cards: { href: string; icon: React.ElementType; color: string; title: string; desc: string; value: number | string; suffix: string }[] = [
    { href: "/agent/enquiries", icon: Ticket, color: "from-orange-500 to-amber-600", title: "Leads", desc: "Work customer enquiries", value: stats?.openEnquiries ?? 0, suffix: "new" },
    { href: "/agent/tickets", icon: LifeBuoy, color: "from-rose-500 to-pink-600", title: "Support Tickets", desc: "Reply to customers", value: stats?.openTickets ?? 0, suffix: "open" },
    { href: "/agent/bookings", icon: ReceiptText, color: "from-sky-500 to-blue-600", title: "Bookings", desc: "View & assist", value: stats?.bookings ?? 0, suffix: "total" },
    { href: "/agent/invoices", icon: FilePlus2, color: "from-violet-500 to-purple-600", title: "Manual Invoices", desc: "Create a customer invoice", value: "＋", suffix: "new" },
    { href: "/agent/group-enquiries", icon: UsersRound, color: "from-teal-500 to-emerald-600", title: "Group Queries", desc: "Group booking leads", value: "", suffix: "" },
  ];

  return (
    <AdminShell title="My Workspace">
      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand to-sky-500 p-5 text-white shadow-sm">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/20"><Headset size={24} /></span>
        <div>
          <h2 className="text-lg font-extrabold">Hi{name ? `, ${name}` : ""}</h2>
          <p className="text-sm text-white/85">Here&apos;s your desk — leads to call, tickets to answer, bookings to assist.</p>
        </div>
        <Link href="/agent/enquiries" className="ml-auto hidden items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand sm:flex"><Plus size={16} /> New Lead</Link>
      </div>

      {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${c.color} text-white`}><c.icon size={22} /></span>
                <span className="text-right"><span className="block text-2xl font-extrabold text-slate-900">{c.value}</span><span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{c.suffix}</span></span>
              </div>
              <h3 className="mt-3 font-bold text-slate-900">{c.title}</h3>
              <p className="text-sm text-slate-500">{c.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">Open <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
