import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, BadgePercent, MapPin, Armchair, ArrowRight, Clock, Bus, BadgeCheck, Search, Ticket, Star } from "lucide-react";
import { HomeHeader } from "@/components/home/HomeHeader";
import { StickyNav } from "@/components/home/StickyNav";
import { Footer } from "@/components/Footer";
import { BusSearchWidget } from "@/components/bus/BusSearchWidget";
import { BUS_OPERATORS } from "@/lib/bus-constants";

const FEATURES = [
  { icon: Armchair, title: "Pick Your Seat", text: "Live seat maps — sleeper, seater & decks." },
  { icon: BadgePercent, title: "Lowest Bus Fares", text: "Instant discounts on 1000s of routes." },
  { icon: MapPin, title: "Track My Bus", text: "Live tracking & boarding-point details." },
  { icon: ShieldCheck, title: "Easy Cancellation", text: "Flexible cancellation on most operators." },
];

const ROUTES = [
  { from: "Delhi", to: "Kanpur", price: 549, hrs: "7h", buses: 48 },
  { from: "Mumbai", to: "Pune", price: 299, hrs: "3h 30m", buses: 120 },
  { from: "Bengaluru", to: "Goa", price: 899, hrs: "12h", buses: 36 },
  { from: "Delhi", to: "Jaipur", price: 449, hrs: "5h 30m", buses: 64 },
  { from: "Hyderabad", to: "Vijayawada", price: 399, hrs: "6h", buses: 52 },
  { from: "Chennai", to: "Coimbatore", price: 599, hrs: "8h", buses: 40 },
  { from: "Ahmedabad", to: "Udaipur", price: 499, hrs: "5h", buses: 28 },
  { from: "Indore", to: "Bhopal", price: 249, hrs: "3h 45m", buses: 56 },
];

const STEPS = [
  { icon: Search, title: "Search your route", text: "Enter your boarding & destination city and travel date." },
  { icon: Armchair, title: "Pick seat & bus", text: "Compare operators, see live seat maps and choose your spot." },
  { icon: Ticket, title: "Pay & get ticket", text: "Secure payment and an instant m-ticket on email & SMS." },
];

const FAQS = [
  { q: "How do I book a bus ticket on Tourist Leader?", a: "Enter your source city, destination and date of travel, then tap Search. Pick a bus, choose your seat and boarding point, enter passenger details and pay securely. Your m-ticket is sent instantly on email and SMS." },
  { q: "Can I choose my own seat?", a: "Yes. Every bus shows a live seat map where you can see available sleeper, seater and upper/lower deck seats and pick exactly the one you want before paying." },
  { q: "What is the cancellation policy?", a: "Cancellation charges depend on the bus operator and how close to departure you cancel. The exact refund amount is always shown before you confirm the cancellation from My Trips." },
  { q: "Will I get a refund if I cancel?", a: "Yes — eligible refunds are credited back to your original payment method or Tourist Leader wallet, minus the operator's cancellation fee, typically within 5–7 working days." },
  { q: "Can I track my bus?", a: "On most operators you can use Track My Bus from your ticket to see the live location and get boarding-point and timing updates." },
];

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function BusPage() {
  const date = tomorrow();
  return (
    <>
      <StickyNav active="bus" />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden pb-40 pt-28 sm:pb-44 sm:pt-32">
          <Image src="/heroes/bus.jpg" alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/75 via-slate-900/50 to-slate-900/30" />
          <HomeHeader />
          <div className="relative mx-auto max-w-7xl px-4 text-center text-white">
            <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-lg sm:text-5xl">Book bus tickets with comfort</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/95 drop-shadow sm:text-lg">1000s of routes, live seat selection &amp; the best fares — caring travel, all the way.</p>
          </div>
        </section>

        <div className="relative z-20 mx-auto -mt-36 max-w-7xl px-4"><BusSearchWidget /></div>

        {/* Why book with us */}
        <section className="mx-auto mt-16 max-w-7xl px-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand"><f.icon size={22} /></span>
                <h3 className="mt-3 font-bold text-slate-900">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Popular bus routes */}
        <section className="mx-auto mt-16 max-w-7xl px-4">
          <div className="mb-5">
            <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Popular bus routes</h2>
            <p className="mt-1 text-sm text-slate-500">Most-booked routes loved by our travellers — tap to see live buses.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROUTES.map((r) => (
              <Link
                key={`${r.from}-${r.to}`}
                href={`/bus/search?from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}&date=${date}`}
                className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-slate-900">
                  <span className="font-bold">{r.from}</span>
                  <ArrowRight size={16} className="text-brand transition-transform group-hover:translate-x-0.5" />
                  <span className="font-bold">{r.to}</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock size={13} /> {r.hrs}</span>
                  <span className="flex items-center gap-1"><Bus size={13} /> {r.buses}+ buses</span>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">
                  from <span className="text-base font-extrabold text-brand">₹{r.price}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Top bus operators */}
        <section className="mx-auto mt-16 max-w-7xl px-4">
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Top bus operators</h2>
          <p className="mt-1 text-sm text-slate-500">Verified partners running thousands of trips every day.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {BUS_OPERATORS.map((op) => (
              <div key={op} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><Bus size={18} /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{op}</p>
                  <p className="flex items-center gap-1 text-[11px] text-emerald-600"><BadgeCheck size={12} /> Verified partner</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto mt-16 max-w-7xl px-4">
          <h2 className="text-center text-xl font-extrabold text-slate-900 sm:text-2xl">Book a bus in 3 easy steps</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <span className="absolute right-5 top-5 text-4xl font-black text-slate-100">{i + 1}</span>
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand"><s.icon size={24} /></span>
                <h3 className="mt-4 font-bold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust banner */}
        <section className="mx-auto mt-16 max-w-7xl px-4">
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-gradient-to-r from-brand-dark to-brand px-6 py-8 text-center text-white sm:flex-row sm:justify-around sm:text-left">
            {[
              { icon: Bus, big: "5,00,000+", small: "Trips booked" },
              { icon: MapPin, big: "10,000+", small: "Routes covered" },
              { icon: Star, big: "4.6 / 5", small: "Traveller rating" },
              { icon: ShieldCheck, big: "100%", small: "Secure payments" },
            ].map((s) => (
              <div key={s.small} className="flex items-center gap-3">
                <s.icon size={28} className="opacity-90" />
                <div>
                  <p className="text-2xl font-extrabold leading-none">{s.big}</p>
                  <p className="mt-1 text-sm text-white/85">{s.small}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mb-16 mt-16 max-w-3xl px-4">
          <h2 className="text-center text-xl font-extrabold text-slate-900 sm:text-2xl">Frequently asked questions</h2>
          <div className="mt-6 space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                  {f.q}
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
