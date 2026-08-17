"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { Ticket, Search, PlaneTakeoff, ArrowRight, CalendarDays, User, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusResult {
  found: boolean;
  bookingRef?: string;
  pnr?: string | null;
  status?: string;
  paymentStatus?: string;
  bookingType?: string;
  tripType?: string;
  origin?: string;
  destination?: string;
  departDate?: string;
  returnDate?: string | null;
  cabinClass?: string;
  adults?: number;
  children?: number;
  infants?: number;
  leadPassenger?: string | null;
  totalAmount?: number;
  currency?: string;
  bookedOn?: string;
}

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-600/20",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

function fmtDate(d?: string | null) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return null;
  }
}

function money(amount?: number, currency = "INR") {
  if (amount == null) return null;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function PnrStatus() {
  const [ref, setRef] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StatusResult | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ref.trim() || !q.trim()) {
      setError("Please enter your PNR / booking reference and your email or last name.");
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/bookings/status?ref=${encodeURIComponent(ref.trim())}&q=${encodeURIComponent(q.trim())}`, { cache: "no-store" });
      const data = (await res.json()) as StatusResult & { error?: string };
      if (!res.ok) setError(data.error || "Something went wrong. Please try again.");
      else setResult(data);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const paxParts = result?.found
    ? [
        result.adults ? `${result.adults} Adult${result.adults > 1 ? "s" : ""}` : null,
        result.children ? `${result.children} Child${result.children > 1 ? "ren" : ""}` : null,
        result.infants ? `${result.infants} Infant${result.infants > 1 ? "s" : ""}` : null,
      ].filter(Boolean).join(" · ")
    : "";

  return (
    <section className="relative isolate overflow-hidden rounded-3xl shadow-lg">
      {/* Background travel photo + legibility overlays */}
      <Image src="/heroes/holidays.jpg" alt="" fill sizes="(max-width: 1280px) 100vw, 1280px" className="-z-10 object-cover object-center" />
      <div className="absolute inset-0 -z-10 bg-slate-900/45" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/25" />

      <div className="relative px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur">
            <Ticket size={14} /> Manage your trip
          </span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white drop-shadow sm:text-3xl">Check your booking status</h2>
          <p className="mt-1.5 max-w-xl text-sm text-white/90 drop-shadow sm:text-base">
            Enter your PNR or booking reference to track your trip instantly — no login needed.
          </p>

          {/* Frosted-glass lookup form */}
          <form onSubmit={onSubmit} className="mt-6 rounded-2xl bg-white/10 p-3 shadow-2xl ring-1 ring-inset ring-white/20 backdrop-blur-md sm:p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-white/85">PNR or Booking Reference</span>
                <span className="relative block">
                  <Ticket size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={ref}
                    onChange={(e) => setRef(e.target.value.toUpperCase())}
                    placeholder="e.g. TL8F3K2A or 6E-PNR"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-12 w-full rounded-xl border-0 bg-white pl-9 pr-3 text-sm font-semibold uppercase tracking-wide text-slate-900 placeholder:font-normal placeholder:normal-case placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </span>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-white/85">Email or Last name</span>
                <span className="relative block">
                  <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="you@email.com or Sharma"
                    autoComplete="off"
                    className="h-12 w-full rounded-xl border-0 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </span>
              </label>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 font-semibold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-60 sm:col-span-2 lg:col-span-1"
              >
                {loading ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
                {loading ? "Checking…" : "Check status"}
              </button>
            </div>
          </form>

          <p className="mt-3 text-xs text-white/70">Works for flight, hotel &amp; bus bookings · use the reference from your confirmation email or SMS.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-5 flex max-w-2xl items-start gap-2 rounded-2xl bg-white/95 p-4 text-sm text-rose-700 shadow-xl backdrop-blur">
            <AlertCircle size={18} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {/* Not found */}
        {result && !result.found && (
          <div className="mt-5 flex max-w-2xl items-start gap-2 rounded-2xl bg-white/95 p-4 text-sm shadow-xl backdrop-blur">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-slate-900">No matching booking found</p>
              <p className="mt-1 text-slate-600">Double-check your PNR / reference and the email or last name used at booking. Still stuck? Contact 24×7 support.</p>
            </div>
          </div>
        )}

        {/* Result card */}
        {result?.found && (
          <div className="mt-5 max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-medium text-slate-400">Booking Reference</span>
                <p className="text-lg font-extrabold tracking-wide text-slate-900">{result.bookingRef}</p>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ring-inset",
                  STATUS_STYLE[result.status || ""] || "bg-slate-100 text-slate-600 ring-slate-500/20"
                )}
              >
                {result.status === "CONFIRMED" && <CheckCircle2 size={13} />}
                {result.status}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                <PlaneTakeoff size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <span>{result.origin}</span>
                  <ArrowRight size={16} className="text-slate-400" />
                  <span>{result.destination}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {result.tripType === "ROUND_TRIP" ? "Round trip" : result.tripType === "MULTI_CITY" ? "Multi-city" : "One way"}
                  {result.cabinClass ? ` · ${result.cabinClass}` : ""}
                  {result.bookingType && result.bookingType !== "FLIGHT" ? ` · ${result.bookingType}` : ""}
                </p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              {result.pnr && (
                <div>
                  <dt className="text-xs text-slate-400">PNR</dt>
                  <dd className="font-bold tracking-wide text-slate-900">{result.pnr}</dd>
                </div>
              )}
              <div>
                <dt className="flex items-center gap-1 text-xs text-slate-400"><CalendarDays size={12} /> Departure</dt>
                <dd className="font-semibold text-slate-800">{fmtDate(result.departDate) || "—"}</dd>
              </div>
              {result.returnDate && (
                <div>
                  <dt className="flex items-center gap-1 text-xs text-slate-400"><CalendarDays size={12} /> Return</dt>
                  <dd className="font-semibold text-slate-800">{fmtDate(result.returnDate)}</dd>
                </div>
              )}
              {result.leadPassenger && (
                <div>
                  <dt className="flex items-center gap-1 text-xs text-slate-400"><User size={12} /> Lead passenger</dt>
                  <dd className="truncate font-semibold text-slate-800">{result.leadPassenger}</dd>
                </div>
              )}
              {paxParts && (
                <div>
                  <dt className="text-xs text-slate-400">Travellers</dt>
                  <dd className="font-semibold text-slate-800">{paxParts}</dd>
                </div>
              )}
              {result.totalAmount != null && (
                <div>
                  <dt className="text-xs text-slate-400">Amount paid</dt>
                  <dd className="font-bold text-brand">{money(result.totalAmount, result.currency)}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}
