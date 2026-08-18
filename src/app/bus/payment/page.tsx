"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Lock, Loader2, AlertCircle, X } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { BusPriceSummary } from "@/components/bus/BusPriceSummary";
import { useBusBooking } from "@/store/bus-booking";
import { useAuth } from "@/store/auth";
import { useBilling } from "@/lib/useBilling";
import { WalletPayToggle } from "@/components/billing/WalletPayToggle";
import { formatINR, formatTime } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { Razorpay?: any } }

export default function BusPaymentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { config, quote } = useBilling();
  const [mounted, setMounted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState("");
  const [billState, setBillState] = useState("");
  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => { setMounted(true); if (!useBusBooking.getState().bus) router.replace("/bus"); }, [router]);
  useEffect(() => { if (user?.state && !billState) setBillState(user.state); }, [user, billState]);
  if (!mounted) return null;
  const st0 = useBusBooking.getState();
  if (!st0.bus) return null;

  const subtotal = st0.total();
  // FLAT service charge is per passenger (one per booked seat).
  const q = quote(subtotal, billState, st0.seats.length || 1);
  const grandTotal = subtotal + q.addon;

  const finalize = async (total: number, rzp: { razorpayOrderId?: string; razorpayPaymentId?: string; razorpaySignature?: string }) => {
    const st = useBusBooking.getState();
    try {
      const res = await fetch("/api/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "BUS", bus: st.bus, query: st.query, seats: st.seats, boarding: st.boarding, dropping: st.dropping, passengers: st.passengers, contactEmail: st.contactEmail, contactPhone: st.contactPhone, total, customerState: billState, serviceCharge: q.serviceCharge, gst: q.gst, ...(useWallet ? { paymentSource: "wallet" } : {}), ...rzp }),
      });
      const data = await res.json();
      if (data.bookingRef) router.push(`/bus/confirmation?ref=${data.bookingRef}&tkt=${data.pnr}`);
      else { setPayError(data.error || "Booking failed."); setProcessing(false); }
    } catch { setPayError("Network error."); setProcessing(false); }
  };

  const pay = async () => {
    if (!useAuth.getState().user) { useAuth.getState().requireAuth(() => pay()); return; }
    if (!billState) { setPayError("Please select your billing state (for GST) to continue."); return; }
    setPayError(""); setProcessing(true);
    const st = useBusBooking.getState();
    const total = grandTotal;
    if (useWallet) { await finalize(total, {}); return; }
    let order: { orderId?: string; amount?: number; currency?: string; keyId?: string } | null = null;
    try { const r = await fetch("/api/payment/razorpay/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: total }) }); if (r.ok) order = await r.json(); } catch {}
    if (!order?.orderId || typeof window === "undefined" || !window.Razorpay) { await finalize(total, {}); return; }
    const isHttps = window.location.protocol === "https:";
    const rzp = new window.Razorpay({
      key: order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, amount: order.amount, currency: order.currency || "INR", order_id: order.orderId,
      name: "Tourist Leader", description: st.bus ? `Bus ${st.query?.from} → ${st.query?.to}` : "Bus ticket",
      ...(isHttps ? { image: `${window.location.origin}/logo.avif` } : {}),
      prefill: { name: st.passengers?.[0]?.fullName || "", email: st.contactEmail || "", contact: st.contactPhone || "", method: "upi" },
      theme: { color: "#0b63d6" },
      handler: (resp: any) => finalize(total, { razorpayOrderId: resp.razorpay_order_id, razorpayPaymentId: resp.razorpay_payment_id, razorpaySignature: resp.razorpay_signature }),
      modal: { ondismiss: () => setProcessing(false) },
    });
    rzp.on("payment.failed", (resp: any) => { const d = resp?.error?.description || "Please try again."; setPayError(/international/i.test(d) ? "Use UPI success@razorpay or a domestic test card (5267 3181 8797 5449)." : `Payment failed: ${d}`); setProcessing(false); });
    rzp.open();
  };

  const bus = st0.bus;
  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Header active="bus" />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              {payError && <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"><AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-500" /><div className="flex-1"><p className="text-sm font-semibold text-rose-700">Payment not completed</p><p className="mt-0.5 text-sm text-rose-600">{payError}</p></div><button onClick={() => setPayError("")} className="text-rose-400 hover:text-rose-600"><X size={16} /></button></div>}
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <p className="font-bold text-slate-900">{bus.operator} <span className="text-xs font-normal text-slate-400">· {bus.busType}</span></p>
                <p className="text-sm text-slate-500">{st0.query?.from} → {st0.query?.to} · {formatTime(bus.departTime)} → {formatTime(bus.arriveTime)}</p>
                <p className="mt-1 text-xs text-slate-400">Boarding: {st0.boarding?.name} · Dropping: {st0.dropping?.name} · Seats: {st0.seats.map((s) => s.id).join(", ")}</p>
              </div>
              <WalletPayToggle total={grandTotal} value={useWallet} onChange={setUseWallet} />
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-emerald-600"><Lock size={13} /> 100% secure · Payments by <b className="text-[#072654]">Razorpay</b></div>
                {process.env.NEXT_PUBLIC_SHOW_TEST_HINTS === "1" && <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-[11px] text-sky-700"><b>Test mode:</b> pay via UPI <b>success@razorpay</b>, then choose Success on the test screen.</p>}
              </div>
            </div>
            <div className="lg:sticky lg:top-20 lg:self-start">
              <BusPriceSummary q={q} config={config} state={billState} onState={setBillState} cta={<Button className="w-full" onClick={pay} disabled={processing || !billState}>{processing ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <><Lock size={15} /> Pay {formatINR(grandTotal)}</>}</Button>} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
