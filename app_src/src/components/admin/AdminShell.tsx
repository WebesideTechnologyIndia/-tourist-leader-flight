"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { LayoutDashboard, Palmtree, Loader2, ShieldAlert, ExternalLink, LogOut, Mail, ArrowLeft, ShieldCheck, AlertCircle, Ticket, LifeBuoy, Users, UsersRound, UserCheck, ReceiptText, Menu, SlidersHorizontal, Wallet, Headset, FileText, FilePlus2, Banknote, Store, Umbrella } from "lucide-react";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";
import { type Permission } from "@/lib/rbac";
import { AdminSearch } from "./AdminSearch";
import { AdminProfileMenu } from "./AdminProfileMenu";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const NAV: { seg: string; label: string; agentLabel?: string; icon: React.ElementType; perm: Permission }[] = [
  { seg: "", label: "Dashboard", agentLabel: "My Workspace", icon: LayoutDashboard, perm: "dashboard.view" },
  { seg: "bookings", label: "Bookings", icon: ReceiptText, perm: "bookings.view" },
  { seg: "invoices", label: "Manual Invoices", agentLabel: "Invoices", icon: FilePlus2, perm: "bookings.view" },
  { seg: "packages", label: "Holiday Packages", icon: Palmtree, perm: "packages.view" },
  { seg: "enquiries", label: "Package Enquiries", agentLabel: "Leads", icon: Ticket, perm: "enquiries.view" },
  { seg: "group-enquiries", label: "Group Bookings", agentLabel: "Group Queries", icon: UsersRound, perm: "enquiries.view" },
  { seg: "visa-enquiries", label: "Visa Enquiries", icon: FileText, perm: "enquiries.view" },
  { seg: "forex-enquiries", label: "Forex Enquiries", icon: Banknote, perm: "enquiries.view" },
  { seg: "partner-enquiries", label: "Partner Enquiries", icon: Store, perm: "enquiries.view" },
  { seg: "insurance-enquiries", label: "Insurance Enquiries", icon: Umbrella, perm: "enquiries.view" },
  { seg: "tickets", label: "Support Tickets", icon: LifeBuoy, perm: "tickets.view" },
  { seg: "users", label: "Users", icon: Users, perm: "users.view" },
  { seg: "agent-applications", label: "Agent Applications", icon: UserCheck, perm: "users.view" },
  { seg: "settlements", label: "Settlements", icon: Wallet, perm: "settlements.manage" },
  { seg: "roles", label: "Roles & Permissions", icon: ShieldCheck, perm: "roles.manage" },
  { seg: "settings", label: "Settings", icon: SlidersHorizontal, perm: "settings.manage" },
];

interface AdminCtxValue { role: string; permissions: Permission[]; can: (p: Permission) => boolean; email: string; basePath: string; tier: string }
const AdminCtx = createContext<AdminCtxValue>({ role: "USER", permissions: [], can: () => false, email: "", basePath: "/admin", tier: "none" });
export const useAdminCtx = () => useContext(AdminCtx);

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LEN = 6;
type State = "loading" | "needLogin" | "denied" | "ok";

