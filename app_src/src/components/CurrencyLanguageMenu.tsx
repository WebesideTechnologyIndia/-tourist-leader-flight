"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Globe, Check, Info } from "lucide-react";
import { CURRENCIES, LANGUAGES } from "@/lib/preferences";
import { usePreferences, useT } from "@/store/preferences";
import { cn } from "@/lib/utils";

/** Currency + language selector. `variant` controls the trigger styling for the
 *  two headers (transparent hero header vs. solid results header). */
export function CurrencyLanguageMenu({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { currency, language, setCurrency, setLanguage } = usePreferences();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = useT();

  const toggle = () => {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setCoords({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const n = e.target as Node;
      if (btnRef.current?.contains(n) || menuRef.current?.contains(n)) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { document.removeEventListener("mousedown", onClick); window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [open]);

  const label = `${currency} | ${language.toUpperCase()}`;

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
          variant === "light"
            ? "border border-white/40 text-white hover:bg-white/10"
            : "border border-slate-200 text-slate-700 hover:bg-slate-100"
        )}
        aria-label="Change currency and language"
      >
        <Globe size={15} /> {label}
      </button>

      {open && coords && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          style={{ top: coords.top, right: coords.right }}
          className="fixed z-[200] w-[min(22rem,calc(100vw-1rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl animate-fade-up"
        >
          {/* Currency */}
          <p className="px-1 pb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">{t("cur_currency")}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {CURRENCIES.map((c) => {
              const on = c.code === currency;
              return (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className={cn("flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors", on ? "border-brand bg-brand/5" : "border-slate-200 hover:border-slate-300")}
                >
                  <span className="min-w-0">
                    <span className={cn("block text-sm font-bold", on ? "text-brand" : "text-slate-800")}>{c.symbol.trim()} {c.code}</span>
                    <span className="block truncate text-[11px] text-slate-500">{c.label}</span>
                  </span>
                  {on && <Check size={15} className="shrink-0 text-brand" />}
                </button>
              );
            })}
          </div>

          {/* Language */}
          <p className="px-1 pb-1.5 pt-3 text-xs font-bold uppercase tracking-wide text-slate-400">{t("cur_language")}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {LANGUAGES.map((l) => {
              const on = l.code === language;
              return (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={cn("flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors", on ? "border-brand bg-brand/5" : "border-slate-200 hover:border-slate-300")}
                >
                  <span className="min-w-0">
                    <span className={cn("block text-sm font-bold", on ? "text-brand" : "text-slate-800")}>{l.native}</span>
                    <span className="block truncate text-[11px] text-slate-500">{l.label}</span>
                  </span>
                  {on && <Check size={15} className="shrink-0 text-brand" />}
                </button>
              );
            })}
          </div>

          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] leading-snug text-slate-500">
            <Info size={13} className="mt-0.5 shrink-0" /> {t("cur_payNote")}
          </p>
        </div>,
        document.body
      )}
    </>
  );
}
