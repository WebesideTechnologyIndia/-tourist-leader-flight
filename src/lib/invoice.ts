import { formatINR, formatDate, formatTime } from "./utils";
import { AIRPORTS, MEALS } from "./constants";
import { INFANT_FARE_RATE } from "./fare-rules";

/** Who the invoice is billed to. Customer details for direct bookings, agency details for agent bookings. */
export interface BillTo {
  label: string; // "Billed To" | "Billed To (Agent)"
  name: string; // customer name or agency name
  lines: string[]; // address / GSTIN / contact lines
}

export interface InvoiceData {
  ref: string;
  pnr: string;
  name: string;
  email?: string;
  phone?: string;
  // Resolved billing party (server-side). When present it overrides name/email/phone in the "Billed To" card.
  billTo?: BillTo;
  // Whose name heads the document — the agency for agent bookings, us otherwise.
  brand?: DocBrand;
  // booking kind controls labels (defaults to FLIGHT for backward compat)
  kind?: "FLIGHT" | "BUS" | "HOTEL";
  // generic details card: pass detailsTitle + detailLines for bus/hotel
  detailsTitle?: string;
  detailLines?: string[];
  // legacy flight fields (used when detailLines is not provided)
  airline?: string;
  flightNo?: string;
  fromCode?: string;
  toCode?: string;
  fromCity?: string;
  toCity?: string;
  dateLabel: string;
  timeLabel?: string;
  cabin?: string;
  fareLabel?: string;
  pax: number;
  // Traveller names (with type/seat/meal) to list on the invoice.
  travellers?: { name: string; type?: string; seat?: string; meal?: string }[];
  base: number;
  taxes: number;
  infants?: number;
  infantFare?: number;
  addOns: number;
  convenience: number;
  serviceCharge?: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  total: number;
  invDate: string;
}

const PNR_LABEL: Record<string, string> = { FLIGHT: "PNR", BUS: "Ticket No.", HOTEL: "Confirmation No." };

const FARE_LABELS: Record<string, string> = { FEE_SAVER: "Fee Saver", REGULAR: "Regular", COMFORT: "Comfort", YOUR_CHOICE: "Your Choice" };
function cityName(code: string): string {
  return AIRPORTS.find((a) => a.code === code)?.city || code;
}

/** Loosely-typed itinerary snapshot stored on a booking (Json column). */
interface FlightDataLike {
  airlineName?: string; flightNumber?: string; departTime?: string; arriveTime?: string;
  operator?: string; busType?: string; seatIds?: string[]; boarding?: { name?: string; time?: string };
  name?: string; area?: string; city?: string; roomName?: string; nights?: number; checkIn?: string; checkOut?: string; rooms?: number;
}

/** The booking fields needed to render an invoice (shared by My Trips and the agent/admin back-office). */
export interface BookingLike {
  bookingRef: string;
  pnr?: string | null;
  bookingType?: string | null;
  origin: string;
  destination: string;
  departDate: string;
  cabinClass: string;
  fareType?: string;
  adults: number;
  children: number;
  infants?: number;
  baseFare: number;
  taxes: number;
  addOns: number;
  totalAmount: number;
  serviceCharge?: number;
  gstType?: string | null;
  igst?: number;
  cgst?: number;
  sgst?: number;
  // --- Agent attribution + earnings (for the B2B / commission invoice) ---
  bookedByAgentId?: string | null;
  agentMarkup?: number;
  commission?: number;
  commissionGst?: number;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  passengers?: {
    fullName?: string; type?: string; seat?: string; seatId?: string; meal?: string;
    // Per-leg SSR (onward + return / multi-city) attached at booking time.
    ssr?: { leg: number; label: string; seat?: string | null; meal?: string | null }[];
  }[] | null;
  flightData?: FlightDataLike | null;
  billTo?: BillTo; // attached server-side
}

