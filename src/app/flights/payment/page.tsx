"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Smartphone, CreditCard, Building2, Wallet, Landmark, Lock, Loader2, AlertCircle, X } from "lucide-react";
import { Header } from "@/components/Header";
import { Stepper } from "@/components/Stepper";
import { Button } from "@/components/ui/Button";
import { FlightSummaryCard } from "@/components/booking/FlightSummaryCard";
import { PriceSummary } from "@/components/booking/PriceSummary";
import { useBooking } from "@/store/booking";
import { useAuth } from "@/store/auth";
import { useBilling } from "@/lib/useBilling";
import { promoDiscount } from "@/lib/offers";
import { WalletPayToggle } from "@/components/billing/WalletPayToggle";
import { cn, formatINR } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { Razorpay?: any }
}

const METHODS = [
  { id: "upi", label: "UPI", icon: Smartphone, note: "Pay via any UPI app & win assured cashback" },
  { id: "card", label: "Credit / Debit Card", icon: CreditCard, note: "Visa, Mastercard, RuPay, Amex" },
  { id: "netbanking", label: "Net Banking", icon: Building2, note: "All major banks supported" },
  { id: "wallet", label: "Wallets", icon: Wallet, note: "Paytm, PhonePe, Amazon Pay" },
  { id: "emi", label: "EMI", icon: Landmark, note: "No-cost EMI on select cards" },
];

