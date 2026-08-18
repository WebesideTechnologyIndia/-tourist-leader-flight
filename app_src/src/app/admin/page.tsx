"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Palmtree, Plus, ReceiptText, Ticket, LifeBuoy, Users, IndianRupee, Plane, BedDouble, Bus, ArrowRight, Loader2, TrendingUp } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatINR, formatDate } from "@/lib/utils";

interface Stats { bookings: number; revenue: number; users: number; enquiries: number; openEnquiries: number; tickets: number; openTickets: number; packages: number; flightBookings: number; hotelBookings: number; busBookings: number }
interface Recent { id: string; bookingRef: string; bookingType: string; origin: string; destination: string; totalAmount: number; status: string; contactEmail: string; createdAt: string }

const TYPE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  FLIGHT: { icon: Plane, label: "Flight", color: "text-sky-600 bg-sky-50" },
  HOTEL: { icon: BedDouble, label: "Hotel", color: "text-violet-600 bg-violet-50" },
  BUS: { icon: Bus, label: "Bus", color: "text-amber-600 bg-amber-50" },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()).then((d) => { setStats(d.stats || null); setRecent(d.recent || []); }).finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell title="Dashboard">
      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Stat icon={ReceiptText} color="from-sky-500 to-blue-600" label="Total Bookings" value={String(stats?.bookings ?? 0)} href="/admin/bookings" />
            <Stat icon={IndianRupee} color="from-emerald-500 to-teal-600" label="Revenue" value={formatINR(stats?.revenue ?? 0)} />
            <Stat icon={Palmtree} color="from-violet-500 to-purple-600" label="Packages" value={String(stats?.packages ?? 0)} href="/admin/packages" />
            <Stat icon={Ticket} color="from-orange-500 to-amber-600" label="Enquiries" value={String(stats?.enquiries ?? 0)} sub={`${stats?.openEnquiries ?? 0} new`} href="/admin/enquiries" />
            <Stat icon={LifeBuoy} color="from-rose-500 to-pink-600" label="Tickets" value={String(stats?.tickets ?? 0)} sub={`${stats?.openTickets ?? 0} open`} href="/admin/tickets" />
            <Stat icon={Users} color="from-slate-600 to-slate-800" label="Users" value={String(stats?.users ?? 0)} href="/admin/users" />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
            {/* Recent bookings */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Recent bookings</h2>
                <Link href="/admin/bookings" className="flex items-center gap-1 text-sm font-semibold text-brand">View all <ArrowRight size={14} /></Link>
              </div>
              {recent.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No bookings yet.</p> : (
                <div className="space-y-2">
                  {recent.map((b) => {
                    const m = TYPE_META[b.bookingType] || TYPE_META.FLIGHT;
                    return (
                      <div key={b.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${m.color}`}><m.icon size={17} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{b.bookingRef} · {b.origin} → {b.destination}</p>
                          <p className="truncate text-xs text-slate-400">{b.contactEmail} · {formatDate(b.createdAt)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-slate-900">{formatINR(b.totalAmount)}</p>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{b.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Side: breakdown + quick actions */}
            <div className="space-y-5">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <h2 className="mb-3 flex items-center gap-1.5 font-bold text-slate-900"><TrendingUp size={17} className="text-brand" /> Bookings by type</h2>
                <Bar icon={Plane} label="Flights" value={stats?.flightBookings ?? 0} total={stats?.bookings ?? 1} color="bg-sky-500" />
                <Bar icon={BedDouble} label="Hotels" value={stats?.hotelBookings ?? 0} total={stats?.bookings ?? 1} color="bg-violet-500" />
                <Bar icon={Bus} label="Bus" value={stats?.busBookings ?? 0} total={stats?.bookings ?? 1} color="bg-amber-500" />
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <h2 className="mb-3 font-bold text-slate-900">Quick actions</h2>
                <Link href="/admin/packages/new" className="flex items-center gap-2 rounded-xl bg-brand/5 px-3 py-2.5 text-sm font-semibold text-brand hover:bg-brand/10"><Plus size={16} /> Create Holiday Package</Link>
                <Link href="/admin/enquiries" className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"><Ticket size={16} /> Review enquiries{stats?.openEnquiries ? <span className="ml-auto rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">{stats.openEnquiries}</span> : null}</Link>
                <Link href="/admin/tickets" className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"><LifeBuoy size={16} /> Answer support tickets{stats?.openTickets ? <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">{stats.openTickets}</span> : null}</Link>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}

function Stat({ icon: Icon, color, label, value, sub, href }: { icon: React.ElementType; color: string; label: string; value: string; sub?: string; href?: string }) {
  const inner = (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md">
      <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${color} text-white`}><Icon size={20} /></span>
      <p className="mt-3 text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}{sub ? <span className="ml-1 font-semibold text-brand">· {sub}</span> : ""}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Bar({ icon: Icon, label, value, total, color }: { icon: React.ElementType; label: string; value: number; total: number; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-sm"><span className="flex items-center gap-1.5 text-slate-600"><Icon size={14} /> {label}</span><span className="font-bold text-slate-800">{value}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