/** Build print-ready invoice data from a stored booking. Bill-to is taken from booking.billTo (resolved server-side). */
export function buildInvoiceDataFromBooking(b: BookingLike): InvoiceData {
  const kind = ((b.bookingType as InvoiceData["kind"]) || "FLIGHT") as "FLIGHT" | "BUS" | "HOTEL";
  const f: FlightDataLike = b.flightData || {};
  const total = b.totalAmount || 0;
  let base: number;
  let taxes = b.taxes || 0;
  let pax = Math.max(1, b.adults + b.children);
  let infantTotal = 0; const infants = b.infants || 0;
  if (kind === "FLIGHT") {
    base = (b.baseFare || 0) * pax; taxes = (b.taxes || 0) * pax;
    infantTotal = Math.round(((b.baseFare || 0) + (b.taxes || 0)) * INFANT_FARE_RATE) * infants;
  }
  else if (kind === "HOTEL") { base = (b.baseFare || 0) * (f.nights || 1); }
  else { base = b.baseFare || 0; pax = b.adults || f.seatIds?.length || 1; } // BUS: stored base is full seats fare
  const addOns = b.addOns || 0;
  const serviceCharge = b.serviceCharge || 0;
  const gstTotal = (b.igst || 0) + (b.cgst || 0) + (b.sgst || 0);
  const convenience = Math.max(0, total - base - taxes - infantTotal - addOns - serviceCharge - gstTotal);
  const mealLabel = (id?: string | null) => MEALS.find((m) => m.id === id)?.label || id || undefined;
  const travellers = (b.passengers || []).map((p) => {
    const ssr = Array.isArray(p.ssr) ? p.ssr : [];
    if (ssr.length) {
      // Round-trip / multi-city: list the seat & meal for each flight (e.g. "Onward 12A, Return 4C").
      const seat = ssr.filter((s) => s.seat).map((s) => (s.label ? `${s.label} ${s.seat}` : `${s.seat}`)).join(", ");
      const meal = ssr.filter((s) => s.meal).map((s) => (s.label ? `${s.label} ${mealLabel(s.meal)}` : `${mealLabel(s.meal)}`)).join(", ");
      return { name: p.fullName || "Traveller", type: p.type, seat: seat || undefined, meal: meal || undefined };
    }
    return { name: p.fullName || "Traveller", type: p.type, seat: p.seat || p.seatId, meal: mealLabel(p.meal) };
  });

  let detailsTitle = "Flight Details";
  let detailLines: string[];
  if (kind === "BUS") {
    detailsTitle = "Bus Details";
    detailLines = [
      `<b>${f.operator || "-"}</b>`,
      `${f.busType || b.cabinClass}`,
      `${cityName(b.origin)} &rarr; ${cityName(b.destination)}`,
      `${formatDate(b.departDate)}${f.departTime ? ` &middot; ${formatTime(f.departTime)}` : ""}`,
      `Seats: ${(f.seatIds || []).join(", ") || "-"} &middot; ${pax} passenger${pax > 1 ? "s" : ""}`,
      `Boarding: ${f.boarding?.name || "-"}${f.boarding?.time ? ` (${f.boarding.time})` : ""}`,
    ];
  } else if (kind === "HOTEL") {
    detailsTitle = "Stay Details";
    detailLines = [
      `<b>${f.name || "-"}</b>`,
      `${f.area ? `${f.area}, ` : ""}${f.city || ""}`,
      `${f.roomName || b.cabinClass} &middot; ${f.nights || 1} night${(f.nights || 1) > 1 ? "s" : ""}`,
      `${f.checkIn || formatDate(b.departDate)} &rarr; ${f.checkOut || ""}`,
      `${f.rooms || 1} room${(f.rooms || 1) > 1 ? "s" : ""} &middot; ${pax} guest${pax > 1 ? "s" : ""}`,
    ];
  } else {
    detailLines = [
      `<b>${f.airlineName || "-"} ${f.flightNumber || ""}</b>`,
      `${cityName(b.origin)} (${b.origin}) &rarr; ${cityName(b.destination)} (${b.destination})`,
      `${formatDate(b.departDate)}${f.departTime ? ` &middot; ${formatTime(f.departTime)}` : ""}`,
      `${b.cabinClass} &middot; ${FARE_LABELS[b.fareType || ""] || b.fareType || "-"} &middot; ${pax} traveller${pax > 1 ? "s" : ""}`,
    ];
  }

  return {
    ref: b.bookingRef, pnr: b.pnr || "—", kind, detailsTitle, detailLines,
    name: b.passengers?.[0]?.fullName || "Guest", email: b.contactEmail, phone: b.contactPhone,
    billTo: b.billTo, brand: brandForBooking(b),
    dateLabel: formatDate(b.departDate), pax, travellers,
    base, taxes, infants, infantFare: infantTotal, addOns, convenience, total,
    serviceCharge, igst: b.igst || 0, cgst: b.cgst || 0, sgst: b.sgst || 0,
    invDate: formatDate(b.createdAt),
  };
}

