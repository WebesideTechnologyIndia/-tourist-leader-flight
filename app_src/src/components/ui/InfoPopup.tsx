"use client";
import { Info } from "lucide-react";
import { ReactNode, useState } from "react";
import { Modal } from "./Modal";
import { cn } from "@/lib/utils";

export function InfoPopup({
  title,
  children,
  className,
  size = 16,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn("inline-grid place-items-center text-slate-400 hover:text-brand transition-colors", className)}
        aria-label="More info"
      >
        <Info size={size} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        {children}
      </Modal>
    </>
  );
}

/** Tooltip-style hint shown on hover (desktop) / tap (mobile). */
export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex items-center">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}
