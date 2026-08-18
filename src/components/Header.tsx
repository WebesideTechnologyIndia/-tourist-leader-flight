"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Plane, BedDouble, Palmtree, Bus, Stamp, Gift, HelpCircle, Menu, X } from "lucide-react";
import { BRAND, NAV_TABS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AuthButton } from "@/components/auth/AuthButton";
import { CurrencyLanguageMenu } from "@/components/CurrencyLanguageMenu";
import { useT } from "@/store/preferences";

const ICONS: Record<string, React.ElementType> = { Plane, BedDouble, Palmtree, Bus, Stamp };

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0">
      <Image src="/logo.avif" alt="Tourist Leader" width={44} height={44} priority className="h-10 w-10 rounded-full object-contain" />
      <span className="text-lg font-extrabold tracking-tight text-slate-900">
        Tourist <span className="text-brand">Leader</span>
      </span>
    </Link>
  );
}

export function Header({ active = "flights" }: { active?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useT();
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Logo />

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_TABS.map((tab) => {
            const Icon = ICONS[tab.icon];
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active === tab.id ? "bg-brand/10 text-brand" : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Icon size={16} />
                {t(`tab_${tab.id}`)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <Link href="/offers" className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            <Gift size={16} /> {t("hdr_offers")}
          </Link>
          <Link href="/help" className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            <HelpCircle size={16} /> {t("hdr_help")}
          </Link>
          <span className="hidden sm:block"><CurrencyLanguageMenu variant="dark" /></span>
          <AuthButton variant="outline" compact />
          <button className="lg:hidden grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="lg:hidden border-t border-slate-100 bg-white px-3 py-2">
          {NAV_TABS.map((tab) => {
            const Icon = ICONS[tab.icon];
            return (
              <Link key={tab.id} href={tab.href} onClick={() => setMobileOpen(false)}
                className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium", active === tab.id ? "bg-brand/10 text-brand" : "text-slate-700")}>
                <Icon size={18} /> {t(`tab_${tab.id}`)}
              </Link>
            );
          })}
          <div className="my-2 border-t border-slate-100" />
          <Link href="/offers" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700"><Gift size={18} /> {t("hdr_offers")}</Link>
          <Link href="/help" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700"><HelpCircle size={18} /> {t("hdr_help")}</Link>
        </nav>
      )}
    </header>
  );
}

export function BrandStrip() {
  return (
    <div className="bg-gradient-to-r from-brand-dark to-brand text-center text-xs sm:text-sm text-white/95 py-1.5 px-4">
      {BRAND.tagline} · <span className="font-semibold">{BRAND.promise}</span>
    </div>
  );
}
