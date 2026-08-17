"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Info, UserCheck } from "lucide-react";
import { PASSENGER_TYPES, type PassengerType } from "@/lib/constants";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

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

export function PassengerTypeSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<PassengerType | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const selected = PASSENGER_TYPES.find((p) => p.id === value) || PASSENGER_TYPES[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:border-brand transition-colors">
        <UserCheck size={15} className="text-brand" />
        {selected.label}
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-72 max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {PASSENGER_TYPES.map((p) => (
            <div key={p.id} className={cn("flex items-center rounded-lg", value === p.id && "bg-brand/5")}>
              <button onClick={() => { onChange(p.id); setOpen(false); }}
                className={cn("flex-1 px-3 py-2 text-left text-sm font-medium", value === p.id ? "text-brand" : "text-slate-700 hover:text-brand")}>
                {p.label}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setInfo(p); }} className="grid h-8 w-8 place-items-center text-slate-400 hover:text-brand" aria-label={`About ${p.label}`}>
                <Info size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

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
