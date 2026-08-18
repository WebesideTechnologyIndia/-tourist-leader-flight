"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ProductTabs } from "./ProductTabs";
import { AuthButton } from "@/components/auth/AuthButton";
import { cn } from "@/lib/utils";

/** Compact sticky header that slides in once the user scrolls past the hero,
 *  mirroring MakeMyTrip's on-scroll navigation bar. */
export function StickyNav({ active = "flights" }: { active?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 280);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white shadow-sm transition-all duration-300",
        show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src="/logo.avif" alt="Tourist Leader" width={36} height={36} className="h-8 w-8 rounded-full object-contain" />
          <span className="hidden text-base font-extrabold tracking-tight text-slate-900 sm:block">
            Tourist <span className="text-brand">Leader</span>
          </span>
        </Link>

        {/* Tabs + a "More" dropdown for the overflow (responsive primary count).
            overflow-x-auto keeps tabs inside their own box so they never push the
            account button off-screen on small viewports. */}
        <div className="no-scrollbar flex min-w-0 flex-1 items-center overflow-x-auto xl:justify-center xl:overflow-visible">
          <div className="hidden xl:block"><ProductTabs active={active} collapseAfter={7} /></div>
          <div className="hidden md:block xl:hidden"><ProductTabs active={active} collapseAfter={5} /></div>
          <div className="hidden sm:block md:hidden"><ProductTabs active={active} collapseAfter={3} /></div>
          <div className="block sm:hidden"><ProductTabs active={active} collapseAfter={2} /></div>
        </div>

        <div className="shrink-0"><AuthButton variant="outline" compact /></div>
      </div>
    </div>
  );
}
