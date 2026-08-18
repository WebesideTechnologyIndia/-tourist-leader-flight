"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Mail, Home, CalendarDays, Clock, ShieldAlert } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { HotelSummaryCard, HotelPriceSummary } from "@/components/hotels/HotelBookingSummary";
import { useHotelBooking } from "@/store/hotel-booking";
import { formatDate } from "@/lib/utils";

function Confirmation() {
  const sp = useSearchParams();
  const router = useRouter();
  const ref = sp.get("ref") || "";
  const cnf = sp.get("cnf") || "";
  const [mounted, setMounted] = useState(false);
  const { hotel, guest, query } = useHotelBooking();

  useEffect(() => { setMounted(true); if (!ref) router.replace("/hotels"); }, [ref, router]);
  if (!mounted) return null;

  return (
    <main className="flex-1 bg-background">
      <div className="bg-gradient-to-b from-emerald-500 to-emerald-600 py-10 text-center text-white">
        <CheckCircle2 size={56} className="mx-auto animate-fade-up" />
        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">Stay Booked!</h1>
        <p className="mt-1 text-white/90">Your hotel is confirmed. Comfort, all the way.</p>
      </div>

      <div className="mx-auto -mt-6 max-w-3xl px-4 pb-10">
        <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-slate-200 pb-4">
            <div><p className="text-xs text-slate-400">Booking ID</p><p className="text-lg font-extrabold text-slate-900">{ref}</p></div>
            <div className="text-right"><p className="text-xs text-slate-400">Confirmation No.</p><p className="text-lg font-extrabold text-brand">{cnf}</p></div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <HotelSummaryCard />
            <HotelPriceSummary />
          </div>

          {guest?.email && (
            <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"><Mail size={15} /> Voucher emailed to {guest.email}</p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Info icon={CalendarDays} title="Dates" body={query ? `${formatDate(query.checkIn)} → ${formatDate(query.checkOut)}` : "-"} />
            <Info icon={Clock} title="Check-in / out" body="2 PM / 11 AM" />
            <Info icon={ShieldAlert} title="Cancellation" body={hotel?.freeCancellation ? "Free cancellation" : "Non-refundable"} />
          </div>
        </div>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => { useHotelBooking.getState().reset(); router.push("/hotels"); }}><Home size={16} /> Back to Hotels</Button>
        </div>
      </div>
    </main>
  );
}

function Info({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Icon size={15} className="text-brand" /> {title}</p>
      <p className="mt-1 text-xs text-slate-500">{body}</p>
    </div>
  );
}

export default function HotelConfirmationPage() {
  return (
    <>
      <Header active="hotels" />
      <Suspense fallback={<div className="flex-1 py-20 text-center text-slate-400">Loading…</div>}>
        <Confirmation />
      </Suspense>
      <Footer />
    </>
  );
}
