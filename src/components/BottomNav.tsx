"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plane, BedDouble, Palmtree, Bus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/store/preferences";

const ITEMS = [
  { id: "flights", icon: Plane, key: "tab_flights", href: "/" },
  { id: "hotels", icon: BedDouble, key: "tab_hotels", href: "/hotels" },
  { id: "holidays", icon: Palmtree, key: "bn_holidays", href: "/holidays", center: true },
  { id: "bus", icon: Bus, key: "tab_bus", href: "/bus" },
  { id: "account", icon: User, key: "bn_account", href: "/account" },
];

/** Mobile-only bottom navigation. The center item is raised + highlighted. */
export function BottomNav() {
  const pathname = usePathname() || "/";
  const t = useT();

  // Hide on the admin/agent consoles — this is a customer-facing nav.
  if (pathname.startsWith("/admin") || pathname.startsWith("/agent")) return null;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* spacer so fixed bar never covers page content / footer on mobile */}
      <div className="h-20 md:hidden" aria-hidden />

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="mx-auto flex max-w-md items-end justify-around px-2">
          {ITEMS.map((it) => {
            const active = isActive(it.href);
            const label = t(it.key);
            if (it.center) {
              return (
                <li key={it.id} className="flex-1">
                  <Link href={it.href} className="flex flex-col items-center">
                    <span className={cn("-mt-6 grid h-14 w-14 place-items-center rounded-full text-white shadow-lg ring-4 ring-white transition-transform active:scale-95", active ? "bg-brand-dark" : "bg-gradient-to-br from-brand to-sky-500")}>
                      <it.icon size={26} strokeWidth={2} />
                    </span>
                    <span className={cn("mt-0.5 whitespace-nowrap text-[11px] font-bold", active ? "text-brand" : "text-slate-600")}>{label}</span>
                  </Link>
                </li>
              );
            }
            return (
              <li key={it.id} className="flex-1">
                <Link href={it.href} className={cn("flex flex-col items-center gap-0.5 py-2 transition-colors", active ? "text-brand" : "text-slate-500")}>
                  <it.icon size={22} strokeWidth={active ? 2.2 : 1.7} />
                  <span className="whitespace-nowrap text-[11px] font-semibold leading-none">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
