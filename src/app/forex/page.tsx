import Image from "next/image";
import Link from "next/link";
import { Percent, Truck, ShieldCheck, Globe2, CreditCard, Banknote, ArrowRight, Send, Wallet, Star, Check, RefreshCw, Lock } from "lucide-react";
import { HomeHeader } from "@/components/home/HomeHeader";
import { StickyNav } from "@/components/home/StickyNav";
import { Footer } from "@/components/Footer";
import { ForexWidget } from "@/components/forex/ForexWidget";

const FEATURES = [
  { icon: Percent, title: "Best exchange rates", text: "Live, transparent rates — no hidden margins." },
  { icon: Truck, title: "Doorstep delivery", text: "Forex card or currency notes, home-delivered." },
  { icon: Globe2, title: "Multi-currency card", text: "Load 15+ currencies on a single travel card." },
  { icon: ShieldCheck, title: "RBI-authorised", text: "Secure, compliant forex through trusted partners." },
];

// Indicative INR buy-rates (final rate is locked at order). Not live.
const RATES = [
  { code: "USD", name: "US Dollar", rate: "₹88.20" },
  { code: "EUR", name: "Euro", rate: "₹95.40" },
  { code: "GBP", name: "British Pound", rate: "₹112.10" },
  { code: "AED", name: "UAE Dirham", rate: "₹24.05" },
  { code: "SGD", name: "Singapore Dollar", rate: "₹65.30" },
  { code: "AUD", name: "Australian Dollar", rate: "₹58.40" },
  { code: "CAD", name: "Canadian Dollar", rate: "₹64.80" },
  { code: "JPY", name: "Japanese Yen", rate: "₹0.59" },
];

const CARD_PERKS = ["Load 15+ currencies on one card", "Lock today's rate, spend anytime", "Reloadable & blockable if lost", "Use at ATMs & shops abroad", "Safer than carrying cash"];
const NOTES_PERKS = ["Cash in hand on arrival", "Great for tips & small spends", "No card or device needed", "Doorstep delivery before you fly", "Best rates on popular currencies"];

const STEPS = [
  { icon: CreditCard, title: "Choose card or notes", text: "Pick a multi-currency forex card or foreign currency notes." },
  { icon: Send, title: "Send your request", text: "Tell us the currencies and amount you need." },
  { icon: Wallet, title: "Pay at the locked rate", text: "Confirm at the best transparent rate, no hidden margin." },
  { icon: Truck, title: "Doorstep delivery", text: "Get it delivered to your home before you travel." },
];

const FAQS = [
  { q: "What is a multi-currency forex card?", a: "It's a prepaid travel card you can load with 15+ currencies at today's locked rate. You then spend abroad at ATMs and shops without worrying about fluctuating rates or carrying lots of cash — and it can be blocked/reloaded if lost." },
  { q: "Forex card or cash — which should I choose?", a: "A forex card is safer and locks your rate for most spending; foreign currency notes are handy for tips, taxis and small purchases on arrival. Many travellers carry a card plus a little cash." },
  { q: "How are the exchange rates decided?", a: "Rates are live and transparent with no hidden margin. The indicative rates shown here update through the day; your final rate is locked the moment you confirm your order." },
  { q: "How fast is delivery?", a: "Once your request and documents are verified, forex is typically delivered to your doorstep within 1–2 working days in most cities (pickup options are also available)." },
  { q: "What documents do I need?", a: "Usually your passport, confirmed air ticket, visa (where applicable) and PAN. Your forex expert shares the exact list based on your destination and the amount." },
];

export default function ForexPage() {
  return (
    <>
      <StickyNav active="forex" />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden pb-40 pt-28 sm:pb-44 sm:pt-32">
          <Image src="/heroes/forex.jpg" alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/75 via-slate-900/50 to-slate-900/30" />
          <HomeHeader />
          <div className="relative mx-auto max-w-7xl px-4 text-center text-white">
            <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-lg sm:text-5xl">Forex, sorted before you fly</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/95 drop-shadow sm:text-lg">Order a multi-currency forex card or foreign currency notes at the best rates — delivered to your door.</p>
          </div>
        </section>

        <div id="order" className="relative z-20 mx-auto -mt-36 max-w-7xl scroll-mt-24 px-4"><ForexWidget /></div>

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

        {/* Today's indicative rates */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Today&apos;s indicative rates</h2>
              <p className="mt-1 text-sm text-slate-500">Transparent buy-rates per unit — your final rate is locked at order.</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600"><RefreshCw size={12} /> Updated through the day</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {RATES.map((r) => (
              <Link key={r.code} href="/forex#order" className="group flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900">{r.code}</p>
                  <p className="truncate text-[11px] text-slate-500">{r.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-extrabold text-brand">{r.rate}</p>
                  <p className="flex items-center justify-end gap-1 text-[10px] text-slate-400"><Lock size={9} /> lock</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Card vs Notes */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Forex card or currency notes?</h2>
          <p className="mt-1 text-sm text-slate-500">Pick what suits your trip — tap to start your order.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              { id: "CARD", icon: CreditCard, title: "Multi-Currency Forex Card", sub: "Load multiple currencies on one card", perks: CARD_PERKS },
              { id: "NOTES", icon: Banknote, title: "Foreign Currency Notes", sub: "Cash in foreign currency, home-delivered", perks: NOTES_PERKS },
            ].map((c) => (
              <Link key={c.id} href={`/forex?type=${c.id}#order`} className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white"><c.icon size={24} /></span>
                  <div><h3 className="font-bold text-slate-900">{c.title}</h3><p className="text-xs text-slate-500">{c.sub}</p></div>
                </div>
                <ul className="mt-4 flex-1 space-y-2">
                  {c.perks.map((p) => <li key={p} className="flex items-start gap-2 text-sm text-slate-600"><Check size={15} className="mt-0.5 shrink-0 text-emerald-600" /> {p}</li>)}
                </ul>
                <span className="mt-4 flex items-center gap-1.5 text-sm font-bold text-brand">Order this <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></span>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-center text-xl font-bold text-slate-900 sm:text-2xl">Get your forex in 4 easy steps</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              { icon: Truck, big: "1,00,000+", small: "Orders delivered" },
              { icon: Globe2, big: "15+", small: "Currencies" },
              { icon: ShieldCheck, big: "RBI", small: "Authorised partners" },
              { icon: Star, big: "4.7 / 5", small: "Customer rating" },
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
