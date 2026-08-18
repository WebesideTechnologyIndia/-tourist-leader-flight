import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DEFAULT_REF_PREFIX } from "./flight-source";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatTime(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDate(iso: string | Date, opts?: Intl.DateTimeFormatOptions) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-IN", opts ?? { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDayMonth(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

/** Minutes → "2h 35m" */
export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/**
 * Internal booking reference. Flight bookings pass the supplier prefix — TLAK
 * for Akbar, TLAM for Amadeus — so the reference alone says where the ticket
 * was issued; everything else keeps the plain TL prefix.
 */
export function genBookingRef(prefix = DEFAULT_REF_PREFIX) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = prefix;
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}

export function genPNR() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let pnr = "";
  for (let i = 0; i < 6; i++) pnr += chars[Math.floor(Math.random() * chars.length)];
  return pnr;
}
