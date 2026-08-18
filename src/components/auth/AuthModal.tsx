"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Loader2, Mail, AlertCircle, X, ArrowLeft, ShieldCheck, BadgePercent, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LEN = 6;

export function AuthModal({ open, onClose, reason }: { open: boolean; onClose: () => void; reason?: string }) {
  const router = useRouter();
  const { sendOtp, verifyOtp, loading } = useAuth();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(""));
  const [otpToken, setOtpToken] = useState("");
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [emailed, setEmailed] = useState(true);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => { setStep("email"); setEmail(""); setOtp(Array(OTP_LEN).fill("")); setError(""); setDevOtp(undefined); }, 200);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) { document.addEventListener("keydown", onKey); document.body.style.overflow = "hidden"; }
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  if (!open || typeof document === "undefined") return null;

  const requestOtp = async () => {
    setError("");
    if (!emailRe.test(email.trim())) { setError("Enter a valid email address"); return; }
    const res = await sendOtp(email.trim());
    if (res.ok) {
      setOtpToken(res.otpToken || "");
      setDevOtp(res.devOtp);
      setEmailed(res.emailed !== false);
      setStep("otp");
      setOtp(Array(OTP_LEN).fill(""));
      setResendIn(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } else setError(res.error || "Could not send code");
  };

  const onOtpChange = (i: number, val: string) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) { setOtp((o) => o.map((c, idx) => (idx === i ? "" : c))); return; }
    if (digits.length > 1) {
      // paste
      const next = [...otp];
      digits.split("").slice(0, OTP_LEN - i).forEach((d, k) => (next[i + k] = d));
      setOtp(next);
      otpRefs.current[Math.min(i + digits.length, OTP_LEN - 1)]?.focus();
      return;
    }
    setOtp((o) => o.map((c, idx) => (idx === i ? digits : c)));
    if (i < OTP_LEN - 1) otpRefs.current[i + 1]?.focus();
  };
  const onOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const submitOtp = async () => {
    setError("");
    const code = otp.join("");
    if (code.length !== OTP_LEN) { setError("Enter the 6-digit code"); return; }
    const res = await verifyOtp({ email: email.trim(), otp: code, otpToken, context: "customer" });
    if (res.ok) {
      onClose();
      // agents work in their own console
      const next = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
      if (res.tier === "agent") router.push(next && next.startsWith("/agent") ? next : "/agent");
    } else setError(res.error || "Invalid code");
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-4xl overflow-hidden bg-white shadow-2xl animate-fade-up sm:h-auto sm:rounded-3xl">
        <button onClick={onClose} className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-500 shadow hover:bg-white hover:text-slate-800" aria-label="Close">
          <X size={18} />
        </button>

        {/* Left promo panel (desktop) */}
        <div className="relative hidden w-[44%] shrink-0 md:block">
          <Image src="/auth-promo.jpg" alt="" fill sizes="44vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/85 via-brand/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-7 text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur"><BadgePercent size={13} /> ALL MOODS OF TRAVEL SALE</span>
            <p className="mt-3 text-3xl font-extrabold leading-tight">Up to 40% OFF*</p>
            <p className="mt-1 text-sm text-white/90">on Flights, Stays, Packages, Buses, Trains, Cabs &amp; More.</p>
            <p className="mt-3 text-[11px] text-white/70">*T&amp;C Apply</p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 md:w-[56%]">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-6 flex items-center gap-2.5">
              <Image src="/logo.avif" alt="Tourist Leader" width={40} height={40} className="h-10 w-10 rounded-full object-contain" />
              <div>
                <p className="text-lg font-extrabold leading-tight text-slate-900">Tourist <span className="text-brand">Leader</span></p>
                <p className="text-xs text-slate-400">Login or create your account</p>
              </div>
            </div>

            {step === "email" ? (
              <>
                <h2 className="text-xl font-bold text-slate-900">Login / Signup</h2>
                {reason ? (
                  <p className="mt-1 rounded-lg bg-brand/5 px-3 py-2 text-sm font-medium text-brand">{reason}</p>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">We&apos;ll email you a one-time code — no password needed.</p>
                )}

                <label className="mt-5 block text-sm font-semibold text-slate-700">Email address</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
                  <Mail size={16} className="text-slate-400" />
                  <input
                    type="email" autoFocus value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && requestOtp()}
                    placeholder="you@email.com"
                    className="w-full bg-transparent py-3 text-sm outline-none"
                  />
                </div>

                {error && <Err msg={error} />}

                <Button className="mt-4 w-full" onClick={requestOtp} disabled={loading}>
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Sending code…</> : "Continue"}
                </Button>

                <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck size={13} className="text-emerald-500" /> Secured with one-time email verification
                </p>
                <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-400">
                  By proceeding, you agree to Tourist Leader&apos;s <span className="text-brand">Privacy Policy</span>, <span className="text-brand">User Agreement</span> and <span className="text-brand">T&amp;Cs</span>.
                </p>
              </>
            ) : (
              <>
                <button onClick={() => { setStep("email"); setError(""); }} className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand">
                  <ArrowLeft size={15} /> Back
                </button>
                <h2 className="text-xl font-bold text-slate-900">Verify your email</h2>
                <p className="mt-1 text-sm text-slate-500">Enter the 6-digit code sent to <b className="text-slate-700">{email}</b></p>

                <div className="mt-5 flex justify-between gap-2">
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      value={d}
                      onChange={(e) => onOtpChange(i, e.target.value)}
                      onKeyDown={(e) => onOtpKey(i, e)}
                      inputMode="numeric"
                      maxLength={OTP_LEN}
                      className="h-13 w-12 rounded-xl border border-slate-300 text-center text-xl font-bold text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                    />
                  ))}
                </div>

                {!emailed && devOtp && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Email delivery is not configured — for testing, your code is <b>{devOtp}</b>.
                  </p>
                )}

                {error && <Err msg={error} />}

                <Button className="mt-4 w-full" onClick={submitOtp} disabled={loading}>
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : "Verify & Continue"}
                </Button>

                <div className="mt-4 text-center text-sm text-slate-500">
                  {resendIn > 0 ? (
                    <span>Resend code in {resendIn}s</span>
                  ) : (
                    <button onClick={requestOtp} className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
                      <RotateCcw size={13} /> Resend code
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
      <AlertCircle size={14} /> {msg}
    </p>
  );
}