export function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const mode: "admin" | "agent" = pathname.startsWith("/agent") ? "agent" : "admin";
  const basePath = mode === "agent" ? "/agent" : "/admin";

  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("USER");
  const [roleName, setRoleName] = useState<string>("User");
  const [tier, setTier] = useState<string>("none");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [collapsed, setCollapsed] = useState(false); // desktop icons-only
  const [mobileOpen, setMobileOpen] = useState(false); // mobile drawer

  // hamburger: collapse on desktop, open drawer on mobile
  const toggleMenu = () => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width:1024px)").matches) setCollapsed((c) => !c);
    else setMobileOpen((o) => !o);
  };

  // close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const check = () =>
    fetch("/api/admin/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setEmail(d.user?.email || ""); setRole(d.role || "USER"); setRoleName(d.roleName || "User"); setPermissions(d.permissions || []); setTier(d.tier || "none");
        const t = d.tier || "none";
        if (!d.user) {
          // not logged in: admin login screen on /admin; agents log in at the home page
          if (mode === "agent") { router.replace("/?next=/agent"); setState("loading"); }
          else setState("needLogin");
        } else if (t === "none") {
          setState("denied"); // logged-in customer hit a back-office URL
        } else if (mode === "admin" && t === "agent") {
          router.replace("/agent"); setState("loading"); // agents don't use /admin
        } else if (mode === "agent" && t === "admin") {
          router.replace("/admin"); setState("loading"); // admins use /admin
        } else {
          setState("ok");
        }
      })
      .catch(() => setState(mode === "agent" ? "denied" : "needLogin"));

  useEffect(() => { check(); }, []);

  if (state === "loading") return <div className="flex min-h-screen items-center justify-center text-slate-400"><Loader2 className="animate-spin" /></div>;

  if (state === "needLogin") return <AdminLogin onAuthed={check} />;

  if (state === "denied") return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-rose-50 text-rose-500"><ShieldAlert size={30} /></span>
      <h1 className="mt-4 text-2xl font-extrabold text-slate-900">{mode === "agent" ? "Agent access only" : "Admin access only"}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">You&apos;re signed in as <b>{email}</b>, but this account doesn&apos;t have {mode === "agent" ? "agent" : "admin"} access.</p>
      <div className="mt-5 flex gap-2">
        <button onClick={async () => { await logout(); mode === "agent" ? router.replace("/") : setState("needLogin"); }} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-brand">Switch account</button>
        <Link href="/" className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white">Back to site</Link>
      </div>
    </div>
  );

  const can = (p: Permission) => permissions.includes(p);
  const hrefFor = (seg: string) => seg ? `${basePath}/${seg}` : basePath;
  const visibleNav = NAV.filter((n) => can(n.perm));
  // agents get a Wallet entry in their console
  if (mode === "agent") visibleNav.push({ seg: "wallet", label: "My Wallet", icon: Wallet, perm: "dashboard.view" });
  const navItem = (n: typeof NAV[number]) => {
    const href = hrefFor(n.seg);
    const active = pathname === href || (n.seg !== "" && pathname.startsWith(href));
    const label = mode === "agent" && n.agentLabel ? n.agentLabel : n.label;
    return (
      <Link key={href} href={href} title={collapsed ? label : undefined}
        className={cn("flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium transition-colors", collapsed ? "lg:justify-center lg:px-0 px-3" : "px-3",
          active ? "bg-brand/10 text-brand" : "text-slate-600 hover:bg-slate-50")}>
        <n.icon size={18} className="shrink-0" /> <span className={cn(collapsed && "lg:hidden")}>{label}</span>
      </Link>
    );
  };

  // ---- Agent console: frontend-style chrome (customer Header + tabs + Footer) ----
  if (mode === "agent") {
    return (
      <AdminCtx.Provider value={{ role, permissions, can, email, basePath, tier }}>
        <Header active="flights" />
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 no-scrollbar">
            <span className="mr-2 flex shrink-0 items-center gap-1.5 py-3.5 text-sm font-extrabold text-slate-900"><Headset size={16} className="text-brand" /> Agent</span>
            {visibleNav.map((n) => {
              const href = hrefFor(n.seg);
              const active = pathname === href || (n.seg !== "" && pathname.startsWith(href));
              const label = n.agentLabel || n.label;
              return (
                <Link key={href} href={href} className={cn("flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3.5 text-sm font-semibold transition-colors", active ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-800")}>
                  <n.icon size={15} /> {label}
                </Link>
              );
            })}
          </div>
        </div>
        <main className="flex-1 bg-background">
          <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
        </main>
        <Footer />
      </AdminCtx.Provider>
    );
  }

  return (
    <AdminCtx.Provider value={{ role, permissions, can, email, basePath, tier }}>
    <div className="flex min-h-screen bg-slate-100">
      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:static lg:translate-x-0",
        mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        collapsed ? "lg:w-16" : "lg:w-60"
      )}>
        <Link href="/" className={cn("flex items-center gap-2 border-b border-slate-100 py-4", collapsed ? "lg:justify-center lg:px-0 px-5" : "px-5")}>
          <Image src="/logo.avif" alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full" />
          <span className={cn("text-base font-extrabold", collapsed && "lg:hidden")}>Tourist <span className="text-brand">Leader</span></span>
        </Link>
        <p className={cn("px-5 pt-4 text-[11px] font-bold uppercase tracking-wide text-slate-400", collapsed && "lg:hidden")}>{roleName}</p>
        {collapsed && <div className="hidden lg:block lg:pt-4" />}
        <nav className={cn("mt-2 space-y-1", collapsed ? "lg:px-2 px-3" : "px-3")}>
          {visibleNav.map(navItem)}
        </nav>
        <div className={cn("mt-auto space-y-1 border-t border-slate-100 p-3", collapsed && "lg:px-2")}>
          <Link href="/" title="View site" className={cn("flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50", collapsed ? "lg:justify-center lg:px-0 px-3" : "px-3")}><ExternalLink size={16} className="shrink-0" /> <span className={cn(collapsed && "lg:hidden")}>View site</span></Link>
          <button onClick={async () => { await logout(); router.push("/"); }} title="Logout" className={cn("flex w-full items-center gap-2.5 rounded-lg py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50", collapsed ? "lg:justify-center lg:px-0 px-3" : "px-3")}><LogOut size={16} className="shrink-0" /> <span className={cn(collapsed && "lg:hidden")}>Logout</span></button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-5">
          <button onClick={toggleMenu} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Toggle menu"><Menu size={20} /></button>
          <h1 className="hidden text-lg font-extrabold text-slate-900 md:block">{title}</h1>
          {/* Center: global search */}
          <div className="flex flex-1 justify-center px-2"><AdminSearch /></div>
          {/* Right: profile */}
          <AdminProfileMenu role={role} roleName={roleName} email={email} />
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
    </AdminCtx.Provider>
  );
}