/** Branded, print-ready HTML invoice (same design as the confirmation page). */
export function buildInvoiceHtml(d: InvoiceData, origin: string): string {
  const kind = d.kind || "FLIGHT";
  const unitWord = kind === "HOTEL" ? "guest" : kind === "BUS" ? "passenger" : "traveller";
  const rows = [
    ["Base fare", `× ${d.pax} ${unitWord}${d.pax > 1 ? "s" : ""}`, formatINR(d.base)],
    ["Taxes & fees", "", formatINR(d.taxes)],
    ...((d.infants || 0) > 0 ? [["Infant fare", `× ${d.infants}`, formatINR(d.infantFare || 0)]] : []),
    ...(d.addOns > 0 ? [["Add-ons", "", formatINR(d.addOns)]] : []),
    ...(d.convenience > 0 ? [["Convenience fee", "non-refundable", formatINR(d.convenience)]] : []),
    ...(d.serviceCharge && d.serviceCharge > 0 ? [["Service charge", "", formatINR(d.serviceCharge)]] : []),
    ...(d.igst && d.igst > 0 ? [["IGST", "", formatINR(d.igst)]] : []),
    ...(d.cgst && d.cgst > 0 ? [["CGST", "", formatINR(d.cgst)]] : []),
    ...(d.sgst && d.sgst > 0 ? [["SGST", "", formatINR(d.sgst)]] : []),
  ];
  const travellersBlock = d.travellers && d.travellers.length
    ? `<h3>${kind === "HOTEL" ? "Guests" : "Travellers"}</h3>
       <table>
         <tbody>${d.travellers.map((p, i) => {
           const extras = [p.seat ? `Seat ${p.seat}` : "", p.meal || ""].filter(Boolean).join(" &middot; ");
           return `<tr><td>${i + 1}. ${p.name}${p.type ? `<span class="s">${p.type}</span>` : ""}</td><td class="r">${extras || "&mdash;"}</td></tr>`;
         }).join("")}</tbody>
       </table>`
    : "";
  const detailsTitle = d.detailsTitle || (kind === "BUS" ? "Bus Details" : kind === "HOTEL" ? "Stay Details" : "Flight Details");
  const detailLines = d.detailLines || [
    `<b>${d.airline || "-"} ${d.flightNo || ""}</b>`,
    `${d.fromCity} (${d.fromCode}) &rarr; ${d.toCity} (${d.toCode})`,
    `${d.dateLabel}${d.timeLabel ? ` &middot; ${d.timeLabel}` : ""}`,
    `${d.cabin || "-"} &middot; ${d.fareLabel || "-"} &middot; ${d.pax} traveller${d.pax > 1 ? "s" : ""}`,
  ];
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${d.ref}</title>
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
        ${d.brand?.showLogo === false ? "" : `<img src="${origin}/logo.avif" alt="${d.brand?.name || "Tourist Leader"}"/>`}
        <div><div class="name">${d.brand?.name || "Tourist Leader"}</div><div class="sub">${d.brand?.lines?.length ? d.brand.lines.join(" &middot; ") : "Comfort before, during, and after take off"}</div></div>
      </div>
      <div class="meta">
        <div class="lbl">Invoice / Booking ID</div><div class="val">${d.ref}</div>
        <div class="lbl" style="margin-top:8px">${PNR_LABEL[kind]}</div><div class="val">${d.pnr}</div>
        <div class="paid">&#9679; PAID</div>
      </div>
    </div>
    <div class="body">
      <div class="cards">
        <div class="card"><h4>${d.billTo?.label || "Billed To"}</h4>
          <div class="line"><b>${d.billTo?.name || d.name}</b></div>
          ${
            d.billTo?.lines?.length
              ? d.billTo.lines.map((l) => `<div class="line">${l}</div>`).join("")
              : `${d.email ? `<div class="line">${d.email}</div>` : ""}${d.phone ? `<div class="line">${d.phone}</div>` : ""}`
          }
        </div>
        <div class="card"><h4>${detailsTitle}</h4>
          ${detailLines.map((l) => `<div class="line">${l}</div>`).join("")}
        </div>
      </div>
      ${travellersBlock}
      <h3>Fare Breakdown</h3>
      <table>
        <thead><tr><td>Description</td><td class="r">Amount</td></tr></thead>
        <tbody>${rows.map((r) => `<tr><td>${r[0]}<span class="s">${r[1]}</span></td><td class="r">${r[2]}</td></tr>`).join("")}</tbody>
      </table>
      <div class="total"><span class="t1">Total Paid (incl. GST)</span><span class="t2">${formatINR(d.total)}</span></div>
    </div>
    <div class="foot">
      Invoice date: ${d.invDate} &nbsp;&middot;&nbsp; This is a computer-generated invoice and does not require a signature.<br/>
      Convenience fee is non-refundable. For assistance, contact help@touristleader.com. &copy; ${new Date().getFullYear()} Tourist Leader.com
    </div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print()},350)}</script>
