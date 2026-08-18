"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Store, Briefcase, Luggage, Heart, Menu, X, Plane, BedDouble } from "lucide-react";
import { AuthButton } from "@/components/auth/AuthButton";
import { CurrencyLanguageMenu } from "@/components/CurrencyLanguageMenu";
import { useT, useSyncHtmlLang } from "@/store/preferences";

export function HomeHeader() {
  const [open, setOpen] = useState(false);
  const t = useT();
  useSyncHtmlLang();
  // Admin can toggle the partner links (List Your Property / TL Biz) on later.
  // Default OFF → show Book Your Flights / Book Your Hotels instead.
  const [cfg, setCfg] = useState({ showListProperty: false, showTlBiz: false });
  useEffect(() => {
    fetch("/api/site-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCfg({ showListProperty: !!d.showListProperty, showTlBiz: !!d.showTlBiz }))
      .catch(() => {});
  }, []);

  const UTILITY = [
    cfg.showListProperty
      ? { icon: Store, title: t("nav_listProperty"), sub: t("nav_listPropertySub"), href: "/list-property" }
      : { icon: Plane, title: t("nav_bookFlights"), sub: t("nav_bookFlightsSub"), href: "/" },
    cfg.showTlBiz
      ? { icon: Briefcase, title: t("nav_tlBiz"), sub: t("nav_tlBizSub"), href: "/tl-biz" }
      : { icon: BedDouble, title: t("nav_bookHotels"), sub: t("nav_bookHotelsSub"), href: "/hotels" },
    { icon: Luggage, title: t("nav_myTrips"), sub: t("nav_myTripsSub"), href: "/account/trips" },
    { icon: Heart, title: t("nav_wishlist"), sub: t("nav_wishlistSub"), href: "/account/wishlist" },
  ];
  // lock scroll while the mobile menu overlay is open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white shadow">
            <Image src="/logo.avif" alt="Tourist Leader" width={40} height={40} priority className="h-9 w-9 rounded-full object-contain" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white drop-shadow">
            Tourist <span className="text-sky-200">Leader</span>
          </span>
        </Link>

        {/* Utility nav (desktop) */}
        <nav className="hidden items-center gap-1 xl:flex">
          {UTILITY.map((u) => (
            <Link key={u.title} href={u.href} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-white/95 hover:bg-white/10">
              <u.icon size={20} strokeWidth={1.6} />
              <span className="leading-tight">
                <span className="block text-xs font-bold">{u.title}</span>
                <span className="block text-[10px] text-white/70">{u.sub}</span>
              </span>
            </Link>
          ))}
        </nav>

        {/* Right: login + currency */}
        <div className="flex items-center gap-2">
          <AuthButton variant="pill" compact />
          <span className="hidden sm:block"><CurrencyLanguageMenu variant="light" /></span>
          <button className="grid h-10 w-10 place-items-center rounded-lg text-white hover:bg-white/10 xl:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile utility menu — portaled full-screen overlay so it never clashes with the search widget */}
      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] xl:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute right-3 top-3 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl bg-white p-2 shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm font-extrabold text-slate-900">Menu</span>
              <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            {UTILITY.map((u) => (
              <Link key={u.title} href={u.href} onClick={() => setOpen(false)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50">
                <u.icon size={20} className="text-brand" strokeWidth={1.6} />
                <span><span className="block text-sm font-bold text-slate-800">{u.title}</span><span className="block text-xs text-slate-500">{u.sub}</span></span>
              </Link>
            ))}
            <div className="my-1 border-t border-slate-100" />
            <div className="px-1 py-1"><CurrencyLanguageMenu variant="dark" /></div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
