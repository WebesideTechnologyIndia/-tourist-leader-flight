"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Wallet, Plus, Loader2, X } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { WalletView } from "@/components/wallet/WalletView";
import { useAuth } from "@/store/auth";
import { formatINR } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { Razorpay?: any } }
const PRESETS = [500, 1000, 2000, 5000];

export default function CustomerWalletPage() {
  const router = useRouter();
  const { user, fetched, fetchMe } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState("1000");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { if (!fetched) fetchMe(); }, [fetched, fetchMe]);

  const addMoney = async () => {
    const amt = Math.round(Number(amount) || 0);
    if (amt < 100) { setErr("Minimum ₹100"); return; }
    setErr(""); setBusy(true);
    let order: { orderId?: string; amount?: number; currency?: string; keyId?: string } | null = null;
    try { const r = await fetch("/api/payment/razorpay/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: amt }) }); if (r.ok) order = await r.json(); } catch {}

    const credit = async (rzp: Record<string, string>) => {
      const res = await fetch("/api/wallet/topup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: amt, ...rzp }) });
      setBusy(false);
      if (res.ok) { setShowAdd(false); setRefreshKey((k) => k + 1); } else { const d = await res.json(); setErr(d.error || "Top-up failed"); }
    };

    if (!order?.orderId || typeof window === "undefined" || !window.Razorpay) { await credit({}); return; }
    const isHttps = window.location.protocol === "https:";
    const rzp = new window.Razorpay({
      key: order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, amount: order.amount, currency: order.currency || "INR", order_id: order.orderId,
      name: "Tourist Leader Wallet", description: `Add ${formatINR(amt)} to wallet`,
      ...(isHttps ? { image: `${window.location.origin}/logo.avif` } : {}),
      prefill: { name: user?.name || "", email: user?.email || "", contact: user?.phone || "", method: "upi" },
      theme: { color: "#0b63d6" },
      handler: (resp: any) => credit({ razorpayOrderId: resp.razorpay_order_id, razorpayPaymentId: resp.razorpay_payment_id, razorpaySignature: resp.razorpay_signature }),
      modal: { ondismiss: () => setBusy(false) },
    });
    rzp.on("payment.failed", () => { setErr("Payment failed. Try UPI success@razorpay."); setBusy(false); });
    rzp.open();
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Header active="flights" />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900"><Wallet size={24} className="text-brand" /> My Wallet</h1>
            {user && <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add money</Button>}
          </div>
          {!fetched ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div> :
            !user ? (
              <div className="rounded-2xl bg-white p-10 text-center shadow-sm"><p className="text-lg font-bold text-slate-800">Please log in</p><Button className="mt-4" onClick={() => router.push("/")}>Go to Home</Button></div>
            ) : (
              <WalletView key={refreshKey} pendingLabel="On hold" wide />
            )}
        </div>
      </main>
      <Footer />

      {showAdd && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => !busy && setShowAdd(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-extrabold text-slate-900">Add money</h2><button onClick={() => setShowAdd(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100"><X size={18} /></button></div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3"><span className="text-lg font-bold text-slate-400">₹</span><input type="number" min={100} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-transparent py-3 text-lg font-bold outline-none" /></div>
            <div className="mt-3 flex flex-wrap gap-2">{PRESETS.map((p) => <button key={p} onClick={() => setAmount(String(p))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:border-brand hover:text-brand">+{formatINR(p)}</button>)}</div>
            {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{err}</p>}
            <Button className="mt-4 w-full" onClick={addMoney} disabled={busy}>{busy ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <>Add {formatINR(Math.round(Number(amount) || 0))}</>}</Button>
            <p className="mt-2 text-center text-[11px] text-slate-400">Secured by Razorpay · test mode: pay via UPI success@razorpay</p>
          </div>
        </div>
      )}
    </>
  );
}
