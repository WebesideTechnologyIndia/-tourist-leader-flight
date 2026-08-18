"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Bus as BusIcon, MapPin, Mail, Armchair, Home, Download } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { useBusBooking } from "@/store/bus-booking";
import { formatTime, formatDate, formatINR } from "@/lib/utils";

function Confirmation() {
  const sp = useSearchParams();
  const router = useRouter();
  const ref = sp.get("ref") || "";
  const tkt = sp.get("tkt") || "";
  const [mounted, setMounted] = useState(false);
  const { bus, query, seats, boarding, dropping, contactEmail, passengers } = useBusBooking();

  useEffect(() => { setMounted(true); if (!ref) router.replace("/bus"); }, [ref, router]);
  if (!mounted) return null;

  return (
    <main className="flex-1 bg-background">
      <div className="bg-gradient-to-b from-emerald-500 to-emerald-600 py-10 text-center text-white">
        <CheckCircle2 size={56} className="mx-auto animate-fade-up" />
        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">Bus Ticket Confirmed!</h1>
        <p className="mt-1 text-white/90">Comfort, all the way. Have a great journey.</p>
      </div>
      <div className="mx-auto -mt-6 max-w-2xl px-4 pb-10">
        <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-slate-200 pb-4">
            <div><p className="text-xs text-slate-400">Booking ID</p><p className="text-lg font-extrabold text-slate-900">{ref}</p></div>
            <div className="text-right"><p className="text-xs text-slate-400">Ticket No.</p><p className="text-lg font-extrabold text-brand">{tkt}</p></div>
          </div>
          {bus && (
            <div className="mt-4">
              <p className="flex items-center gap-2 font-bold text-slate-900"><BusIcon size={18} className="text-brand" /> {bus.operator} <span className="text-xs font-normal text-slate-400">· {bus.busType}</span></p>
              <div className="mt-3 flex items-center justify-between">
                <div><p className="text-xl font-extrabold text-slate-900">{formatTime(bus.departTime)}</p><p className="text-xs text-slate-400">{query?.from}</p></div>
                <div className="flex-1 px-3 text-center text-xs text-slate-400">{formatDate(bus.departTime)}<div className="my-1 flex items-center"><span className="h-px flex-1 bg-slate-200" /><BusIcon size={12} className="mx-1 text-slate-400" /><span className="h-px flex-1 bg-slate-200" /></div></div>
                <div className="text-right"><p className="text-xl font-extrabold text-slate-900">{formatTime(bus.arriveTime)}</p><p className="text-xs text-slate-400">{query?.to}</p></div>
              </div>
            </div>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Info icon={MapPin} title="Boarding" value={`${boarding?.name || "-"}${boarding?.time ? ` · ${boarding.time}` : ""}`} />
            <Info icon={MapPin} title="Dropping" value={dropping?.name || "-"} />
            <Info icon={Armchair} title="Seats" value={seats.map((s) => s.id).join(", ")} />
            <Info icon={BusIcon} title="Passengers" value={String(passengers.length || seats.length)} />
          </div>
          {contactEmail && <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"><Mail size={15} /> Ticket emailed to {contactEmail}</p>}
          <div className="no-print mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}><Download size={15} /> Download Ticket</Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/account/trips")}>My Dashboard</Button>
          </div>
          <p className="mt-3 text-center text-[11px] text-slate-400">Reach the boarding point 15 minutes early & carry a valid photo ID.</p>
        </div>
        <div className="mt-6 text-center"><Button variant="ghost" onClick={() => { useBusBooking.getState().reset(); router.push("/"); }}><Home size={16} /> Back to Home</Button></div>
      </div>
    </main>
  );
}

function Info({ icon: Icon, title, value }: { icon: React.ElementType; title: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Icon size={13} className="text-brand" /> {title}</p><p className="mt-0.5 text-sm font-bold text-slate-800">{value}</p></div>;
}

export default function BusConfirmationPage() {
  return (<><Header active="bus" /><Suspense fallback={<div className="flex-1 py-20 text-center text-slate-400">Loading…</div>}><Confirmation /></Suspense><Footer /></>);
}
