"use client";
import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Download, CalendarPlus, Car, Share2, FileText, Mail, Luggage, ShieldAlert, Home, Check, Printer, Users, Armchair, Utensils } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { InfoPopup } from "@/components/ui/InfoPopup";
import { Modal } from "@/components/ui/Modal";
import { FlightSummaryCard } from "@/components/booking/FlightSummaryCard";
import { FlightSourceBadge } from "@/components/FlightSourceBadge";
import { useBooking } from "@/store/booking";
import { useBilling } from "@/lib/useBilling";
import { CABS, AIRPORT_SERVICES, AIRPORTS, MEALS } from "@/lib/constants";
import { fareBreakdown, paxTypes } from "@/lib/fare-rules";
import { formatINR, formatDate, formatTime } from "@/lib/utils";

const CONVENIENCE = 299;

function icsStamp(iso: string) {
  // YYYYMMDDTHHMMSSZ
  const d = iso ? new Date(iso) : new Date();
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function cityName(code?: string) {
  return AIRPORTS.find((a) => a.code === code)?.city || code || "";
}

function Confirmation() {
  const sp = useSearchParams();
  const router = useRouter();
  const ref = sp.get("ref") || "";
  const pnr = sp.get("pnr") || "";
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState("");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const { flight, fare, query, passengers, extraFlights, seats, meals, contactEmail, contactPhone, addOns, customerState } = useBooking();
  const { quote } = useBilling();

  useEffect(() => {
    setMounted(true);
    if (!ref) router.replace("/");
  }, [ref, router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!mounted) return null;

  // ---- fare math (mirrors the booking PriceSummary) ----
  // Combined per-passenger fare across all legs (return / multi-city); infants pay the reduced rate.
  const perPax = (fare?.price || 0) + extraFlights.reduce((s, e) => s + (e.fare?.price || 0), 0);
  const fb = fareBreakdown(query?.travellers || { adults: 1, children: 0, infants: 0 }, perPax);
  const { paying: pax, base, taxes } = fb;
  const subtotal = fb.fareTotal + (addOns || 0) + CONVENIENCE;
  // FLAT service charge is per passenger (all travellers on the booking).
  const paxCount = query ? query.travellers.adults + query.travellers.children + query.travellers.infants : pax;
  const q = quote(subtotal, customerState, paxCount);
  const total = subtotal + q.addon;

  // Each traveller with their type + chosen seat / meal PER FLIGHT (onward + return / multi-city).
  const types = query ? paxTypes(query.travellers) : [];
  const legCount = 1 + extraFlights.length;
  const legLabelOf = (leg: number) =>
    legCount === 1 ? "" : query?.tripType === "ROUND_TRIP" ? (leg === 0 ? "Onward" : "Return") : `Flight ${leg + 1}`;
  const travellerRows = (passengers || []).map((p, i) => ({
    name: p.fullName || `Passenger ${i + 1}`,
    type: types[i] || "Adult",
    legs: Array.from({ length: legCount }, (_, leg) => ({
      label: legLabelOf(leg),
      seat: seats[leg]?.[i] || "",
      meal: MEALS.find((m) => m.id === meals[leg]?.[i])?.label || "",
    })).filter((l) => l.seat || l.meal),
  }));

  // ---- Add to Calendar (.ics) ----
  const addToCalendar = () => {
    if (!flight) return;
    const summary = `Flight ${flight.airlineName} ${flight.flightNumber} · ${flight.from}→${flight.to}`;
    const desc = `Tourist Leader booking\\nBooking ID: ${ref}\\nPNR: ${pnr}\\n${cityName(flight.from)} (${flight.from}) to ${cityName(flight.to)} (${flight.to})`;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Tourist Leader//Flight//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${ref}@touristleader.com`,
      `DTSTAMP:${icsStamp("")}`,
      `DTSTART:${icsStamp(flight.departTime)}`,
      `DTEND:${icsStamp(flight.arriveTime)}`,
      `SUMMARY:${summary}`,
      `LOCATION:${cityName(flight.from)} Airport (${flight.from})`,
      `DESCRIPTION:${desc}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT3H",
      "ACTION:DISPLAY",
      "DESCRIPTION:Flight reminder",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    download(`Tourist Leader-${ref}.ics`, ics, "text/calendar");
    setToast("Calendar event downloaded");
  };

  // ---- Share Trip ----
  const shareTrip = async () => {
    const text = flight
      ? `My Tourist Leader trip: ${cityName(flight.from)} → ${cityName(flight.to)} on ${flight.airlineName} ${flight.flightNumber}. PNR ${pnr}, Booking ${ref}.`
      : `My Tourist Leader booking ${ref} (PNR ${pnr}).`;
    const shareData = { title: "Tourist Leader Booking", text, url: typeof window !== "undefined" ? window.location.href : "" };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${text} ${shareData.url}`);
        setToast("Trip link copied to clipboard");
      }
    } catch {
      /* user cancelled share — no-op */
    }
  };

  // ---- Print / Save invoice as PDF ----
  const printInvoice = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const lead = passengers?.[0]?.fullName || "Guest";
    const invDate = formatDate(new Date());
    const rows = [
      ["Base fare", `× ${pax} traveller${pax > 1 ? "s" : ""}`, formatINR(base)],
      ["Taxes & airport fees", "", formatINR(taxes)],
      ...(fb.infants > 0 ? [["Infant fare", `× ${fb.infants}`, formatINR(fb.infantTotal)]] : []),
      ["Add-ons (seats / meals)", "", formatINR(addOns || 0)],
      ["Convenience fee", "non-refundable", formatINR(CONVENIENCE)],
      ...(q.serviceCharge > 0 ? [["Service charge", customerState ? `Billing: ${customerState}` : "", formatINR(q.serviceCharge)]] : []),
      ...(q.gst.igst > 0 ? [["IGST (18%)", "", formatINR(q.gst.igst)]] : []),
      ...(q.gst.cgst > 0 ? [["CGST (9%)", "", formatINR(q.gst.cgst)]] : []),
      ...(q.gst.sgst > 0 ? [["SGST (9%)", "", formatINR(q.gst.sgst)]] : []),
    ];
    const flightLine = flight
      ? `${cityName(flight.from)} (${flight.from}) &rarr; ${cityName(flight.to)} (${flight.to})`
      : "-";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${ref}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#1e293b;background:#f1f5f9;padding:28px}
  .inv{max-width:760px;margin:auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(2,6,23,.10)}
  .top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:30px 34px;background:linear-gradient(135deg,#0a4fa8 0%,#0b63d6 55%,#38bdf8 100%);color:#fff}
  .brand{display:flex;align-items:center;gap:13px}
  .brand img{width:50px;height:50px;border-radius:50%;background:#fff;padding:3px;object-fit:contain}
  .brand .name{font-size:23px;font-weight:800;letter-spacing:-.5px;line-height:1}
  .brand .sub{font-size:12px;opacity:.9;margin-top:5px}
  .meta{text-align:right;line-height:1.5}
  .meta .lbl{opacity:.85;font-size:10px;text-transform:uppercase;letter-spacing:1px}
  .meta .val{font-weight:700;font-size:16px}
  .paid{display:inline-flex;align-items:center;gap:6px;margin-top:10px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.55);padding:4px 13px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:1px}
  .body{padding:26px 34px}
  .cards{display:flex;gap:16px;flex-wrap:wrap}
  .card{flex:1;min-width:230px;background:#f8fafc;border:1px solid #e8edf3;border-radius:13px;padding:16px}
  .card h4{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:9px}
  .card .line{font-size:13px;margin:4px 0;color:#334155}
  .card .line b{color:#0f172a}
  h3{font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:#475569;margin:26px 0 6px}
  table{width:100%;border-collapse:collapse;font-size:14px}
  thead td{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;border-bottom:2px solid #e2e8f0;padding:9px 0}
  tbody td{padding:11px 0;border-bottom:1px solid #f1f5f9}
  tbody td .s{color:#94a3b8;font-size:12px;margin-left:6px}
  .r{text-align:right;font-variant-numeric:tabular-nums}
  .total{display:flex;justify-content:space-between;align-items:center;margin-top:18px;background:linear-gradient(135deg,#0b63d6,#38bdf8);color:#fff;border-radius:13px;padding:15px 20px}
  .total .t1{font-weight:600;font-size:14px}
  .total .t2{font-size:23px;font-weight:800;font-variant-numeric:tabular-nums}
  .foot{padding:18px 34px;background:#f8fafc;border-top:1px solid #e8edf3;font-size:11px;color:#94a3b8;line-height:1.7}
  @media print{body{background:#fff;padding:0}.inv{box-shadow:none;border-radius:0}}
</style></head><body>
  <div class="inv">
    <div class="top">
      <div class="brand">
        <img src="${origin}/logo.avif" alt="Tourist Leader"/>
        <div><div class="name">Tourist Leader</div><div class="sub">Comfort before, during, and after take off</div></div>
      </div>
      <div class="meta">
        <div class="lbl">Invoice / Booking ID</div><div class="val">${ref}</div>
        <div class="lbl" style="margin-top:8px">PNR</div><div class="val">${pnr}</div>
        <div class="paid">&#9679; PAID</div>
      </div>
    </div>
    <div class="body">
      <div class="cards">
        <div class="card"><h4>Billed To</h4>
          <div class="line"><b>${lead}</b></div>
          ${contactEmail ? `<div class="line">${contactEmail}</div>` : ""}
          ${contactPhone ? `<div class="line">${contactPhone}</div>` : ""}
        </div>
        <div class="card"><h4>Flight Details</h4>
          <div class="line"><b>${extraFlights.length ? "Onward: " : ""}${flight ? `${flight.airlineName} ${flight.flightNumber}` : "-"}</b></div>
          <div class="line">${flightLine}</div>
          <div class="line">${flight ? `${formatDate(flight.departTime)} &middot; ${formatTime(flight.departTime)}` : "-"}</div>
          ${extraFlights.map((e, idx) => `<div class="line" style="margin-top:6px"><b>${query?.tripType === "ROUND_TRIP" ? "Return" : `Flight ${idx + 2}`}: ${e.flight.airlineName} ${e.flight.flightNumber}</b></div><div class="line">${cityName(e.flight.from)} (${e.flight.from}) &rarr; ${cityName(e.flight.to)} (${e.flight.to}) &middot; ${formatDate(e.flight.departTime)}</div>`).join("")}
          <div class="line">${query?.cabinClass || "-"} &middot; ${fare?.label || "-"} &middot; ${pax} traveller${pax > 1 ? "s" : ""}</div>
        </div>
      </div>
      <h3>Fare Breakdown</h3>
      <table>
        <thead><tr><td>Description</td><td class="r">Amount</td></tr></thead>
        <tbody>${rows.map((r) => `<tr><td>${r[0]}<span class="s">${r[1]}</span></td><td class="r">${r[2]}</td></tr>`).join("")}</tbody>
      </table>
      <div class="total"><span class="t1">Total Paid (incl. GST)</span><span class="t2">${formatINR(total)}</span></div>
    </div>
    <div class="foot">
      Invoice date: ${invDate} &nbsp;&middot;&nbsp; This is a computer-generated invoice and does not require a signature.<br/>
      Convenience fee is non-refundable. For assistance, contact help@touristleader.com. &copy; ${new Date().getFullYear()} Tourist Leader.com
    </div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print()},350)}</script>
</body></html>`;
    const w = window.open("", "_blank", "width=820,height=960");
    if (w) {
      w.document.write(html);
      w.document.close();
    } else {
      // popup blocked — fall back to an HTML download
      download(`Tourist Leader-Invoice-${ref}.html`, html, "text/html");
      setToast("Invoice downloaded");
    }
  };

  // Add-on requests (cab, etc.) are logged as a support ticket so they reach the
  // admin queue and notify the team — not just a toast.
  const requestService = (label: string) => {
    setToast(`${label} request sent — our team will contact you`);
    fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: passengers?.[0]?.fullName || "Customer",
        email: contactEmail || "guest@touristleader.com",
        phone: contactPhone || "",
        category: "GENERAL",
        bookingRef: ref,
        subject: `Add-on request: ${label}`,
        message: `Customer requested "${label}" for booking ${ref} (PNR ${pnr}). Please reach out to arrange this add-on and collect any payment.`,
      }),
    }).catch(() => {});
  };

  return (
    <main className="flex-1 bg-background">
      <div className="bg-gradient-to-b from-emerald-500 to-emerald-600 py-10 text-center text-white">
        <CheckCircle2 size={56} className="mx-auto animate-fade-up" />
        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">Booking Confirmed!</h1>
        <p className="mt-1 text-white/90">Your trip is all set. Comfort, all the way.</p>
      </div>

      <div className="mx-auto -mt-6 max-w-3xl px-4 pb-10">
        <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-slate-200 pb-4">
            <div>
              <p className="text-xs text-slate-400">Booking ID</p>
              <p className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                {ref}
                <FlightSourceBadge source={flight?.source} />
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">PNR</p>
              <p className="text-lg font-extrabold text-brand">{pnr}</p>
            </div>
          </div>

          <div className="mt-4"><FlightSummaryCard /></div>

          {/* Travellers — all passengers by name, with their seat & meal */}
          {travellerRows.length > 0 && (
            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400"><Users size={13} /> Travellers</p>
              <div className="space-y-1.5">
                {travellerRows.map((p, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-100">
                    <span className="font-semibold text-slate-800">{p.name} <span className="text-xs font-normal text-slate-400">({p.type})</span></span>
                    {p.legs.length === 0 ? (
                      <span className="text-xs text-slate-300">No seat / meal</span>
                    ) : (
                      <span className="flex flex-col items-end gap-0.5 text-xs text-slate-500">
                        {p.legs.map((l, li) => (
                          <span key={li} className="flex items-center gap-2">
                            {l.label && <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{l.label}</span>}
                            {l.seat && <span className="flex items-center gap-1"><Armchair size={12} /> {l.seat}</span>}
                            {l.meal && <span className="flex items-center gap-1"><Utensils size={12} /> {l.meal}</span>}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {contactEmail && (
            <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <Mail size={15} /> Ticket & invoice emailed to {contactEmail}
            </p>
          )}

          {/* rules */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Luggage size={15} className="text-brand" /> Baggage rules</p>
              <p className="mt-1 text-xs text-slate-500">Cabin {flight?.cabinBaggage || "7 kg"} · Check-in {flight?.checkInBaggage || "15 kg"} per adult.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><ShieldAlert size={15} className="text-brand" /> Cancellation policy</p>
              <p className="mt-1 text-xs text-slate-500">Airline rules apply. Convenience fee non-refundable. No-shows may get zero refund.</p>
            </div>
          </div>

          {/* actions */}
          <div className="no-print mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button variant="outline" size="sm" onClick={() => window.print()}><Download size={15} /> PDF Ticket</Button>
            <Button variant="outline" size="sm" onClick={addToCalendar}><CalendarPlus size={15} /> Add to Calendar</Button>
            <Button variant="outline" size="sm" onClick={shareTrip}><Share2 size={15} /> Share Trip</Button>
            <Button variant="outline" size="sm" onClick={() => setInvoiceOpen(true)}><FileText size={15} /> View Invoice</Button>
          </div>
        </div>

        {/* Add cab */}
        <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="flex items-center gap-2 font-bold text-slate-900"><Car size={18} className="text-brand" /> Add an airport cab</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CABS.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 p-3 text-center">
                <Car size={24} className="mx-auto text-slate-400" />
                <p className="mt-1 flex items-center justify-center gap-1 text-sm font-semibold text-slate-800">{c.label}<InfoPopup title={c.label} size={13}><p className="text-sm text-slate-700">{c.info}</p></InfoPopup></p>
                <Button variant="soft" size="sm" className="mt-2 w-full" onClick={() => requestService(`${c.label} airport cab`)}>Add</Button>
              </div>
            ))}
          </div>
        </div>

        {/* Airport services */}
        <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="font-bold text-slate-900">Airport support services</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {AIRPORT_SERVICES.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700">
                {s.label}<InfoPopup title={s.label} size={13}><p className="text-sm text-slate-700">{s.info}</p></InfoPopup>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => { useBooking.getState().reset(); router.push("/"); }}><Home size={16} /> Back to Home</Button>
        </div>
      </div>

      {/* Invoice modal */}
      <Modal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} title="Tax Invoice">
        <div className="mb-3 flex items-center gap-2.5">
          <Image src="/logo.avif" alt="Tourist Leader" width={36} height={36} className="h-9 w-9 rounded-full object-contain" />
          <div>
            <p className="text-sm font-extrabold leading-tight text-slate-900">Tourist <span className="text-brand">Leader</span></p>
            <p className="text-[11px] text-slate-400">Comfort before, during, and after take off</p>
          </div>
          <span className="ml-auto rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">● PAID</span>
        </div>
        <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-3">
          <div>
            <p className="text-xs text-slate-400">Booking ID</p>
            <p className="font-bold text-slate-900">{ref}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">PNR</p>
            <p className="font-bold text-brand">{pnr}</p>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <p><span className="font-semibold">Billed to:</span> {passengers?.[0]?.fullName || "Guest"}{contactEmail ? ` · ${contactEmail}` : ""}</p>
          {flight && <p className="mt-1"><span className="font-semibold">Flight:</span> {flight.airlineName} {flight.flightNumber}, {cityName(flight.from)} → {cityName(flight.to)}</p>}
          {flight && <p className="mt-1"><span className="font-semibold">Date:</span> {formatDate(flight.departTime)} · {fare?.label} · {query?.cabinClass}</p>}
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <Row label={`Base fare × ${pax}`} value={formatINR(base)} />
          <Row label="Taxes & fees" value={formatINR(taxes)} />
          {fb.infants > 0 && <Row label={`Infant fare × ${fb.infants}`} value={formatINR(fb.infantTotal)} />}
          <Row label="Add-ons (seats / meals)" value={formatINR(addOns || 0)} />
          <Row label="Convenience fee" value={formatINR(CONVENIENCE)} />
          {q.serviceCharge > 0 && <Row label="Service charge" value={formatINR(q.serviceCharge)} />}
          {q.gst.igst > 0 && <Row label="IGST (18%)" value={formatINR(q.gst.igst)} />}
          {q.gst.cgst > 0 && <Row label="CGST (9%)" value={formatINR(q.gst.cgst)} />}
          {q.gst.sgst > 0 && <Row label="SGST (9%)" value={formatINR(q.gst.sgst)} />}
          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-base font-extrabold text-slate-900">
            <span>Total Paid</span><span>{formatINR(total)}</span>
          </div>
        </div>
        <Button className="mt-4 w-full" onClick={printInvoice}><Printer size={16} /> Print / Save as PDF</Button>
      </Modal>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl animate-fade-up">
          <Check size={15} className="text-emerald-400" /> {toast}
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <span>{label}</span><span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <>
      <Header active="flights" />
      <Suspense fallback={<div className="flex-1 py-20 text-center text-slate-400">Loading…</div>}>
        <Confirmation />
      </Suspense>
      <Footer />
    </>
  );
}