function AdminLogin({ onAuthed }: { onAuthed: () => void }) {
  const { sendOtp, verifyOtp, loading } = useAuth();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(""));
  const [otpToken, setOtpToken] = useState("");
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [emailed, setEmailed] = useState(true);
  const [error, setError] = useState("");
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const request = async () => {
    setError("");
    if (!emailRe.test(email.trim())) { setError("Enter a valid email"); return; }
    const r = await sendOtp(email.trim());
    if (r.ok) { setOtpToken(r.otpToken || ""); setDevOtp(r.devOtp); setEmailed(r.emailed !== false); setStep("otp"); setTimeout(() => refs.current[0]?.focus(), 50); }
    else setError(r.error || "Could not send code");
  };
  const onChange = (i: number, v: string) => {
    const d = v.replace(/\D/g, "");
    if (!d) { setOtp((o) => o.map((c, idx) => idx === i ? "" : c)); return; }
    if (d.length > 1) { const next = [...otp]; d.split("").slice(0, OTP_LEN - i).forEach((x, k) => next[i + k] = x); setOtp(next); refs.current[Math.min(i + d.length, OTP_LEN - 1)]?.focus(); return; }
    setOtp((o) => o.map((c, idx) => idx === i ? d : c)); if (i < OTP_LEN - 1) refs.current[i + 1]?.focus();
  };
  const verify = async () => {
    setError("");
    const code = otp.join("");
    if (code.length !== OTP_LEN) { setError("Enter the 6-digit code"); return; }
    const r = await verifyOtp({ email: email.trim(), otp: code, otpToken, context: "admin" });
    if (r.ok) onAuthed();
    else setError(r.error || "Invalid code");
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left promo panel */}
      <div className="relative hidden w-1/2 lg:block xl:w-[55%]">
        <Image src="/packages/maldives.jpg" alt="" fill priority sizes="55vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-dark/92 via-brand/55 to-slate-900/70" />
        <div className="absolute inset-0 flex flex-col justify-between p-10 text-white xl:p-14">
          <div className="flex items-center gap-2.5">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white"><Image src="/logo.avif" alt="" width={36} height={36} className="h-9 w-9 rounded-full object-contain" /></span>
            <span className="text-lg font-extrabold">Tourist <span className="text-sky-200">Leader</span></span>
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur"><ShieldCheck size={13} /> SUPER ADMIN</span>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight xl:text-4xl">Manage your travel platform</h2>
            <p className="mt-2 max-w-md text-sm text-white/85">Create &amp; publish holiday packages, manage bookings and keep everything in sync — all from one secure dashboard.</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[[Palmtree, "Create & edit holiday packages"], [LayoutDashboard, "Live updates across the site"], [ShieldCheck, "OTP-secured admin access"]].map(([I, t], i) => (
                <li key={i} className="flex items-center gap-2.5 text-white/90"><span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15">{(() => { const Ic = I as React.ElementType; return <Ic size={15} />; })()}</span> {t as string}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/60">© {new Date().getFullYear()} Tourist Leader.com · Comfort before, during, and after take off</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <Image src="/logo.avif" alt="" width={40} height={40} className="h-10 w-10 rounded-full lg:hidden" />
          <div><p className="text-lg font-extrabold lg:text-xl">Tourist <span className="text-brand">Leader</span></p><p className="text-xs text-slate-400">Super Admin Login</p></div>
        </div>
        {step === "email" ? (
          <>
            <h2 className="mt-5 text-lg font-bold text-slate-900">Admin sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Only authorised admin emails can access this panel. We&apos;ll email you a one-time code.</p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-brand">
              <Mail size={16} className="text-slate-400" />
              <input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && request()} placeholder="admin@email.com" className="w-full bg-transparent py-3 text-sm outline-none" />
            </div>
            {error && <Err msg={error} />}
            <button onClick={request} disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : "Continue"}</button>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400"><ShieldCheck size={13} className="text-emerald-500" /> Secured with one-time email verification</p>
          </>
        ) : (
          <>
            <button onClick={() => { setStep("email"); setError(""); }} className="mt-4 flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand"><ArrowLeft size={15} /> Back</button>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Enter code</h2>
            <p className="mt-1 text-sm text-slate-500">6-digit code sent to <b className="text-slate-700">{email}</b></p>
            <div className="mt-4 flex justify-between gap-2">
              {otp.map((d, i) => <input key={i} ref={(el) => { refs.current[i] = el; }} value={d} onChange={(e) => onChange(i, e.target.value)} onKeyDown={(e) => { if (e.key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus(); }} inputMode="numeric" maxLength={OTP_LEN} className="h-13 w-12 rounded-xl border border-slate-300 text-center text-xl font-bold outline-none focus:border-brand" />)}
            </div>
            {!emailed && devOtp && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Email delivery not configured — your code is <b>{devOtp}</b>.</p>}
            {error && <Err msg={error} />}
            <button onClick={verify} disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : "Verify & Sign in"}</button>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600"><AlertCircle size={14} /> {msg}</p>;
}
