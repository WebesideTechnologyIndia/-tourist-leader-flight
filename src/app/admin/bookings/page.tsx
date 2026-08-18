"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plane, BedDouble, Bus, Search, FileText } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatINR, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { buildInvoiceHtml, buildInvoiceDataFromBooking, buildAgentB2BInvoiceHtml, openInvoice, type BookingLike } from "@/lib/invoice";

interface Booking extends BookingLike { id: string; source?: string; status: string; paymentStatus: string; bookedByAgentId?: string | null; agentName?: string | null }
const TABS = [["ALL", "All"], ["FLIGHT", "Flights"], ["HOTEL", "Hotels"], ["BUS", "Bus"]] as const;
const ICON: Record<string, React.ElementType> = { FLIGHT: Plane, HOTEL: BedDouble, BUS: Bus };

// Which API/supplier produced the booking. Flights come from Akbar (Benzy Infotech) or Amadeus.
const SOURCE_META: Record<string, { label: string; cls: string }> = {
  AMADEUS: { label: "Amadeus (AM)", cls: "bg-emerald-100 text-emerald-700" },
  BENZY: { label: "Akbar (AK)", cls: "bg-blue-100 text-blue-700" },
  BDSD: { label: "BDSD", cls: "bg-indigo-100 text-indigo-700" },
  DEMO: { label: "Demo", cls: "bg-slate-100 text-slate-500" },
};
function sourceMeta(s?: string) { return SOURCE_META[(s || "DEMO").toUpperCase()] || SOURCE_META.DEMO; }

// Where the booking came from: an agent's console, or the customer-facing website.
function channelMeta(b: Booking) {
  return b.bookedByAgentId
    ? { label: "Agent", sub: b.agentName || "Agent", cls: "bg-violet-100 text-violet-700" }
    : { label: "Website", sub: "Customer", cls: "bg-slate-100 text-slate-600" };
}

export default function AdminBookingsPage() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ALL");
  const [q, setQ] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/bookings${tab !== "ALL" ? `?type=${tab}` : ""}`, { cache: "no-store" }).then((r) => r.json()).then((d) => setRows(d.bookings || [])).finally(() => setLoading(false));
  }, [tab]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return rows;
    return rows.filter((b) => `${b.bookingRef} ${b.pnr} ${b.contactEmail} ${b.origin} ${b.destination}`.toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <AdminShell title="Bookings">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-100">
          {TABS.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", tab === id ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-50")}>{label}</button>)}
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
          <Search size={15} className="text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, email, route…" className="w-44 bg-transparent text-sm outline-none sm:w-56" />
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div> : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">API / Supplier</th><th className="px-4 py-3">Booked From</th><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Route</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Invoice</th>
            </tr></thead>
            <tbody>
              {filtered.map((b) => { const Icon = ICON[b.bookingType || "FLIGHT"] || Plane; return (
                <tr key={b.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3"><span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold", sourceMeta(b.source).cls)}>{sourceMeta(b.source).label}</span></td>
                  <td className="px-4 py-3"><span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold", channelMeta(b).cls)}>{channelMeta(b).label}</span>{b.bookedByAgentId && <p className="mt-0.5 max-w-[120px] truncate text-[10px] text-slate-400" title={channelMeta(b).sub}>{channelMeta(b).sub}</p>}</td>
                  <td className="px-4 py-3"><p className="font-semibold text-slate-900">{b.bookingRef}</p><p className="text-xs text-slate-400">{b.pnr || ""}</p></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600"><Icon size={11} /> {b.bookingType || "FLIGHT"}</span></td>
                  <td className="px-4 py-3 text-slate-700">{b.origin} → {b.destination}<p className="text-xs text-slate-400">{b.cabinClass}</p></td>
                  <td className="px-4 py-3"><p className="text-slate-700">{b.contactEmail}</p><p className="text-xs text-slate-400">{b.contactPhone}</p></td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(b.departDate)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{formatINR(b.totalAmount)}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{b.status}</span><p className="mt-0.5 text-[10px] text-slate-400">{b.paymentStatus}</p></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openInvoice(buildInvoiceHtml(buildInvoiceDataFromBooking(b), window.location.origin), b.bookingRef)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200" title="Customer tax invoice (full amount)">
                        <FileText size={13} /> Customer
                      </button>
                      {b.bookedByAgentId && (
                        <>
                          {/* What the agent owes us — statutory GST invoice, rendered
                              server-side because it carries our GSTIN/PAN/CIN. */}
                          <a href={`/api/admin/bookings/tax-invoice?ref=${encodeURIComponent(b.bookingRef)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200" title="GST tax invoice issued to the agent for this booking">
                            <FileText size={13} /> Tax Invoice
                          </a>
                          {/* What we owe the agent — commission & markup statement. */}
                          <button onClick={() => openInvoice(buildAgentB2BInvoiceHtml(b, window.location.origin), `${b.bookingRef}-B2B`)} className="inline-flex items-center gap-1 rounded-lg bg-violet-100 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-200" title="Agent earnings statement — service charge & commission">
                            <FileText size={13} /> Earnings
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ); })}
              {filtered.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400">No bookings found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
