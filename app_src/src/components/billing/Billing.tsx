"use client";
import { MapPin } from "lucide-react";
import { INDIAN_STATES } from "@/lib/states";
import { gstLabel, type BillingConfigData, type GstBreakdown } from "@/lib/billing-core";
import { formatINR, cn } from "@/lib/utils";

export interface Quote { serviceCharge: number; gst: GstBreakdown; addon: number }

/** Fare-summary rows for the admin service charge + GST. Render BELOW existing fee lines. */
export function ServiceChargeLines({ q, config }: { q: Quote; config: BillingConfigData }) {
  if (!q || q.addon <= 0) return null;
  return (
    <>
      {q.serviceCharge > 0 && <Row label="Service charge" value={formatINR(q.serviceCharge)} />}
      {q.gst.type === "IGST" && <Row label={gstLabel(q.gst, config)} value={formatINR(q.gst.igst)} />}
      {q.gst.type === "CGST_SGST" && (
        <>
          <Row label={`CGST (${config.cgstRate}%)`} value={formatINR(q.gst.cgst)} />
          <Row label={`SGST (${config.sgstRate}%)`} value={formatINR(q.gst.sgst)} />
        </>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between text-slate-600"><span>{label}</span><span className="font-semibold text-slate-800">{value}</span></div>;
}

/** State selector used for GST place-of-supply on the payment step. Required to proceed. */
export function GstStateSelect({ value, onChange, compact = false, required = true }: { value: string; onChange: (s: string) => void; compact?: boolean; required?: boolean }) {
  const empty = !value;
  return (
    <label className="block">
      {!compact && <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><MapPin size={13} className="text-brand" /> Billing state (for GST){required && <span className="text-rose-500">*</span>}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className={cn("w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand", required && empty ? "border-amber-300 bg-amber-50/40" : "border-slate-200")}>
        <option value="">Select your state…</option>
        {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {required && empty && <span className="mt-1 block text-[11px] font-medium text-amber-600">Select your state to apply GST &amp; continue.</span>}
    </label>
  );
}
