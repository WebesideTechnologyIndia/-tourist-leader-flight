import Image from "next/image";
import Link from "next/link";
import { FileText, ShieldCheck, Clock, Headset, Plane, Users, MapPin, Building2, Briefcase, Sparkles, ArrowRight, Send, FileCheck, Stamp, Star, Globe2 } from "lucide-react";
import { HomeHeader } from "@/components/home/HomeHeader";
import { StickyNav } from "@/components/home/StickyNav";
import { Footer } from "@/components/Footer";
import { VisaSearchWidget } from "@/components/visa/VisaSearchWidget";

const FEATURES = [
  { icon: FileText, title: "End-to-end paperwork", text: "Document checklist & application filled for you." },
  { icon: ShieldCheck, title: "Higher approval odds", text: "Expert review before every submission." },
  { icon: Clock, title: "Fast processing", text: "Tourist, business & family visas, on time." },
  { icon: Headset, title: "Dedicated visa expert", text: "One point of contact till you get the stamp." },
];

// Links prefill the enquiry widget (?country / ?purpose) and jump to it (#apply).
function visaHref(params: { country?: string; purpose?: string }) {
  const sp = new URLSearchParams(params as Record<string, string>);
  return `/visa?${sp.toString()}#apply`;
}

const DESTINATIONS = [
  { country: "United Arab Emirates (Dubai)", label: "Dubai (UAE)", time: "3–5 days", fee: "₹6,500" },
  { country: "Singapore", label: "Singapore", time: "3–5 days", fee: "₹2,000" },
  { country: "Thailand", label: "Thailand", time: "5–7 days", fee: "₹4,500" },
  { country: "Schengen (Europe)", label: "Schengen (Europe)", time: "10–15 days", fee: "₹9,500" },
  { country: "United States", label: "United States", time: "3–6 weeks", fee: "₹16,000" },
  { country: "United Kingdom", label: "United Kingdom", time: "15–20 days", fee: "₹14,000" },
  { country: "Malaysia", label: "Malaysia", time: "3–5 days", fee: "₹3,000" },
  { country: "Australia", label: "Australia", time: "2–4 weeks", fee: "₹12,000" },
];

const TYPES = [
  { icon: Plane, label: "Tourist", hint: "Holidays & sightseeing", purpose: "Tourism" },
  { icon: Users, label: "Family & Friends", hint: "Visit loved ones", purpose: "Friend and Family Visit" },
  { icon: MapPin, label: "Pilgrimage", hint: "Religious travel", purpose: "Pilgrims Visit" },
  { icon: Building2, label: "Expo / Exhibition", hint: "Events & fairs", purpose: "Expo / Exhibition" },
  { icon: Briefcase, label: "Work / Job", hint: "Employment & search", purpose: "Work / Job Search" },
  { icon: Sparkles, label: "Other", hint: "Tell us your need", purpose: "Others" },
];

const STEPS = [
  { icon: Send, title: "Send an enquiry", text: "Pick country, dates & purpose and submit the form." },
  { icon: FileCheck, title: "Share documents", text: "Upload passport & photos — we prepare your application." },
  { icon: Stamp, title: "We process it", text: "Expert review, appointment booking & embassy submission." },
  { icon: ShieldCheck, title: "Get your visa", text: "Track status and receive your approved visa on time." },
];

const FAQS = [
  { q: "How does the Tourist Leader visa service work?", a: "Tell us your destination, travel dates and purpose and send an enquiry. Our visa expert shares the exact document checklist, fees and timeline, prepares and reviews your application, books any appointment, and submits it to the embassy — keeping you updated until you get your visa." },
  { q: "Which documents will I need?", a: "It varies by country, but typically a passport valid for 6+ months, recent photos, proof of funds, confirmed flight & hotel bookings, and the filled application form. Your assigned expert sends an exact checklist for your specific visa." },
  { q: "How long does processing take?", a: "Most tourist visas take a few days to a couple of weeks depending on the country and embassy workload. The estimated time for your destination is shared upfront before you proceed." },
  { q: "Do you guarantee visa approval?", a: "Final approval always rests with the embassy/consulate, so no agent can guarantee it. What we do is maximise your chances with expert document review and correct, complete submissions." },
  { q: "What are the fees?", a: "Fees include the embassy/visa fee plus our service charge, shown transparently before you pay. The indicative 'from' price for each destination is listed above." },
];

export default function VisaPage() {
  return (
    <>
      <StickyNav active="visa" />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden pb-40 pt-28 sm:pb-44 sm:pt-32">
          <Image src="/heroes/visa.jpg" alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/75 via-slate-900/50 to-slate-900/30" />
          <HomeHeader />
          <div className="relative mx-auto max-w-7xl px-4 text-center text-white">
            <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-lg sm:text-5xl">Visas made simple</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/95 drop-shadow sm:text-lg">Tell us where you&apos;re headed — our experts handle the paperwork, appointments and approvals.</p>
          </div>
        </section>

        <div id="apply" className="relative z-20 mx-auto -mt-36 max-w-7xl scroll-mt-24 px-4"><VisaSearchWidget /></div>

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

        {/* Popular visa destinations */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Popular visa destinations</h2>
          <p className="mt-1 text-sm text-slate-500">Most-applied countries — tap to start your application.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DESTINATIONS.map((d) => (
              <Link key={d.country} href={visaHref({ country: d.country })} className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-bold text-slate-900"><Stamp size={16} className="text-brand" /> {d.label}</span>
                  <ArrowRight size={16} className="text-brand transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Clock size={13} /> {d.time}</div>
                <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">from <span className="text-base font-extrabold text-brand">{d.fee}</span></div>
              </Link>
            ))}
          </div>
        </section>

        {/* Visa types we handle */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Visa types we handle</h2>
          <p className="mt-1 text-sm text-slate-500">Whatever the reason you&apos;re travelling — we&apos;ll sort the visa.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {TYPES.map((ty) => (
              <Link key={ty.label} href={visaHref({ purpose: ty.purpose })} className="group flex flex-col items-start rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white"><ty.icon size={22} /></span>
                <h3 className="mt-3 font-bold text-slate-900">{ty.label}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{ty.hint}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto mt-14 max-w-7xl px-4">
          <h2 className="text-center text-xl font-bold text-slate-900 sm:text-2xl">How your visa gets done — in 4 steps</h2>
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
              { icon: Stamp, big: "50,000+", small: "Visas processed" },
              { icon: Globe2, big: "100+", small: "Countries covered" },
              { icon: Star, big: "98%", small: "Approval rate" },
              { icon: ShieldCheck, big: "100%", small: "Secure & confidential" },
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
