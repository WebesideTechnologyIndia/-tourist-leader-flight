import Image from "next/image";
import { notFound } from "next/navigation";
import { Star, MapPin, Moon, Sun, Check, X, Calendar, CreditCard, ShieldAlert, Baby, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EnquiryButton } from "@/components/holidays/EnquiryButton";
import { WishlistButton } from "@/components/WishlistButton";
import { getPackageBySlug } from "@/lib/packages-db";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PackageDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  if (!pkg) notFound();

  return (
    <>
      <Header active="holidays" />
      <main className="flex-1 bg-background">
        {/* Hero */}
        <div className="relative h-64 sm:h-80">
          <Image src={pkg.image} alt={pkg.destination} fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-slate-900/30" />
          <WishlistButton className="absolute right-4 top-4" size={18} item={{ itemType: "DESTINATION", itemKey: `PKG:${pkg.slug}`, title: pkg.title, subtitle: pkg.destination, image: pkg.image, price: `${formatINR(pkg.priceINR)}/person`, href: `/holidays/${pkg.slug}` }} />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-5 text-white">
            <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">{pkg.nights} Nights / {pkg.days} Days</span>
            <h1 className="mt-2 text-2xl font-extrabold drop-shadow sm:text-4xl">{pkg.title}</h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/90">
              <span className="flex items-center gap-1"><MapPin size={14} /> {pkg.destination}</span>
              <span className="flex items-center gap-1"><Star size={13} className="fill-amber-400 text-amber-400" /> {pkg.rating} ({pkg.reviews} reviews)</span>
              <span className="flex items-center gap-1"><Sun size={13} /> Best: {pkg.bestTime}</span>
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Main */}
            <div className="space-y-5">
              <Section title="Overview">
                <p className="text-sm leading-relaxed text-slate-600">{pkg.overview}</p>
                <div className="mt-3 flex flex-wrap gap-2">{pkg.themes.map((t) => <span key={t} className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">{t}</span>)}</div>
              </Section>

              <Section title="Package Highlights" icon={Sparkles}>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {pkg.highlights.map((h, i) => <li key={i} className="flex gap-2 text-sm text-slate-700"><Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />{h}</li>)}
                </ul>
              </Section>

              {/* Itinerary timeline */}
              <Section title="Day-wise Itinerary" icon={Calendar}>
                <div className="space-y-4">
                  {pkg.itinerary.map((d) => (
                    <div key={d.day} className="relative pl-10">
                      <span className="absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-bold text-white">D{d.day}</span>
                      {d.day < pkg.itinerary.length && <span className="absolute left-4 top-8 h-[calc(100%-1rem)] w-px bg-slate-200" />}
                      <p className="font-bold text-slate-900">{d.title}</p>
                      {d.summary && <p className="text-xs text-slate-400">{d.summary}</p>}
                      <ul className="mt-1.5 space-y-1">
                        {d.points.map((p, i) => <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/60" />{p}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Inclusions / Exclusions */}
              <div className="grid gap-5 sm:grid-cols-2">
                <Section title="Inclusions">
                  <ul className="space-y-1.5">{pkg.inclusions.map((x, i) => <li key={i} className="flex gap-2 text-sm text-slate-700"><Check size={15} className="mt-0.5 shrink-0 text-emerald-500" />{x}</li>)}</ul>
                </Section>
                <Section title="Exclusions">
                  <ul className="space-y-1.5">{pkg.exclusions.map((x, i) => <li key={i} className="flex gap-2 text-sm text-slate-500"><X size={15} className="mt-0.5 shrink-0 text-rose-400" />{x}</li>)}</ul>
                </Section>
              </div>

              {/* Policies */}
              <Section title="Payment Policy" icon={CreditCard}><PolicyList items={pkg.paymentPolicy} /></Section>
              <Section title="Cancellation Policy" icon={ShieldAlert}><PolicyList items={pkg.cancellationPolicy} /></Section>
              <Section title="Child Policy" icon={Baby}><PolicyList items={pkg.childPolicy} /></Section>
            </div>

            {/* Sticky price card */}
            <div className="lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs text-slate-400">Starting from</p>
                <p className="text-3xl font-extrabold text-slate-900">{formatINR(pkg.priceINR)}<span className="text-sm font-normal text-slate-400"> /person</span></p>
                {pkg.priceUSD && <p className="text-xs text-slate-400">≈ ${pkg.priceUSD} per person · excl. taxes</p>}
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><Moon size={13} className="text-brand" /> {pkg.nights} nights</span>
                  <span className="flex items-center gap-1"><Calendar size={13} className="text-brand" /> {pkg.days} days</span>
                </div>
                <EnquiryButton pkg={pkg} label="Send Enquiry" className="mt-4 w-full" />
                <EnquiryButton pkg={pkg} variant="outline" label="Request Callback" className="mt-2 w-full" />
                <p className="mt-3 text-center text-[11px] text-slate-400">No payment now · our expert will call you with a customised quote.</p>
              </div>
              <div className="mt-3 rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100">
                <p className="text-sm font-semibold text-slate-800">Need help planning?</p>
                <p className="mt-1 text-xs text-slate-500">Call +91 9987-495-897<br/>help@touristleader.com</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">{Icon && <Icon size={18} className="text-brand" />} {title}</h2>
      {children}
    </div>
  );
}

function PolicyList({ items }: { items: string[] }) {
  return <ul className="space-y-1.5">{items.map((x, i) => <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{x}</li>)}</ul>;
}
