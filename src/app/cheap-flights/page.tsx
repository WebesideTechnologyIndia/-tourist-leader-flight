import type { Metadata } from "next";
import Link from "next/link";
import { Plane, ArrowRight, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = { title: "Cheap Flights · Tourist Leader" };

function flightHref(from: string, to: string) {
  return `/flights/search?tripType=ONE_WAY&from=${from}&to=${to}&cabinClass=Economy&adults=1&children=0&infants=0&passengerType=REGULAR`;
}

const ROUTES = [
  { fromCity: "New Delhi", from: "DEL", toCity: "Mumbai", to: "BOM", price: "₹1,899", hrs: "2h 10m" },
  { fromCity: "Mumbai", from: "BOM", toCity: "Goa", to: "GOI", price: "₹1,499", hrs: "1h 25m" },
  { fromCity: "New Delhi", from: "DEL", toCity: "Bengaluru", to: "BLR", price: "₹2,199", hrs: "2h 45m" },
  { fromCity: "Bengaluru", from: "BLR", toCity: "Hyderabad", to: "HYD", price: "₹1,799", hrs: "1h 15m" },
  { fromCity: "Mumbai", from: "BOM", toCity: "New Delhi", to: "DEL", price: "₹1,950", hrs: "2h 05m" },
  { fromCity: "New Delhi", from: "DEL", toCity: "Goa", to: "GOI", price: "₹2,499", hrs: "2h 35m" },
  { fromCity: "Chennai", from: "MAA", toCity: "Kolkata", to: "CCU", price: "₹2,899", hrs: "2h 20m" },
  { fromCity: "New Delhi", from: "DEL", toCity: "Dubai", to: "DXB", price: "₹12,499", hrs: "3h 45m" },
];

export default function CheapFlightsPage() {
  return (
    <>
      <Header active="flights" />
      <main className="flex-1 bg-background">
        <section className="bg-gradient-to-br from-brand-dark to-brand py-14 text-center text-white">
          <Plane size={44} className="mx-auto" />
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Cheap Flights</h1>
          <p className="mx-auto mt-2 max-w-xl px-4 text-white/90">Lowest fares on India&apos;s most-loved routes — tap to see live prices.</p>
        </section>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROUTES.map((r) => (
              <Link key={`${r.from}-${r.to}`} href={flightHref(r.from, r.to)} className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">
                <div className="flex items-center gap-2 text-slate-900">
                  <span className="font-bold">{r.fromCity}</span>
                  <ArrowRight size={16} className="text-brand transition-transform group-hover:translate-x-0.5" />
                  <span className="font-bold">{r.toCity}</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Plane size={13} /> {r.from}–{r.to}</span>
                  <span className="flex items-center gap-1"><Clock size={13} /> {r.hrs}</span>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">from <span className="text-base font-extrabold text-brand">{r.price}</span></div>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">Fares are indicative; final prices are shown on the live search results.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
