import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, BadgePercent, Headphones, Sparkles, Heart, Palmtree, Users, UsersRound, Stamp, Zap, ArrowRight, Star, Search, FileText, Wallet, Globe2 } from "lucide-react";
import { HomeHeader } from "@/components/home/HomeHeader";
import { StickyNav } from "@/components/home/StickyNav";
import { Footer } from "@/components/Footer";
import { PackageSearchWidget } from "@/components/holidays/PackageSearchWidget";
import { PackageGrid } from "@/components/holidays/PackageGrid";

const FEATURES = [
  { icon: BadgePercent, title: "Best Price, Guaranteed", text: "Customised quotes & exclusive package deals." },
  { icon: ShieldCheck, title: "Handcrafted Itineraries", text: "Curated day-by-day plans with local guides." },
  { icon: Headphones, title: "24×7 On-Trip Support", text: "Comfort before, during, and after your trip." },
  { icon: Sparkles, title: "Transfers & Sightseeing", text: "All transfers, entries & assistance included." },
];

// All link into the package search flow (/holidays/search filters by the `to` param).
function holidayHref(to: string) {
  return `/holidays/search?to=${encodeURIComponent(to)}`;
}

const DESTINATIONS = [
  { name: "Bali", img: "/packages/bali.jpg", price: "₹38,999" },
  { name: "Dubai", img: "/packages/dubai.jpg", price: "₹32,999" },
  { name: "Maldives", img: "/packages/maldives.jpg", price: "₹54,999" },
  { name: "Thailand", img: "/packages/thailand.jpg", price: "₹29,999" },
  { name: "Vietnam", img: "/packages/vietnam.jpg", price: "₹34,999" },
  { name: "Europe", img: "/packages/europe.jpg", price: "₹89,999" },
];

const THEMES = [
  { icon: Heart, label: "Honeymoon", hint: "Romantic getaways", to: "Honeymoon" },
  { icon: Palmtree, label: "Beach & Islands", hint: "Sun, sand & sea", to: "Beach & Islands" },
  { icon: Users, label: "Family", hint: "Fun for all ages", to: "Family" },
  { icon: UsersRound, label: "Group Tours", hint: "Travel together", to: "Group Tours" },
  { icon: Stamp, label: "Visa Free", hint: "No visa hassle", to: "Visa Free" },
  { icon: Zap, label: "Last Minute Deals", hint: "Grab & go", to: "Last Minute Deals" },
];

const STEPS = [
  { icon: Search, title: "Tell us your trip", text: "Pick a destination, travel dates and number of travellers." },
  { icon: FileText, title: "Get a custom quote", text: "Our holiday experts craft a day-by-day itinerary just for you." },
  { icon: Wallet, title: "Pay & pack", text: "Confirm, pay securely (full or part) — we handle the rest." },
];

const FAQS = [
  { q: "What's included in a Tourist Leader holiday package?", a: "Most packages include stays, airport & inter-city transfers, sightseeing with entry tickets, and on-trip assistance. Flights and visa can be added on request. The exact inclusions and exclusions are listed clearly on every package." },
  { q: "Can I customise my itinerary?", a: "Absolutely. Every package is a starting point — tell our holiday expert your preferred hotels, days, activities or budget and we'll tailor the trip and share a revised quote." },
  { q: "Are flights included in the package price?", a: "Package prices are typically land-only (stays, transfers, sightseeing). You can choose to add return flights and we'll include the best fares in your final quote." },
  { q: "How do I pay — full amount or part?", a: "You can reserve your holiday with a part payment and pay the balance before travel. The payment schedule is shown before you confirm." },
  { q: "What is the cancellation policy?", a: "Cancellation charges depend on the package and how close to departure you cancel; the exact policy is shown on each package. Eligible refunds are credited to your original payment method or Tourist Leader wallet." },
];

export default function HolidaysPage() {
  return (
    <>
      <StickyNav active="holidays" />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden pb-40 pt-28 sm:pb-44 sm:pt-32">
          <Image src="/heroes/holidays.jpg" alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/70 via-slate-900/45 to-slate-900/30" />
          <HomeHeader />
          <div className="relative mx-auto max-w-7xl px-4 text-center text-white">
            <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-lg sm:text-5xl">Holiday packages that care</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/95 drop-shadow sm:text-lg">Handcrafted trips with flights, stays, transfers &amp; sightseeing — made seamless.</p>
          </div>
        </section>

        <div className="relative z-20 mx-auto -mt-36 max-w-7xl px-4"><PackageSearchWidget /></div>

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

        {/* Top holiday destinations */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Top holiday destinations</h2>
          <p className="mt-1 text-sm text-slate-500">Dreamy escapes our travellers love — tap to explore packages.</p>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {DESTINATIONS.map((d) => (
              <Link key={d.name} href={holidayHref(d.name)} className="group overflow-hidden rounded-2xl shadow-sm">
                <div className="relative h-32 overflow-hidden">
                  <Image src={d.img} alt={d.name} fill sizes="(max-width:640px) 50vw, 16vw" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/20 to-transparent" />
                  <span className="absolute bottom-2 left-3 text-lg font-extrabold text-white drop-shadow-lg">{d.name}</span>
                </div>
                <div className="flex items-center justify-between bg-white px-3 py-2.5">
                  <span className="text-xs text-slate-400">from</span>
                  <span className="text-sm font-bold text-slate-900">{d.price}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Browse by theme */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Browse by theme</h2>
          <p className="mt-1 text-sm text-slate-500">Whatever your kind of trip — we have a package for it.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {THEMES.map((th) => (
              <Link key={th.label} href={holidayHref(th.to)} className="group flex flex-col items-start rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white"><th.icon size={22} /></span>
                <h3 className="mt-3 font-bold text-slate-900">{th.label}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{th.hint}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured packages */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Featured holiday packages</h2>
          <p className="mt-1 mb-5 text-sm text-slate-500">Top-rated trips loved by our travellers.</p>
          <PackageGrid />
        </section>

        {/* Plan your trip in 3 steps */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-center text-xl font-bold text-slate-900 sm:text-2xl">Plan your trip in 3 easy steps</h2>
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
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-gradient-to-r from-brand-dark to-brand px-6 py-8 text-center text-white sm:flex-row sm:justify-around sm:text-left">
            {[
              { icon: Palmtree, big: "1,00,000+", small: "Happy travellers" },
              { icon: Globe2, big: "50+", small: "Destinations" },
              { icon: Star, big: "4.7 / 5", small: "Traveller rating" },
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
        <section className="mx-auto mb-16 mt-14 max-w-3xl px-4">
          <h2 className="text-center text-xl font-bold text-slate-900 sm:text-2xl">Frequently asked questions</h2>
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
