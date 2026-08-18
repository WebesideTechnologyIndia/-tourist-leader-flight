import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Headphones, Leaf, BadgePercent, Plane, ArrowRight, Clock, Star, Search, Wallet, Ticket } from "lucide-react";
import { HomeHeader } from "@/components/home/HomeHeader";
import { StickyNav } from "@/components/home/StickyNav";
import { Footer } from "@/components/Footer";
import { SearchWidget } from "@/components/home/SearchWidget";
import { OffersCarousel } from "@/components/home/OffersCarousel";
import { PnrStatus } from "@/components/home/PnrStatus";
import { WishlistButton } from "@/components/WishlistButton";
import { T } from "@/components/T";
import { AIRLINES } from "@/lib/constants";

const FEATURES = [
  { icon: Leaf, title: "Caring & Sustainable", text: "Carbon-aware itineraries and inclusive fares for every traveller." },
  { icon: ShieldCheck, title: "Seamless Booking", text: "From search to confirmation in a few comfortable taps." },
  { icon: Headphones, title: "24×7 Support", text: "Comfort before, during, and after take off — we're with you." },
  { icon: BadgePercent, title: "Best Fare Promise", text: "Fare calendar, bank offers and wallet cashback, always on." },
];

const DESTS = [
  { city: "Goa", code: "GOI", price: "₹2,499", img: "/destinations/goa.jpg" },
  { city: "Mumbai", code: "BOM", price: "₹1,899", img: "/destinations/mumbai.jpg" },
  { city: "Dubai", code: "DXB", price: "₹12,499", img: "/destinations/dubai.jpg" },
  { city: "Bengaluru", code: "BLR", price: "₹2,199", img: "/destinations/bengaluru.jpg" },
  { city: "Jaipur", code: "JAI", price: "₹2,799", img: "/destinations/jaipur.jpg" },
  { city: "Singapore", code: "SIN", price: "₹18,999", img: "/destinations/singapore.jpg" },
];

// Routes connect to the flight search flow (prefilled /flights/search → /api/flights/search).
function flightHref(from: string, to: string, extra = "") {
  return `/flights/search?tripType=ONE_WAY&from=${from}&to=${to}&cabinClass=Economy&adults=1&children=0&infants=0&passengerType=REGULAR${extra}`;
}

const ROUTES = [
  { fromCity: "New Delhi", from: "DEL", toCity: "Mumbai", to: "BOM", price: "₹1,899", hrs: "2h 10m", img: "/destinations/mumbai.jpg" },
  { fromCity: "New Delhi", from: "DEL", toCity: "Bengaluru", to: "BLR", price: "₹2,199", hrs: "2h 45m", img: "/destinations/bengaluru.jpg" },
  { fromCity: "Mumbai", from: "BOM", toCity: "Goa", to: "GOI", price: "₹1,499", hrs: "1h 25m", img: "/destinations/goa.jpg" },
  { fromCity: "New Delhi", from: "DEL", toCity: "Goa", to: "GOI", price: "₹2,499", hrs: "2h 35m", img: "/destinations/goa2.jpg" },
  { fromCity: "Bengaluru", from: "BLR", toCity: "Hyderabad", to: "HYD", price: "₹1,799", hrs: "1h 15m", img: "/destinations/hyderabad.jpg" },
  { fromCity: "Chennai", from: "MAA", toCity: "Kolkata", to: "CCU", price: "₹2,899", hrs: "2h 20m", img: "/destinations/kolkata.jpg" },
  { fromCity: "Mumbai", from: "BOM", toCity: "New Delhi", to: "DEL", price: "₹1,950", hrs: "2h 05m", img: "/destinations/delhi.jpg" },
  { fromCity: "New Delhi", from: "DEL", toCity: "Dubai", to: "DXB", price: "₹12,499", hrs: "3h 45m", img: "/destinations/dubai.jpg" },
];

const STEPS = [
  { icon: Search, title: "Search flights", text: "Pick your route, dates and travellers — compare live fares instantly." },
  { icon: Ticket, title: "Choose your fare", text: "Filter by airline, stops & timings, then pick the fare that suits you." },
  { icon: Wallet, title: "Pay & fly", text: "Secure payment, wallet & bank offers — e-ticket on email & SMS." },
];

const FAQS = [
  { q: "How do I book a flight on Tourist Leader?", a: "Enter your origin, destination, travel dates and number of travellers, then tap Search. Compare live fares, apply filters like airline or non-stop, pick a flight and fare, add passenger details and pay securely. Your e-ticket is sent instantly on email and SMS." },
  { q: "Can I search flights of a specific airline?", a: "Yes. Use Advanced Search on the home page and type an airline name or code (e.g. IndiGo or 6E). Your results will be filtered to that airline automatically. You can also tap any airline in the 'Top airlines' section below." },
  { q: "How do I find the cheapest day to fly?", a: "On the results page we show a fare calendar across nearby dates so you can instantly spot the lowest fare and shift your travel by a day or two to save." },
  { q: "Do you offer special fares for students, seniors or armed forces?", a: "Yes — choose a Fare Type (Student, Senior Citizen, Armed Forces, Medical and more) in the search box to unlock eligible discounts and benefits. Keep the relevant ID handy at the airport." },
  { q: "Can I cancel my flight and get a refund?", a: "Yes. Cancellation charges depend on the airline and fare rules; the exact refund is always shown before you confirm. Eligible refunds are credited to your original payment method or Tourist Leader wallet." },
];