</body></html>`;
}

// Shared branded invoice CSS (matches buildInvoiceHtml / the confirmation invoice).
const INVOICE_CSS = `
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
  @media print{body{background:#fff;padding:0}.inv{box-shadow:none;border-radius:0}}`;

function invoiceHead(title: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${INVOICE_CSS}</style></head><body>`;
}
/**
 * Whose name heads a customer-facing document.
 *
 * For an agent booking the customer deals with the agency, not us, so the
 * agency's own name and contact lines go on top — the same white-label the
 * client sees on the e-tickets MakeMyTrip issues through them. Direct bookings
 * stay branded Tourist Leader.
 */
export interface DocBrand {
  name: string;
  lines?: string[];
  /** Agent documents drop our logo; it is not their brand. */
  showLogo: boolean;
}

export function brandForBooking(b: { billTo?: BillTo; bookedByAgentId?: string | null }): DocBrand {
  if (b.bookedByAgentId && b.billTo?.name) {
    // billTo.lines carry the agency address / GSTIN / phone / email.
    return { name: b.billTo.name, lines: b.billTo.lines, showLogo: false };
  }
  return { name: "Tourist Leader", showLogo: true };
}

function invoiceBrandTop(subtitle: string, metaRows: string, badge = "PAID", brand?: DocBrand) {
  const name = brand?.name || "Tourist Leader";
  const logo = (brand?.showLogo ?? true) ? `<img src="__ORIGIN__/logo.avif" alt="${name}"/>` : "";
  const sub = brand?.lines?.length ? `${brand.lines.join(" &middot; ")}<br/>${subtitle}` : subtitle;
  return `<div class="top">
      <div class="brand">
        ${logo}
        <div><div class="name">${name}</div><div class="sub">${sub}</div></div>
      </div>
      <div class="meta">${metaRows}<div class="paid">&#9679; ${badge}</div></div>
    </div>`;
}
const printScript = `<script>window.onload=function(){setTimeout(function(){window.print()},350)}</script></body></html>`;

/** Platform legal identity, passed in from the server (never read from env here). */
export interface InvoiceCompany {
  legalName: string;
  addressLines: string[];
  gstin: string;
  pan: string;
  cin: string;
  sac: string;
  serviceDescription: string;
  placeOfSupply: string;
  complete: boolean;
}

/**
 * GST tax invoice issued BY the platform TO the agent for a booking — the same
 * document MakeMyTrip issues to us when we book as their agent.
 *
 * This is distinct from `buildAgentB2BInvoiceHtml`, which is the agent's
 * *earnings* statement (what we owe them). This one is what the booking was
 * billed at, in the statutory format the agent files with their GST returns:
 * fare charges, handling, service fee, then GST — charged only on the fees we
 * levy, never on the airfare — and a separate base-fare/tax breakup.
 *
 * `company` must come from the server; the invoice prints a visible marker for
 * any statutory field that is still unconfigured.
 */
export function buildAgentTaxInvoiceHtml(b: BookingLike, origin: string, company: InvoiceCompany, invoiceNo: string): string {
  const d = buildInvoiceDataFromBooking(b);
  const kind = ((b.bookingType as InvoiceData["kind"]) || "FLIGHT") as "FLIGHT" | "BUS" | "HOTEL";
  // Airline portion only, so the tax breakup below reconciles to it exactly the
  // way MakeMyTrip's does. Add-ons (seats/meals/baggage) are billed separately.
  const fareCharges = d.base + d.taxes + (d.infantFare || 0);
  const addOns = d.addOns;
  const handling = d.convenience;
  const serviceFees = d.serviceCharge || 0;
  const gstRows = [
    ...(d.igst ? [["IGST @18%", formatINR(d.igst)]] : []),
    ...(d.cgst ? [["CGST @9%", formatINR(d.cgst)]] : []),
    ...(d.sgst ? [["SGST @9%", formatINR(d.sgst)]] : []),
  ];
  const agency = b.billTo;
  const pax = (d.travellers || []).length ? d.travellers! : [{ name: d.name }];

  const field = (label: string, value: string) =>
    `<div class="lbl">${label}</div><div class="val">${value || "—"}</div>`;

  return `${invoiceHead(`Tax Invoice ${invoiceNo}`)}
  <div class="inv">
    <div class="top">
      <div class="brand">
        <img src="${origin}/logo.avif" alt="${company.legalName}"/>
        <div><div class="name">TAX INVOICE</div><div class="sub">${company.legalName}<br/>${company.addressLines.join(", ")}</div></div>
      </div>
      <div class="meta">
        ${field("Invoice No.", invoiceNo)}
        ${field("Date", formatDate(b.createdAt))}
        <div class="paid">&#9679; TAX INVOICE</div>
      </div>
    </div>
    <div class="body">
      ${company.complete ? "" : `<div class="card" style="background:#fff7ed;border-color:#f59e0b;margin-bottom:12px"><div class="line"><b>This invoice is not yet compliant.</b> The company GSTIN / PAN / registered address are not configured, so the fields below show a placeholder. Set COMPANY_* in the environment before issuing this to an agent.</div></div>`}
      <div class="cards">
        <div class="card"><h4>Invoice details</h4>
          ${field("Booking ID", b.bookingRef)}
          ${field(PNR_LABEL[kind], b.pnr || "—")}
          ${field("Place of Supply", company.placeOfSupply)}
          ${field("Transactional Type/Category", "B2B/REG")}
        </div>
        <div class="card"><h4>Supplier</h4>
          ${field("PAN", company.pan)}
          ${field("GSTIN", company.gstin)}
          ${field("CIN", company.cin)}
          ${field("HSN/SAC", company.sac)}
          ${field("Service Description", company.serviceDescription)}
          ${field("Tax Payable under RCM", "No")}
        </div>
        <div class="card"><h4>${agency?.label || "Billed To (Agent)"}</h4>
          <div class="line"><b>${agency?.name || "Agent"}</b></div>
          ${(agency?.lines || []).map((l) => `<div class="line">${l}</div>`).join("")}
        </div>
      </div>

      <h3>${cityName(b.origin)} (${b.origin}) &rarr; ${cityName(b.destination)} (${b.destination}) &middot; ${formatDate(b.departDate)}</h3>
      <table>
        <thead><tr><td>Passenger Name(s)</td><td>Ticket No.</td><td class="r">${PNR_LABEL[kind]}</td></tr></thead>
        <tbody>${pax.map((p) => `<tr><td>${p.name}</td><td>${b.pnr || "—"}</td><td class="r">${b.pnr || "—"}</td></tr>`).join("")}</tbody>
      </table>

      <h3>Payment breakup</h3>
      <table>
        <tbody>
          <tr><td>Fare Charges<span class="s">including applicable taxes collected on behalf of the airline</span></td><td class="r">${formatINR(fareCharges)}</td></tr>
          ${addOns > 0 ? `<tr><td>Add-ons<span class="s">seats, meals, baggage</span></td><td class="r">${formatINR(addOns)}</td></tr>` : ""}
          ${handling > 0 ? `<tr><td>Transaction handling charges</td><td class="r">${formatINR(handling)}</td></tr>` : ""}
          ${serviceFees > 0 ? `<tr><td>Service Fees</td><td class="r">${formatINR(serviceFees)}</td></tr>` : ""}
          ${gstRows.map((r) => `<tr><td>${r[0]}</td><td class="r">${r[1]}</td></tr>`).join("")}
        </tbody>
      </table>
      <div class="total"><span class="t1">Grand Total</span><span class="t2">${formatINR(d.total)}</span></div>

      <h3>Tax breakup</h3>
      <table>
        <thead><tr><td>Tax Category</td><td class="r">Amount</td></tr></thead>
        <tbody>
          <tr><td>Total Base Fare</td><td class="r">${formatINR(d.base + (d.infantFare || 0))}</td></tr>
          <tr><td>Other Tax</td><td class="r">${formatINR(d.taxes)}</td></tr>
          <tr><td><b>Grand Total</b></td><td class="r"><b>${formatINR(fareCharges)}</b></td></tr>
        </tbody>
      </table>
    </div>
    <div class="foot">
      GST is charged only on the fees levied by ${company.legalName}; the airfare component carries taxes collected on behalf of the airline.
      Input tax credit of GST charged by the original service provider is available only against the invoice issued by that provider —
      ${company.legalName} acts as a facilitator for these services.<br/>
      This is not a valid travel document. System generated invoice; no signature required.<br/>
      &copy; ${new Date().getFullYear()} ${company.legalName}
    </div>
  </div>
  ${printScript}`;
}

/**
 * Agent-facing B2B / commission invoice for an agent booking: bills the agency and
 * lists the agent's own service charge + platform commission (+ GST) = their earnings.
 */
export function buildAgentB2BInvoiceHtml(b: BookingLike, origin: string): string {
  const kind = ((b.bookingType as InvoiceData["kind"]) || "FLIGHT") as "FLIGHT" | "BUS" | "HOTEL";
  const markup = b.agentMarkup || 0;
  const commission = b.commission || 0;
  const commissionGst = b.commissionGst || 0;
  const earnings = markup + commission + commissionGst;
  const rows = [
    ...(markup > 0 ? [["Agent service charge", "your markup on this booking", formatINR(markup)]] : []),
    ["Platform commission", "on the fare (excl. your markup)", formatINR(commission)],
    ...(commissionGst > 0 ? [["GST on commission", "", formatINR(commissionGst)]] : []),
  ];
  const meta = `<div class="lbl">Booking ID</div><div class="val">${b.bookingRef}</div>
    <div class="lbl" style="margin-top:8px">${PNR_LABEL[kind]}</div><div class="val">${b.pnr || "—"}</div>`;
  const agency = b.billTo;
  return `${invoiceHead(`Agent Invoice ${b.bookingRef}`)}
  <div class="inv">
    ${invoiceBrandTop("Agent B2B statement · commission &amp; service charge", meta, "B2B").replace("__ORIGIN__", origin)}
    <div class="body">
      <div class="cards">
        <div class="card"><h4>${agency?.label || "Agent"}</h4>
          <div class="line"><b>${agency?.name || "Agent"}</b></div>
          ${(agency?.lines || []).map((l) => `<div class="line">${l}</div>`).join("")}
        </div>
        <div class="card"><h4>Booking</h4>
          <div class="line"><b>${cityName(b.origin)} (${b.origin}) &rarr; ${cityName(b.destination)} (${b.destination})</b></div>
          <div class="line">${formatDate(b.departDate)} &middot; ${b.cabinClass}</div>
          <div class="line">${Math.max(1, b.adults + b.children)} traveller${Math.max(1, b.adults + b.children) > 1 ? "s" : ""} &middot; Booking total ${formatINR(b.totalAmount || 0)}</div>
        </div>
      </div>
      <h3>Your earnings on this booking</h3>
      <table>
        <thead><tr><td>Description</td><td class="r">Amount</td></tr></thead>
        <tbody>${rows.map((r) => `<tr><td>${r[0]}<span class="s">${r[1]}</span></td><td class="r">${r[2]}</td></tr>`).join("")}</tbody>
      </table>
      <div class="total"><span class="t1">Total credited to agent wallet</span><span class="t2">${formatINR(earnings)}</span></div>
    </div>
    <div class="foot">
      Invoice date: ${formatDate(b.createdAt)} &nbsp;&middot;&nbsp; B2B statement for the agent's records. Commission &amp; service charge are credited to the agent's Tourist Leader wallet and settled per the payout cycle.<br/>
      &copy; ${new Date().getFullYear()} Tourist Leader.com
    </div>
  </div>
  ${printScript}`;
}

/** A manual invoice created by an agent — arbitrary line items billed to any party. */
export interface ManualInvoiceInput {
  invoiceNo: string;
  invDate: string;
  billTo: { name: string; lines: string[] };
  reference?: string; // booking ref / PNR / note shown in the details card
  detailsTitle?: string;
  detailLines?: string[];
  items: { desc: string; note?: string; amount: number }[];
  extraLines?: { label: string; amount: number }[]; // service charge, GST, discount (negative)
  note?: string;
}

/** Branded, print-ready HTML for a manual invoice. */
export function buildManualInvoiceHtml(d: ManualInvoiceInput, origin: string): string {
  const subtotal = d.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const extras = d.extraLines || [];
  const total = subtotal + extras.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const itemRows = d.items.map((i) => `<tr><td>${i.desc || "Item"}<span class="s">${i.note || ""}</span></td><td class="r">${formatINR(i.amount)}</td></tr>`).join("");
  const extraRows = extras.map((e) => `<tr><td>${e.label}</td><td class="r">${formatINR(e.amount)}</td></tr>`).join("");
  const meta = `<div class="lbl">Invoice No.</div><div class="val">${d.invoiceNo}</div>
    ${d.reference ? `<div class="lbl" style="margin-top:8px">Reference</div><div class="val">${d.reference}</div>` : ""}`;
  const detailCard = d.detailLines && d.detailLines.length
    ? `<div class="card"><h4>${d.detailsTitle || "Details"}</h4>${d.detailLines.map((l) => `<div class="line">${l}</div>`).join("")}</div>`
    : "";
  return `${invoiceHead(`Invoice ${d.invoiceNo}`)}
  <div class="inv">
    ${invoiceBrandTop("Comfort before, during, and after take off", meta, "INVOICE").replace("__ORIGIN__", origin)}
    <div class="body">
      <div class="cards">
        <div class="card"><h4>Billed To</h4>
          <div class="line"><b>${d.billTo.name || "Customer"}</b></div>
          ${(d.billTo.lines || []).filter(Boolean).map((l) => `<div class="line">${l}</div>`).join("")}
        </div>
        ${detailCard}
      </div>
      <h3>Items</h3>
      <table>
        <thead><tr><td>Description</td><td class="r">Amount</td></tr></thead>
        <tbody>${itemRows}<tr><td><b>Subtotal</b></td><td class="r"><b>${formatINR(subtotal)}</b></td></tr>${extraRows}</tbody>
      </table>
      <div class="total"><span class="t1">Total</span><span class="t2">${formatINR(total)}</span></div>
    </div>
    <div class="foot">
      Invoice date: ${d.invDate} &nbsp;&middot;&nbsp; ${d.note ? d.note + " &middot; " : ""}Computer-generated invoice; no signature required. &copy; ${new Date().getFullYear()} Tourist Leader.com
    </div>
  </div>
  ${printScript}`;
}

export function openInvoice(html: string, ref: string) {
  const w = window.open("", "_blank", "width=820,height=960");
  if (w) {
    w.document.write(html);
    w.document.close();
    return true;
  }
  // popup blocked → download
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Tourist Leader-Invoice-${ref}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return false;
}

export async function shareBooking(text: string, onCopied: () => void) {
  const url = typeof window !== "undefined" ? window.location.origin : "";
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: "Tourist Leader Booking", text, url });
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      onCopied();
    }
  } catch {
    /* user cancelled */
  }
}
