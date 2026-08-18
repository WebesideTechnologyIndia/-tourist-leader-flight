import Image from "next/image";
import { TrendingUp, Wallet, Users2, ShieldCheck } from "lucide-react";
import { HomeHeader } from "@/components/home/HomeHeader";
import { StickyNav } from "@/components/home/StickyNav";
import { Footer } from "@/components/Footer";
import { PartnerEnquiryForm } from "@/components/partner/PartnerEnquiryForm";

const BENEFITS = [
  { icon: TrendingUp, title: "More bookings", text: "Reach millions of travellers across India." },
  { icon: Wallet, title: "Fast payouts", text: "Reliable, on-time settlements to your account." },
  { icon: Users2, title: "Dedicated support", text: "An onboarding manager to get you live fast." },
  { icon: ShieldCheck, title: "Zero joining fee", text: "List free — pay only a small commission per booking." },
];

export default function ListPropertyPage() {
  return (
    <>
      <StickyNav active="" />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden pb-16 pt-28 sm:pt-32">
          <Image src="/hotels/hero.jpg" alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900/70" />
          <HomeHeader />
          <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 lg:grid-cols-2">
            <div className="text-white">
              <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">List Your Property · Grow your business</span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight drop-shadow-lg sm:text-5xl">Turn your property into a business</h1>
              <p className="mt-3 max-w-lg text-sm text-white/90 drop-shadow sm:text-lg">Hotels, homestays, villas &amp; more — list with Tourist Leader and start welcoming guests from across India.</p>
            </div>
            <div><PartnerEnquiryForm type="LIST_PROPERTY" /></div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand"><b.icon size={22} /></span>
                <h3 className="mt-3 font-bold text-slate-900">{b.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{b.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
