"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Smartphone, CreditCard, Building2, Wallet, Lock, Loader2, AlertCircle, X } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { HotelSummaryCard, HotelPriceSummary } from "@/components/hotels/HotelBookingSummary";
import { useHotelBooking } from "@/store/hotel-booking";
import { useAuth } from "@/store/auth";
import { useBilling } from "@/lib/useBilling";
import { WalletPayToggle } from "@/components/billing/WalletPayToggle";
import { cn, formatINR } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { Razorpay?: any } }

const METHODS = [
  { id: "upi", label: "UPI", icon: Smartphone, note: "Pay via any UPI app" },
  { id: "card", label: "Credit / Debit Card", icon: CreditCard, note: "Visa, Mastercard, RuPay" },
  { id: "netbanking", label: "Net Banking", icon: Building2, note: "All major banks" },
  { id: "wallet", label: "Wallets", icon: Wallet, note: "Paytm, PhonePe, Amazon Pay" },
];

export default function HotelPaymentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { config, quote } = useBilling();
  const [mounted, setMounted] = useState(false);
  const [method, setMethod] = useState("upi");
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState("");
  const [billState, setBillState] = useState("");
  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => {
    setMounted(true);
    const st = useHotelBooking.getState();
    if (!st.hotel || !st.guest) router.replace("/hotels");
  }, [router]);
  useEffect(() => { if (user?.state && !billState) setBillState(user.state); }, [user, billState]);

  if (!mounted) return null;

  const subtotal = useHotelBooking.getState().total();
  // FLAT service charge is per guest.
  const hq = useHotelBooking.getState().query;
  const guestCount = hq ? (hq.adults || 1) + (hq.children || 0) : 1;
  const q = quote(subtotal, billState, guestCount);
  const grandTotal = subtotal + q.addon;

  const finalize = async (total: number, rzp: { razorpayOrderId?: string; razorpayPaymentId?: string; razorpaySignature?: string }) => {
    const st = useHotelBooking.getState();
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "HOTEL",
          hotel: { name: st.hotel!.name, area: st.hotel!.area, city: st.hotel!.city, image: st.hotel!.image, starRating: st.hotel!.starRating },
          roomName: st.roomName, roomPrice: st.roomPrice, nights: st.nights,
          query: st.query, guest: st.guest, total,
          customerState: billState, serviceCharge: q.serviceCharge, gst: q.gst,
          ...(useWallet ? { paymentSource: "wallet" } : {}),
          ...rzp,
        }),
      });
      const data = await res.json();
      if (data.bookingRef) router.push(`/hotels/confirmation?ref=${data.bookingRef}&cnf=${data.pnr}`);
      else { setPayError(data.error || "Booking could not be completed."); setProcessing(false); }
    } catch { setPayError("Network error. Please try again."); setProcessing(false); }
  };

  const pay = async () => {
    if (!useAuth.getState().user) { useAuth.getState().requireAuth(() => pay()); return; }
    setPayError("");
    if (!billState) { setPayError("Please select your billing state (for GST) to continue."); return; }
    setProcessing(true);
    const st = useHotelBooking.getState();
    const total = grandTotal;
    if (useWallet) { await finalize(total, {}); return; }

    let order: { orderId?: string; amount?: number; currency?: string; keyId?: string } | null = null;
    try {
      const r = await fetch("/api/payment/razorpay/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: total }) });
      if (r.ok) order = await r.json();
    } catch { /* handled below */ }

    if (!order?.orderId || typeof window === "undefined" || !window.Razorpay) { await finalize(total, {}); return; }

    const isHttps = window.location.protocol === "https:";
    const rzp = new window.Razorpay({
      key: order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.amount, currency: order.currency || "INR", order_id: order.orderId,
      name: "Tourist Leader", description: st.hotel ? `${st.hotel.name}, ${st.hotel.city}` : "Hotel booking",
      ...(isHttps ? { image: `${window.location.origin}/logo.avif` } : {}),
      prefill: { name: st.guest?.fullName || "", email: st.guest?.email || "", contact: st.guest?.phone || "", method: "upi" },
      theme: { color: "#0b63d6" },
      handler: (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
        finalize(total, { razorpayOrderId: resp.razorpay_order_id, razorpayPaymentId: resp.razorpay_payment_id, razorpaySignature: resp.razorpay_signature }),
      modal: { ondismiss: () => setProcessing(false) },
    });
    rzp.on("payment.failed", (resp: { error?: { description?: string } }) => {
      const desc = resp?.error?.description || "Please try again.";
      setPayError(/international/i.test(desc) ? "International cards aren't supported in test mode. Use UPI success@razorpay." : `Payment failed: ${desc}`);
      setProcessing(false);
    });
    rzp.open();
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Header active="hotels" />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="mb-4 text-xl font-extrabold text-slate-900">Payment</h1>
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              {payError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-500" />
                  <div className="flex-1"><p className="text-sm font-semibold text-rose-700">Payment not completed</p><p className="mt-0.5 text-sm text-rose-600">{payError}</p></div>
                  <button onClick={() => setPayError("")} className="text-rose-400 hover:text-rose-600"><X size={16} /></button>
                </div>
              )}
              <WalletPayToggle total={grandTotal} value={useWallet} onChange={setUseWallet} />
              <div className={cn("rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-100", useWallet && "opacity-50")}>
                <p className="px-3 py-2 text-sm font-bold text-slate-900">{useWallet ? "Or choose another method" : "Choose payment method"}</p>
                {METHODS.map((m) => (
                  <button key={m.id} onClick={() => setMethod(m.id)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors", method === m.id ? "bg-brand/5 ring-1 ring-brand" : "hover:bg-slate-50")}>
                    <span className={cn("grid h-10 w-10 place-items-center rounded-lg", method === m.id ? "bg-brand text-white" : "bg-slate-100 text-slate-500")}><m.icon size={20} /></span>
                    <span className="flex-1"><span className="block text-sm font-semibold text-slate-800">{m.label}</span><span className="block text-xs text-slate-400">{m.note}</span></span>
                    <span className={cn("h-4 w-4 rounded-full border-2", method === m.id ? "border-brand bg-brand" : "border-slate-300")} />
                  </button>
                ))}
                {process.env.NEXT_PUBLIC_SHOW_TEST_HINTS === "1" && (
                  <div className="px-3 py-2">
                    <div className="rounded-lg bg-sky-50 px-3 py-2 text-[11px] text-sky-700"><b>Test mode:</b> the checkout opens on UPI — enter <b>success@razorpay</b> → choose Success. Secured by <b className="text-[#072654]">Razorpay</b>.</div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <HotelSummaryCard />
              <HotelPriceSummary q={q} config={config} state={billState} onState={setBillState} cta={
                <Button className="w-full" onClick={pay} disabled={processing || !billState}>
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