export default function PaymentPage() {
  const router = useRouter();
  const { quote } = useBilling();
  const customerState = useBooking((s) => s.customerState);
  const agentMarkup = useBooking((s) => s.agentMarkup);
  const setAgentMarkup = useBooking((s) => s.setAgentMarkup);
  const tier = useAuth((s) => s.tier);
  const [mounted, setMounted] = useState(false);
  const [method, setMethod] = useState("upi");
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState("");
  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!useBooking.getState().flight) router.replace("/");
  }, [router]);

  if (!mounted) return null;

  const discountable = useBooking.getState().totalAmount(); // fare × pax + add-ons
  const discount = promoDiscount(useBooking.getState().promoCode, discountable);
  const subtotal = discountable + 299 - discount;
  // FLAT service charge is per passenger (all travellers on the booking).
  const trv = useBooking.getState().query?.travellers;
  const paxCount = trv ? trv.adults + trv.children + trv.infants : 1;
  const q = quote(subtotal, customerState, paxCount);
  const grandTotal = subtotal + q.addon + agentMarkup; // agent's own service charge (0 for customers)

  type RzpFields = { razorpayOrderId?: string; razorpayPaymentId?: string; razorpaySignature?: string };

  const finalizeBooking = async (total: number, rzp: RzpFields) => {
    const st = useBooking.getState();
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flight: st.flight, fare: st.fare, query: st.query, passengers: st.passengers,
          extraFlights: st.extraFlights, // return / multi-city legs beyond the first
          seats: st.seats, meals: st.meals, contactEmail: st.contactEmail, contactPhone: st.contactPhone,
          addOns: st.addOns, total, agentMarkup,
          customerState, serviceCharge: q.serviceCharge, gst: q.gst,
          ...(useWallet ? { paymentSource: "wallet" } : {}),
          ...rzp,
        }),
      });
      const data = await res.json();
      // Only a ticketed booking reaches the confirmation page. A booking the
      // airline has not ticketed comes back PENDING with a reference — the
      // customer is told the truth here rather than shown "Booking Confirmed!".
      if (res.ok && data.bookingRef && data.status !== "PENDING") {
        router.push(`/flights/confirmation?ref=${data.bookingRef}&pnr=${data.pnr}`);
      } else {
        setPayError(data.error || "Booking could not be completed. Please try again.");
        setProcessing(false);
      }
    } catch {
      setPayError("Network error. Please check your connection and try again.");
      setProcessing(false);
    }
  };

  const pay = async () => {
    // Safety net: never allow a booking without login (covers deep-links too).
    if (!useAuth.getState().user) {
      useAuth.getState().requireAuth(() => pay());
      return;
    }
    if (!useBooking.getState().customerState) { setPayError("Please select your billing state (for GST) to continue."); return; }
    setPayError("");
    setProcessing(true);
    const st = useBooking.getState();
    const total = grandTotal; // subtotal (incl. convenience) + service charge + GST

    // Pay from wallet — no Razorpay
    if (useWallet) { await finalizeBooking(total, {}); return; }

    // 1. Create a Razorpay order on the server
    let order: { orderId?: string; amount?: number; currency?: string; keyId?: string } | null = null;
    try {
      const r = await fetch("/api/payment/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });
      if (r.ok) order = await r.json();
    } catch { /* network/order failure handled below */ }

    // 2. If Razorpay isn't available (not configured / offline), fall back to a test booking
    if (!order?.orderId || typeof window === "undefined" || !window.Razorpay) {
      await finalizeBooking(total, {});
      return;
    }

    // 3. Open Razorpay Checkout.
    // NOTE: only pass `image` over HTTPS — Razorpay's HTTPS checkout cannot fetch
    // an http://localhost (loopback) logo, which triggers a CORS error in dev.
    const isHttps = window.location.protocol === "https:";
    const rzp = new window.Razorpay({
      key: order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency || "INR",
      order_id: order.orderId,
      name: "Tourist Leader",
      description: st.flight ? `Flight ${st.flight.from} → ${st.flight.to}` : "Flight booking",
      ...(isHttps ? { image: `${window.location.origin}/logo.avif` } : {}),
      prefill: {
        name: st.passengers?.[0]?.fullName || "",
        email: st.contactEmail || "",
        contact: st.contactPhone || "",
        method: "upi", // open on UPI — reliable in test mode (cards reject international)
      },
      notes: { route: st.flight ? `${st.flight.from}-${st.flight.to}` : "" },
      theme: { color: "#0b63d6" },
      handler: (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        finalizeBooking(total, {
          razorpayOrderId: resp.razorpay_order_id,
          razorpayPaymentId: resp.razorpay_payment_id,
          razorpaySignature: resp.razorpay_signature,
        });
      },
      modal: { ondismiss: () => setProcessing(false) },
    });
    rzp.on("payment.failed", (resp: { error?: { description?: string } }) => {
      const desc = resp?.error?.description || "Please try again.";
      const intl = /international/i.test(desc);
      setPayError(
        intl
          ? "International cards aren't supported in test mode. Use UPI ID success@razorpay, or a domestic test card (5267 3181 8797 5449)."
          : `Payment failed: ${desc}`
      );
      setProcessing(false);
    });
    rzp.open();
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Header active="flights" />
      <main className="flex-1 bg-background">
        <div className="border-b border-slate-200 bg-white py-4"><Stepper current={4} /></div>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              {payError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-500" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-rose-700">Payment not completed</p>
                    <p className="mt-0.5 text-sm text-rose-600">{payError}</p>
                  </div>
                  <button onClick={() => setPayError("")} className="text-rose-400 hover:text-rose-600" aria-label="Dismiss"><X size={16} /></button>
                </div>
              )}
              <FlightSummaryCard />

              <WalletPayToggle total={grandTotal} value={useWallet} onChange={setUseWallet} />

              <div className={cn("rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-100", useWallet && "opacity-50")}>
                <p className="px-3 py-2 text-sm font-bold text-slate-900">{useWallet ? "Or choose another method" : "Choose payment method"}</p>
                {METHODS.map((m) => (
                  <button key={m.id} onClick={() => setMethod(m.id)}
                    className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors", method === m.id ? "bg-brand/5 ring-1 ring-brand" : "hover:bg-slate-50")}>
                    <span className={cn("grid h-10 w-10 place-items-center rounded-lg", method === m.id ? "bg-brand text-white" : "bg-slate-100 text-slate-500")}>
                      <m.icon size={20} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-slate-800">{m.label}</span>
                      <span className="block text-xs text-slate-400">{m.note}</span>
                    </span>
                    <span className={cn("h-4 w-4 rounded-full border-2", method === m.id ? "border-brand bg-brand" : "border-slate-300")} />
                  </button>
                ))}
              </div>

              {/* fake method form */}
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                {method === "upi" && <input placeholder="yourname@upi" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand" />}
                {method === "card" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input placeholder="Card number" className="sm:col-span-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand" />
                    <input placeholder="MM / YY" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand" />
                    <input placeholder="CVV" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand" />
                  </div>
                )}
                {method === "netbanking" && <select className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand"><option>HDFC Bank</option><option>ICICI Bank</option><option>SBI</option><option>Axis Bank</option></select>}
                {method === "wallet" && <select className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand"><option>Paytm</option><option>PhonePe</option><option>Amazon Pay</option></select>}
                {method === "emi" && <p className="text-sm text-slate-500">No-cost EMI available on HDFC, ICICI & Axis credit cards for orders above ₹3,000.</p>}
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-emerald-600">
                  <span className="flex items-center gap-1.5"><Lock size={13} /> 100% secure payment</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500">Payments processed securely by <b className="text-[#072654]">Razorpay</b></span>
                </div>
                {process.env.NEXT_PUBLIC_SHOW_TEST_HINTS === "1" && (
                  <div className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-[11px] text-sky-700">
                    <p className="font-bold">Test mode — how to complete payment:</p>
                    <p className="mt-0.5">The checkout opens on <b>UPI</b>. Enter any UPI ID (e.g. <b>success@razorpay</b>) → tap pay → on the test screen choose <b>Success</b>.</p>
                    <p className="mt-0.5 text-sky-600">Avoid <b>Cards</b> — test mode rejects international cards like 4111… (use domestic <b>5267 3181 8797 5449</b> if you must).</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:sticky lg:top-20 lg:self-start">
              {tier === "agent" && (
                <div className="mb-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                  <label className="block text-sm font-bold text-slate-900">Your service charge</label>
                  <p className="mt-0.5 text-xs text-slate-400">Added to the customer&apos;s total &amp; credited to your wallet (settled by admin).</p>
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-brand">
                    <span className="text-slate-400">₹</span>
                    <input type="number" min={0} value={agentMarkup || ""} onChange={(e) => setAgentMarkup(Math.max(0, Math.round(Number(e.target.value) || 0)))} placeholder="0" className="w-full bg-transparent py-2.5 text-sm outline-none" />
                  </div>
                </div>
              )}
              <PriceSummary cta={
                <Button className="w-full" onClick={pay} disabled={processing || !customerState}>
                  {processing ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <><Lock size={15} /> Pay {formatINR(grandTotal)}</>}
                </Button>
              } />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
