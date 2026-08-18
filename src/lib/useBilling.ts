"use client";
import { useEffect, useState } from "react";
import { quoteBooking, DEFAULT_BILLING, type BillingConfigData } from "./billing-core";

/** Fetches the live billing config once and exposes a quote() for service charge + GST. */
export function useBilling() {
  const [config, setConfig] = useState<BillingConfigData>(DEFAULT_BILLING);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    fetch("/api/billing/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.config) setConfig(d.config); })
      .finally(() => setReady(true));
  }, []);
  return { config, ready, quote: (subtotal: number, state?: string | null, pax = 1) => quoteBooking(subtotal, state, config, pax) };
}
