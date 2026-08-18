"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, Copy, Check, BadgePercent, Loader2, Sparkles, CalendarClock } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { OFFER_CATEGORIES, type Offer, type OfferCategory } from "@/lib/offers";
import { cn } from "@/lib/utils";

export default function OffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<OfferCategory | "ALL">("ALL");
  const [copied, setCopied] = useState("");
  const [detail, setDetail] = useState<Offer | null>(null);

  useEffect(() => {
    fetch("/api/offers", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setOffers(d.offers || []); setLive(d.live); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(""), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); setCopied(code); } catch { /* ignore */ }
  };

  const filtered = cat === "ALL" ? offers : offers.filter((o) => o.category === cat);

  return (
    <>
      <Header active="offers" />
      <main className="flex-1 bg-background">
        {/* Hero */}
        <section className="bg-gradient-to-br from-brand-dark to-brand py-12 text-center text-white">
          <Sparkles size={40} className="mx-auto" />
          <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">Offers & Deals</h1>
          <p className="mt-1 text-white/90">Bank offers, wallet cashback & seasonal fares — grab them before they fly.</p>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-8">
          {/* Category filter */}
          <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
            {OFFER_CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)}
                className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors", cat === c.id ? "bg-brand text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand/40")}>
                {c.label}
              </button>
            ))}
            {!live && (
              <span className="ml-auto hidden shrink-0 items-center self-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 sm:flex">Demo offers — live Benzy API pending IP whitelist</span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm"><p className="font-bold text-slate-800">No offers in this category right now.</p></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((o) => (
                <div key={o.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                  <div className={cn("relative bg-gradient-to-br p-5 text-white", o.bg)}>
                    <BadgePercent size={72} className="absolute -bottom-4 -right-4 rotate-12 text-white/20" />
                    <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide backdrop-blur">{o.category}</span>
                    <p className="mt-2 text-xl font-extrabold">{o.discount}</p>
                    <p className="mt-0.5 text-sm text-white/90">{o.subtitle}</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800"><Tag size={14} className="text-brand" /> {o.code}</span>
                      <button onClick={() => copy(o.code)} className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                        {copied === o.code ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                      </button>
                    </div>
                    {(o.minBooking || o.validTill) && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        {o.minBooking && <span>{o.minBooking}</span>}
                        {o.validTill && <span className="flex items-center gap-1"><CalendarClock size={11} /> Valid till {o.validTill}</span>}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <button onClick={() => setDetail(o)} className="text-xs font-semibold text-slate-500 hover:text-brand">View details</button>
                      <Button size="sm" onClick={() => router.push("/")}>Book now</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title}>
        {detail && (
          <div>
            <div className={cn("rounded-xl bg-gradient-to-br p-4 text-white", detail.bg)}>
              <p className="text-lg font-extrabold">{detail.discount}</p>
              <p className="text-sm text-white/90">{detail.subtitle}</p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2">
              <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800"><Tag size={14} className="text-brand" /> {detail.code}</span>
              <button onClick={() => copy(detail.code)} className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                {copied === detail.code ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy code</>}
              </button>
            </div>
            <p className="mt-4 mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">Terms &amp; Conditions</p>
            <ul className="space-y-1.5">
              {detail.terms.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{t}</li>
              ))}
            </ul>
            <Button className="mt-4 w-full" onClick={() => { setDetail(null); router.push("/"); }}>Book now & apply</Button>
          </div>
        )}
      </Modal>

      {copied && (
        <div className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl animate-fade-up">
          <Check size={15} className="text-emerald-400" /> Code <b>{copied}</b> copied!
        </div>
      )}
    </>
  );
}