export default function HomePage() {
  return (
    <>
      <StickyNav active="flights" />
      <main className="flex-1">
        {/* Hero with photo background + transparent header (MakeMyTrip style) */}
        <section className="relative isolate overflow-hidden pb-40 pt-28 sm:pb-44 sm:pt-32">
          <Image src="/heroes/flights.jpg" alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/70 via-slate-900/45 to-slate-900/25" />
          <HomeHeader />
          <div className="relative mx-auto max-w-7xl px-4 text-center text-white">
            <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-lg sm:text-5xl"><T k="hero_flights_title" /></h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/95 drop-shadow sm:text-lg"><T k="hero_flights_sub" /></p>
          </div>
        </section>

        {/* Search widget overlapping hero (z-20 so it paints above the positioned hero) */}
        <div className="relative z-20 mx-auto -mt-36 max-w-7xl px-4">
          <SearchWidget />
        </div>

        {/* Offers */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <OffersCarousel />
        </section>

        {/* Check PNR / booking status */}
        <section className="mx-auto mt-12 max-w-7xl px-4">
          <PnrStatus />
        </section>

        {/* Features */}
        <section className="mx-auto mt-12 max-w-7xl px-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand">
                  <f.icon size={22} />
                </span>
                <h3 className="mt-3 font-bold text-slate-900">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Popular destinations */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl"><T k="sec_popDest" /></h2>
          <p className="mt-1 text-sm text-slate-500"><T k="sec_popDestSub" /></p>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {DESTS.map((d) => (
              <Link
                key={d.code}
                href={`/flights/search?tripType=ONE_WAY&from=${d.code === "DEL" ? "BOM" : "DEL"}&to=${d.code}&cabinClass=Economy&adults=1&children=0&infants=0&passengerType=REGULAR`}
                className="group cursor-pointer overflow-hidden rounded-2xl shadow-sm"
              >
                <div className="relative h-28 overflow-hidden">
                  <Image src={d.img} alt={d.city} fill sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 16vw" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/15 to-transparent" />
                  <Plane size={56} className="absolute -bottom-3 -right-3 rotate-12 text-white/25" />
                  <WishlistButton className="absolute right-2 top-2" size={15} item={{ itemType: "DESTINATION", itemKey: d.code, title: d.city, subtitle: `Flights from ${d.price}`, image: d.img, price: d.price, href: `/flights/search?tripType=ONE_WAY&from=${d.code === "DEL" ? "BOM" : "DEL"}&to=${d.code}&cabinClass=Economy&adults=1&children=0&infants=0&passengerType=REGULAR` }} />
                  <span className="absolute bottom-2 left-3 text-lg font-extrabold text-white drop-shadow-lg">{d.city}</span>
                </div>
                <div className="flex items-center justify-between bg-white px-3 py-2.5">
                  <span className="text-xs text-slate-400">from</span>
                  <span className="text-sm font-bold text-slate-900">{d.price}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Popular flight routes */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl"><T k="sec_popRoutes" /></h2>
          <p className="mt-1 text-sm text-slate-500"><T k="sec_popRoutesSub" /></p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROUTES.map((r) => (
              <Link
                key={`${r.from}-${r.to}`}
                href={flightHref(r.from, r.to)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
              >
                <div className="relative h-28 overflow-hidden">
                  <Image
                    src={r.img}
                    alt={`${r.fromCity} to ${r.toCity}`}
                    fill
                    sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/25 to-transparent" />
                  <div className="absolute inset-x-3 bottom-2.5 flex items-center gap-2 text-sm text-white">
                    <span className="truncate font-bold drop-shadow-sm">{r.fromCity}</span>
                    <ArrowRight size={15} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
                    <span className="truncate font-bold drop-shadow-sm">{r.toCity}</span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Plane size={13} /> {r.from}–{r.to}</span>
                    <span className="flex items-center gap-1"><Clock size={13} /> {r.hrs}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm text-slate-500">from <span className="text-base font-extrabold text-brand">{r.price}</span></span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-brand opacity-0 transition-opacity group-hover:opacity-100">View <ArrowRight size={12} /></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Top airlines (wired to Advanced Search ?airline=) */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl"><T k="sec_topAir" /></h2>
          <p className="mt-1 text-sm text-slate-500"><T k="sec_topAirSub" /></p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {AIRLINES.map((a) => (
              <Link
                key={a.code}
                href={flightHref("DEL", "BOM", `&airline=${a.code}`)}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white" style={{ backgroundColor: a.color }}>
                  <Plane size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{a.name}</p>
                  <p className="text-[11px] text-slate-400">{a.code}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Book in 3 easy steps */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-center text-xl font-bold text-slate-900 sm:text-2xl"><T k="sec_book3" /></h2>
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
              { icon: Plane, big: "350+", small: "Airlines worldwide" },
              { icon: BadgePercent, big: "Best Fare", small: "Promise, always on" },
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
        <section className="mx-auto mb-16 mt-14 max-w-3xl px-4">
          <h2 className="text-center text-xl font-bold text-slate-900 sm:text-2xl"><T k="sec_faq" /></h2>
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
