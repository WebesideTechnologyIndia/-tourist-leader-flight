import Image from "next/image";
import Link from "next/link";
import { Zap, HeartPulse, Globe2, FileCheck, Plane, Car, Home, ShieldCheck, ArrowRight, Luggage, CalendarX, Clock, Stamp, Search, BadgeCheck, Wallet, Star } from "lucide-react";
import { HomeHeader } from "@/components/home/HomeHeader";
import { StickyNav } from "@/components/home/StickyNav";
import { Footer } from "@/components/Footer";
import { InsuranceWidget } from "@/components/insurance/InsuranceWidget";

const FEATURES = [
  { icon: Zap, title: "Instant policy", text: "Get covered in minutes — policy on email instantly." },
  { icon: Globe2, title: "Cashless globally", text: "Cashless hospitalisation at network hospitals worldwide." },
  { icon: HeartPulse, title: "Wide medical cover", text: "Medical expenses, trip cancellations, lost luggage & more." },
  { icon: FileCheck, title: "Quick & easy claims", text: "On-trip support and a fast, simple claim process." },
];

// Links prefill the quote widget (?type) and jump to it (#quote).
const PLANS = [
  { type: "TRAVEL", icon: Plane, title: "Travel Insurance", text: "Medical, trip cancellation, baggage & delays — anywhere you fly." },
  { type: "MOTOR", icon: Car, title: "Motor Insurance", text: "Car & bike cover — own damage plus third-party liability." },
  { type: "HOUSE", icon: Home, title: "House Insurance", text: "Protect your home structure & contents from fire, theft & more." },
  { type: "LIFE", icon: HeartPulse, title: "Life Insurance", text: "Term & savings plans to secure your family's future." },
];

const COVERS = [
  { icon: HeartPulse, label: "Emergency medical", text: "Hospitalisation & treatment abroad" },
  { icon: CalendarX, label: "Trip cancellation", text: "Refund if your trip is cut short" },
  { icon: Luggage, label: "Lost / delayed baggage", text: "Compensation for your bags" },
  { icon: Clock, label: "Flight delay", text: "Payout for long delays" },
  { icon: Stamp, label: "Passport loss", text: "Help & cover for lost documents" },
  { icon: ShieldCheck, label: "Personal accident", text: "Accident & emergency evacuation" },
];

const STEPS = [
  { icon: Search, title: "Tell us your trip", text: "Pick a cover type, destination and travellers." },
  { icon: BadgeCheck, title: "Compare quotes", text: "Best plans from trusted, IRDAI-registered insurers." },
  { icon: Wallet, title: "Buy securely", text: "Pay online in minutes — no paperwork needed." },
  { icon: FileCheck, title: "Get policy instantly", text: "Your policy lands on email & SMS right away." },
];

const FAQS = [
  { q: "What does travel insurance cover?", a: "A travel plan typically covers emergency medical treatment and hospitalisation abroad, trip cancellation or interruption, lost or delayed baggage, flight delays, loss of passport, and personal accident — with cashless treatment at network hospitals worldwide." },
  { q: "Is travel insurance mandatory for a visa?", a: "For many destinations — including all Schengen (Europe) countries — travel medical insurance with a minimum cover is mandatory for the visa. We'll make sure your plan meets the embassy's requirement." },
  { q: "Does it cover medical emergencies abroad?", a: "Yes. Emergency medical expenses and hospitalisation are core to every travel plan, usually on a cashless basis at network hospitals, with 24×7 assistance while you travel." },
  { q: "Can I claim cashless?", a: "At network hospitals, yes — show your policy and the insurer settles directly. For non-network providers you pay and claim reimbursement with the bills; our team helps you through it." },
  { q: "How do I make a claim?", a: "Intimate the claim via the insurer's helpline or our support, share the required documents (bills, reports, police report if applicable), and track it to settlement. We assist end-to-end so it's quick and simple." },
];

export default function InsurancePage() {
  return (
    <>
      <StickyNav active="insurance" />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden pb-40 pt-28 sm:pb-44 sm:pt-32">
          <Image src="/heroes/insurance.jpg" alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/75 via-slate-900/50 to-slate-900/30" />
          <HomeHeader />
          <div className="relative mx-auto max-w-7xl px-4 text-center text-white">
            <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-lg sm:text-5xl">Insurance for every journey</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/95 drop-shadow sm:text-lg">Travel, motor, house &amp; life — get the right cover at the best price, with absolute peace of mind.</p>
          </div>
        </section>

        <div id="quote" className="relative z-20 mx-auto -mt-36 max-w-7xl scroll-mt-24 px-4"><InsuranceWidget /></div>

        <section className="mx-auto mt-16 max-w-7xl px-4">
          <h2 className="mb-4 text-center text-lg font-bold text-slate-900">International Travel + Medical Insurance &amp; Assistance</h2>
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

        {/* Insurance plans we offer */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Insurance plans we offer</h2>
          <p className="mt-1 text-sm text-slate-500">One place for every cover — tap to get a quote.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <Link key={p.type} href={`/insurance?type=${p.type}#quote`} className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white"><p.icon size={24} /></span>
                <h3 className="mt-3 font-bold text-slate-900">{p.title}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-500">{p.text}</p>
                <span className="mt-3 flex items-center gap-1.5 text-sm font-bold text-brand">Get a quote <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></span>
              </Link>
            ))}
          </div>
        </section>

        {/* What travel cover includes */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">What your travel cover includes</h2>
          <p className="mt-1 text-sm text-slate-500">Comprehensive protection so you can travel worry-free.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COVERS.map((c) => (
              <div key={c.label} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><c.icon size={22} /></span>
                <div>
                  <h3 className="font-bold text-slate-900">{c.label}</h3>
                  <p className="mt-0.5 text-sm text-slate-500">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-center text-xl font-bold text-slate-900 sm:text-2xl">Get covered in 4 easy steps</h2>
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
              { icon: FileCheck, big: "5,00,000+", small: "Policies issued" },
              { icon: Globe2, big: "1,50+", small: "Countries covered" },
              { icon: HeartPulse, big: "98%", small: "Claims settled" },
              { icon: ShieldCheck, big: "100%", small: "Secure & IRDAI-registered" },
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
