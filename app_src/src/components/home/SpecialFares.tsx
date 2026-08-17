"use client";
import { useState } from "react";
import { Info } from "lucide-react";
import { PASSENGER_TYPES, type PassengerType } from "@/lib/constants";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useT } from "@/store/preferences";

const SUBTITLES: Record<string, string> = {
  REGULAR: "Regular fares",
  STUDENT: "Extra discounts / baggage",
  SENIOR: "Up to ₹600 off",
  DISABILITY: "Assistance & discounts",
  MOTHERS: "Priority & comfort",
  ARMED_FORCES: "Up to ₹600 off",
  MEDICAL: "Special discounted fare",
  MINOR: "Airline escort service",
  GROUP: "Better group pricing",
};

function Section({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-700">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SpecialFares({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [info, setInfo] = useState<PassengerType | null>(null);
  const t = useT();
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400 sm:w-16 sm:pt-2 sm:leading-tight">{t("fare_special")}</span>
      <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto pb-1">
        {PASSENGER_TYPES.map((p) => {
          const on = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              className={cn(
                "group relative flex min-w-[170px] shrink-0 items-start gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
                on ? "border-brand bg-brand/5" : "border-slate-200 hover:border-slate-300"
              )}
            >
              <span className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2", on ? "border-brand" : "border-slate-300")}>
                {on && <span className="h-2 w-2 rounded-full bg-brand" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-sm font-bold", on ? "text-brand" : "text-slate-800")}>{p.label}</span>
                <span className="block truncate text-[11px] text-slate-500">{SUBTITLES[p.id]}</span>
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); setInfo(p); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setInfo(p); } }}
                className="text-slate-400 hover:text-brand"
                aria-label={`About ${p.label}`}
              >
                <Info size={14} />
              </span>
            </button>
          );
        })}
      </div>

      <Modal open={!!info} onClose={() => setInfo(null)} title={info?.label}>
        {info && (
          <div>
            <p className="mb-4 rounded-xl bg-brand/5 p-3 text-sm text-slate-700">{info.title}</p>
            <Section title="Eligibility" items={info.eligibility} />
            <Section title="Benefits" items={info.benefits} />
            <Section title="Documents Required" items={info.documents} />
            <Section title="Important" items={info.important} />
          </div>
        )}
      </Modal>
    </div>
  );
}
