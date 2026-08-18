import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, BadgePercent, Headphones, Sparkles, Star, Hotel, Palmtree, Home, Tent, Building2, BedDouble, Search, CalendarCheck, Wallet, ArrowRight } from "lucide-react";
import { HomeHeader } from "@/components/home/HomeHeader";
import { StickyNav } from "@/components/home/StickyNav";
import { Footer } from "@/components/Footer";
import { HotelSearchWidget } from "@/components/hotels/HotelSearchWidget";
import { HOTEL_BRANDS } from "@/lib/hotel-constants";

const FEATURES = [
  { icon: BadgePercent, title: "Lowest Price Promise", text: "Member deals & instant discounts on 50,000+ stays." },
  { icon: ShieldCheck, title: "Free Cancellation", text: "Flexible bookings on most hotels, refunded fast." },
  { icon: Headphones, title: "24×7 Support", text: "Comfort before, during, and after your stay." },
  { icon: Sparkles, title: "Handpicked Hotels", text: "Verified reviews and quality-checked properties." },
];

const CITIES = [
  { city: "Goa", img: "/destinations/goa.jpg", price: "₹1,499" },
  { city: "Mumbai", img: "/destinations/mumbai.jpg", price: "₹2,199" },
  { city: "Jaipur", img: "/destinations/jaipur.jpg", price: "₹1,799" },
  { city: "Bengaluru", img: "/destinations/bengaluru.jpg", price: "₹1,999" },
  { city: "Dubai", img: "/destinations/dubai.jpg", price: "₹6,499" },
  { city: "Singapore", img: "/destinations/singapore.jpg", price: "₹8,999" },
];

// All sections link into the hotel search flow (/hotels/search → /api/hotels/search).
function hotelHref(city: string, extra = "") {
  return `/hotels/search?city=${encodeURIComponent(city)}${extra}`;
}

const STAY_TYPES = [
  { icon: Hotel, label: "Hotels", hint: "City & business stays", city: "Mumbai", type: "hotel" },
  { icon: Palmtree, label: "Resorts", hint: "Beach & leisure", city: "Goa", type: "resort" },
  { icon: Home, label: "Villas", hint: "Private & spacious", city: "Udaipur", type: "villa" },
  { icon: Tent, label: "Homestays", hint: "Local & cosy", city: "Manali", type: "homestay" },
  { icon: Building2, label: "Apartments", hint: "Serviced & long-stay", city: "Bengaluru", type: "apartment" },
  { icon: BedDouble, label: "Hostels", hint: "Budget & social", city: "Jaipur", type: "hostel" },
];

const BRAND_CITIES = ["Goa", "Mumbai", "New Delhi", "Bengaluru", "Jaipur", "Udaipur"];

const STEPS = [
  { icon: Search, title: "Search stays", text: "Enter your city, check-in/out dates and guests to see live availability." },
  { icon: Hotel, title: "Pick your stay", text: "Compare price, rating, photos and amenities, then choose your room." },
  { icon: Wallet, title: "Book & relax", text: "Secure payment with free cancellation on most stays — voucher on email & SMS." },
];

const FAQS = [
  { q: "How do I book a hotel on Tourist Leader?", a: "Enter your destination city, check-in and check-out dates and the number of rooms & guests, then tap Search. Compare stays by price, rating and amenities, pick a room, add guest details and pay securely. Your booking voucher is sent instantly on email and SMS." },
  { q: "Is free cancellation available?", a: "Most properties offer free cancellation up to a cut-off date shown on the hotel and at checkout. The exact cancellation window and any charges are always displayed before you pay." },
  { q: "Can I book 5 or more rooms for a group?", a: "Yes. Switch to Group Deals in the search box to book 5+ rooms and unlock special group pricing and dedicated assistance." },
  { q: "Are taxes and fees included in the price?", a: "The price breakdown at checkout clearly shows the room tariff plus applicable taxes and fees, so you always know the final amount before paying." },
  { q: "Will I get a refund if I cancel?", a: "Eligible refunds for free-cancellation bookings are credited back to your original payment method or Tourist Leader wallet, typically within 5–7 working days." },
];

export default function HotelsPage() {
  return (
    <>
      <StickyNav active="hotels" />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden pb-40 pt-28 sm:pb-44 sm:pt-32">
          <Image src="/heroes/hotels.jpg" alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/70 via-slate-900/45 to-slate-900/30" />
          <HomeHeader />
          <div className="relative mx-auto max-w-7xl px-4 text-center text-white">
            <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-lg sm:text-5xl">Find your perfect stay</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/95 drop-shadow sm:text-lg">Handpicked hotels & resorts — comfort before, during, and after take off.</p>
          </div>
        </section>

        <div className="relative z-20 mx-auto -mt-36 max-w-7xl px-4">
          <HotelSearchWidget />
        </div>

        {/* Features */}
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

        {/* Top cities */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Top destinations for hotels</h2>
          <p className="mt-1 text-sm text-slate-500">Book stays in India&apos;s favourite getaways and beyond.</p>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {CITIES.map((c) => (
              <Link key={c.city} href={`/hotels/search?city=${encodeURIComponent(c.city)}`} className="group overflow-hidden rounded-2xl shadow-sm">
                <div className="relative h-28 overflow-hidden">
                  <Image src={c.img} alt={c.city} fill sizes="(max-width:640px) 50vw, 16vw" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/15 to-transparent" />
                  <span className="absolute bottom-2 left-3 text-lg font-extrabold text-white drop-shadow-lg">{c.city}</span>
                </div>
                <div className="flex items-center justify-between bg-white px-3 py-2.5">
                  <span className="flex items-center gap-1 text-xs text-amber-500"><Star size={12} className="fill-amber-400" /> 4.5</span>
                  <span className="text-sm font-bold text-slate-900">{c.price}<span className="text-[10px] font-normal text-slate-400">/night</span></span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Browse by stay type */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Browse by stay type</h2>
          <p className="mt-1 text-sm text-slate-500">From beach resorts to budget hostels — find the stay that fits your trip.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {STAY_TYPES.map((s) => (
              <Link
                key={s.label}
                href={hotelHref(s.city, `&type=${s.type}`)}
                className="group flex flex-col items-start rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white"><s.icon size={22} /></span>
                <h3 className="mt-3 font-bold text-slate-900">{s.label}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{s.hint}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Top hotel brands */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Top hotel brands</h2>
          <p className="mt-1 text-sm text-slate-500">Stay with names you trust — tap to explore availability.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {HOTEL_BRANDS.map((b, i) => (
              <Link
                key={b}
                href={hotelHref(BRAND_CITIES[i % BRAND_CITIES.length])}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><Hotel size={18} /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{b}</p>
                  <p className="flex items-center gap-1 text-[11px] text-amber-500"><Star size={11} className="fill-amber-400" /> 4.3+ rated</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Book in 3 easy steps */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-center text-xl font-bold text-slate-900 sm:text-2xl">Book a stay in 3 easy steps</h2>
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
              { icon: Hotel, big: "50,000+", small: "Stays to choose from" },
              { icon: CalendarCheck, big: "Free", small: "Cancellation on most" },
              { icon: Star, big: "4.5 / 5", small: "Guest rating" },
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
