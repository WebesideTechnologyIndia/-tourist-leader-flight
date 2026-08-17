"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plane, BedDouble, Palmtree, Bus, Stamp, CreditCard, ShieldCheck, ChevronDown, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/store/preferences";

const TABS = [
  { id: "flights", label: "Flights", icon: Plane, href: "/" },
  { id: "hotels", label: "Hotels", icon: BedDouble, href: "/hotels" },
  { id: "holidays", label: "Holiday Packages", icon: Palmtree, href: "/holidays" },
  { id: "bus", label: "Bus", icon: Bus, href: "/bus" },
  { id: "visa", label: "Visa", icon: Stamp, href: "/visa" },
  { id: "forex", label: "Forex Card", icon: CreditCard, href: "/forex" },
  { id: "insurance", label: "Travel Insurance", icon: ShieldCheck, href: "/insurance" },
];

type Tab = (typeof TABS)[number];

function Tab({ tab, active }: { tab: Tab; active: boolean }) {
  const t = useT();
  return (
    <Link
      href={tab.href}
      className={cn(
        "relative flex min-w-[68px] shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-center transition-colors sm:min-w-[80px] sm:px-2.5",
        active ? "text-brand" : "text-slate-600 hover:bg-slate-50"
      )}
    >
      <tab.icon size={24} className={cn(active ? "text-brand" : "text-slate-500")} strokeWidth={1.6} />
      <span className="text-[11px] font-semibold leading-tight">{t(`tab_${tab.id}`)}</span>
      {active && <span className="absolute -bottom-1 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-brand" />}
    </Link>
  );
}

/**
 * Product navigation tabs.
 * - Default (no collapseAfter): all tabs, horizontally scrollable (in-card use).
 * - collapseAfter=N: show first N tabs inline and tuck the rest into a "More" dropdown.
 */
export function ProductTabs({ active = "flights", collapseAfter }: { active?: string; collapseAfter?: number }) {
  const tx = useT();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // The dropdown is portaled to <body> so it can't be clipped by the StickyNav's
  // overflow-x-auto tab strip (which was hiding it on mobile/tablet).
  const toggle = () => {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setCoords({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  if (collapseAfter == null) {
    // In-card nav: horizontal slide (swipe) on mobile/tablet; full single row on desktop.
    return (
      <div className="no-scrollbar -mx-2 flex items-stretch gap-1 overflow-x-auto px-2 pb-1 sm:gap-2 lg:mx-0 lg:justify-between lg:overflow-visible lg:px-0">
        {TABS.map((t) => <Tab key={t.id} tab={t} active={active === t.id} />)}
      </div>
    );
  }

  // Ensure the active tab is always visible inline (swap it in if it's in the overflow).
  let primary = TABS.slice(0, collapseAfter);
  let more = TABS.slice(collapseAfter);
  if (more.some((t) => t.id === active) && !primary.some((t) => t.id === active)) {
    const activeTab = more.find((t) => t.id === active)!;
    primary = [...primary.slice(0, collapseAfter - 1), activeTab];
    more = TABS.filter((t) => !primary.includes(t));
  }
  const moreActive = more.some((t) => t.id === active);

  return (
    <div className="flex items-stretch gap-1 sm:gap-2">
      {primary.map((t) => <Tab key={t.id} tab={t} active={active === t.id} />)}

      {more.length > 0 && (
        <button
          ref={btnRef}
          onClick={toggle}
          className={cn(
            "relative flex min-w-[68px] shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-center transition-colors sm:min-w-[80px] sm:px-2.5",
            moreActive ? "text-brand" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <LayoutGrid size={24} className={cn(moreActive ? "text-brand" : "text-slate-500")} strokeWidth={1.6} />
          <span className="flex items-center gap-0.5 text-[11px] font-semibold leading-tight">
            {tx("tab_more")} <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
          </span>
          {moreActive && <span className="absolute -bottom-1 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-brand" />}
        </button>
      )}

      {open && coords && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} style={{ top: coords.top, right: coords.right }} className="fixed z-[200] w-56 max-w-[calc(100vw-16px)] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl animate-fade-up">
          {more.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active === t.id ? "bg-brand/5 text-brand" : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <t.icon size={20} strokeWidth={1.6} className={active === t.id ? "text-brand" : "text-slate-500"} />
              {tx(`tab_${t.id}`)}
            </Link>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
