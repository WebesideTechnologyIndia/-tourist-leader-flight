"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LifeBuoy, Mail, Phone, Clock, MessageSquare, Loader2, CheckCircle2, AlertCircle, ChevronDown, Plane, CreditCard, RefreshCcw, XCircle, Luggage, HelpCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "BOOKING", label: "Booking issue", icon: Plane },
  { id: "PAYMENT", label: "Payment", icon: CreditCard },
  { id: "REFUND", label: "Refund", icon: RefreshCcw },
  { id: "CANCELLATION", label: "Cancellation", icon: XCircle },
  { id: "BAGGAGE", label: "Baggage", icon: Luggage },
  { id: "GENERAL", label: "Other", icon: HelpCircle },
];

const FAQS = [
  { q: "How do I cancel or reschedule my flight?", a: "Open My Trips, select your booking and choose Cancel or Reschedule. Airline rules and fees apply; the Tourist Leader convenience fee is non-refundable." },
  { q: "When will I get my refund?", a: "Approved refunds are processed to your original payment method, typically within 5–7 business days depending on the airline and your bank." },
  { q: "I didn't receive my ticket / invoice email.", a: "Check your spam folder. You can also re-download the ticket and invoice anytime from My Trips → View Invoice." },
  { q: "Can I add baggage or meals after booking?", a: "Yes, subject to airline availability. Raise a ticket below with your Booking ID and our team will assist." },
];

export default function HelpPage() {
  const router = useRouter();
  const { user, fetched, fetchMe } = useAuth();
  const [form, setForm] = useState({ category: "BOOKING", name: "", email: "", phone: "", bookingRef: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ticketNo, setTicketNo] = useState("");
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  useEffect(() => { if (!fetched) fetchMe(); }, [fetched, fetchMe]);
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name || "", email: f.email || user.email || "", phone: f.phone || user.phone || "" }));
  }, [user]);
  // Preselect the support category from footer links (?topic=cancellation|refund|baggage).
  useEffect(() => {
    const topic = new URLSearchParams(window.location.search).get("topic")?.toUpperCase();
    if (topic && CATEGORIES.some((c) => c.id === topic)) setForm((f) => ({ ...f, category: topic }));
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.ticketNo) setTicketNo(data.ticketNo);
      else setError(data.error || "Could not submit your ticket");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header active="help" />
      <main className="flex-1 bg-background">
        {/* Hero */}
        <section className="bg-gradient-to-br from-brand-dark to-brand py-12 text-center text-white">
          <LifeBuoy size={44} className="mx-auto" />
          <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">How can we help?</h1>
          <p className="mt-1 text-white/90">Raise a support ticket and our team will get back to you.</p>
        </section>

        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* Quick contact */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Contact icon={Mail} title="Email us" value="help@touristleader.com" />
            <Contact icon={Phone} title="Call us" value="+91 1800-123-4567" />
            <Contact icon={Clock} title="Support hours" value="24×7, all days" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Ticket form / success */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              {ticketNo ? (
                <div className="py-8 text-center">
                  <CheckCircle2 size={52} className="mx-auto text-emerald-500" />
                  <h2 className="mt-3 text-xl font-extrabold text-slate-900">Ticket created!</h2>
                  <p className="mt-1 text-sm text-slate-500">Your support ticket number is</p>
                  <p className="mt-2 inline-block rounded-xl bg-brand/10 px-4 py-2 text-lg font-extrabold text-brand">{ticketNo}</p>
                  <p className="mx-auto mt-3 max-w-sm text-sm text-slate-500">We&apos;ve emailed a confirmation to <b>{form.email}</b>. Our team typically responds within a few hours.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {user && <Button onClick={() => router.push("/account/tickets")}>Track my tickets</Button>}
                    <Button variant="outline" onClick={() => { setTicketNo(""); setForm((f) => ({ ...f, subject: "", message: "", bookingRef: "" })); }}>Raise another ticket</Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><MessageSquare size={20} className="text-brand" /> Raise a support ticket</h2>

                  {/* Category */}
                  <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">What do you need help with?</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {CATEGORIES.map((c) => (
                      <button type="button" key={c.id} onClick={() => set("category", c.id)}
                        className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors", form.category === c.id ? "border-brand bg-brand/5 text-brand" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                        <c.icon size={16} /> {c.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field label="Your name"><input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" className="inp" /></Field>
                    <Field label="Email"><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" className="inp" /></Field>
                    <Field label="Phone (optional)"><input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98xxxxxxx" className="inp" /></Field>
                    <Field label="Booking ID (optional)"><input value={form.bookingRef} onChange={(e) => set("bookingRef", e.target.value)} placeholder="e.g. TLAB12CD" className="inp uppercase" /></Field>
                  </div>
                  <div className="mt-3">
                    <Field label="Subject"><input value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Brief summary of your issue" className="inp" /></Field>
                  </div>
                  <div className="mt-3">
                    <Field label="Describe your issue"><textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={5} placeholder="Tell us what happened so we can help faster…" className="inp resize-none" /></Field>
                  </div>

                  {error && <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600"><AlertCircle size={14} /> {error}</p>}

                  <Button type="submit" className="mt-4 w-full sm:w-auto sm:px-10" disabled={loading}>
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : "Submit Ticket"}
                  </Button>
                </form>
              )}
            </div>

            {/* FAQ */}
            <div>
              <h2 className="mb-3 font-bold text-slate-900">Frequently asked</h2>
              <div className="space-y-2">
                {FAQS.map((f, i) => (
                  <div key={i} className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-100">
                    <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-800">
                      {f.q} <ChevronDown size={16} className={cn("shrink-0 text-slate-400 transition-transform", faqOpen === i && "rotate-180")} />
                    </button>
                    {faqOpen === i && <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">{f.a}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <style>{`.inp{width:100%;border:1px solid #e2e8f0;border-radius:0.75rem;padding:0.625rem 0.875rem;font-size:0.875rem;outline:none}.inp:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(11,99,214,.12)}`}</style>
    </>
  );
}

function Contact({ icon: Icon, title, value }: { icon: React.ElementType; title: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><Icon size={20} /></span>
      <div><p className="text-xs text-slate-400">{title}</p><p className="text-sm font-bold text-slate-800">{value}</p></div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}
