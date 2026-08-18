"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, FileText, Search, FilePlus2, ReceiptText } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { useBilling } from "@/lib/useBilling";
import { buildManualInvoiceHtml, buildInvoiceDataFromBooking, openInvoice, type BookingLike, type ManualInvoiceInput } from "@/lib/invoice";
import { formatINR, formatDate, cn } from "@/lib/utils";

type Mode = "blank" | "booking";
type GstMode = "NONE" | "IGST" | "CGST_SGST";
interface Item { desc: string; amount: number }
interface Booking extends BookingLike { id: string }

function invoiceNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MI-${ymd}-${rand}`;
}

export default function ManualInvoicePage() {
  const { config } = useBilling();
  const [mode, setMode] = useState<Mode>("blank");

  // shared invoice fields
  const [billName, setBillName] = useState("");
  const [billLines, setBillLines] = useState(""); // one detail per line (email, phone, GSTIN, address)
  const [reference, setReference] = useState("");
  const [items, setItems] = useState<Item[]>([{ desc: "", amount: 0 }]);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [gstMode, setGstMode] = useState<GstMode>("NONE");
  const [detailsTitle, setDetailsTitle] = useState("");
  const [detailLines, setDetailLines] = useState("");

  // from-booking picker
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingB, setLoadingB] = useState(false);
  const [q, setQ] = useState("");
  const [pickedId, setPickedId] = useState("");

  useEffect(() => {
    if (mode !== "booking" || bookings.length) return;
    setLoadingB(true);
    fetch("/api/admin/bookings", { cache: "no-store" }).then((r) => r.json()).then((d) => setBookings(d.bookings || [])).finally(() => setLoadingB(false));
  }, [mode, bookings.length]);

  const setItem = (i: number, patch: Partial<Item>) => setItems((it) => it.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addItem = () => setItems((it) => [...it, { desc: "", amount: 0 }]);
  const removeItem = (i: number) => setItems((it) => (it.length <= 1 ? it : it.filter((_, idx) => idx !== i)));

  const subtotal = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const taxable = subtotal + (Number(serviceCharge) || 0);
  const gst = useMemo(() => {
    if (gstMode === "IGST") return { igst: Math.round((taxable * config.igstRate) / 100), cgst: 0, sgst: 0 };
    if (gstMode === "CGST_SGST") return { igst: 0, cgst: Math.round((taxable * config.cgstRate) / 100), sgst: Math.round((taxable * config.sgstRate) / 100) };
    return { igst: 0, cgst: 0, sgst: 0 };
  }, [gstMode, taxable, config]);
  const total = taxable + gst.igst + gst.cgst + gst.sgst;

  // Prefill everything from a chosen booking (editable afterwards).
  const prefillFromBooking = (b: Booking) => {
    setPickedId(b.id);
    const d = buildInvoiceDataFromBooking(b);
    setBillName(d.billTo?.name || d.name || "Customer");
    setBillLines((d.billTo?.lines || [d.email, d.phone].filter(Boolean) as string[]).join("\n"));
    setReference(`${b.bookingRef}${b.pnr ? ` · ${b.pnr}` : ""}`);
    setDetailsTitle(d.detailsTitle || "Details");
    setDetailLines((d.detailLines || []).join("\n"));
    const next: Item[] = [
      { desc: `Base fare (× ${d.pax})`, amount: d.base },
      { desc: "Taxes & fees", amount: d.taxes },
      ...((d.infantFare || 0) > 0 ? [{ desc: `Infant fare × ${d.infants}`, amount: d.infantFare || 0 }] : []),
      ...(d.addOns > 0 ? [{ desc: "Add-ons (seats / meals)", amount: d.addOns }] : []),
      ...(d.convenience > 0 ? [{ desc: "Convenience fee", amount: d.convenience }] : []),
    ];
    setItems(next.length ? next : [{ desc: "", amount: 0 }]);
    setServiceCharge(d.serviceCharge || 0);
    setGstMode(d.igst ? "IGST" : d.cgst || d.sgst ? "CGST_SGST" : "NONE");
  };

  const generate = () => {
    const extraLines: { label: string; amount: number }[] = [];
    if (serviceCharge > 0) extraLines.push({ label: "Service charge", amount: serviceCharge });
    if (gst.igst > 0) extraLines.push({ label: `IGST (${config.igstRate}%)`, amount: gst.igst });
    if (gst.cgst > 0) extraLines.push({ label: `CGST (${config.cgstRate}%)`, amount: gst.cgst });
    if (gst.sgst > 0) extraLines.push({ label: `SGST (${config.sgstRate}%)`, amount: gst.sgst });
    const data: ManualInvoiceInput = {
      invoiceNo: invoiceNo(),
      invDate: formatDate(new Date()),
      billTo: { name: billName || "Customer", lines: billLines.split("\n").map((l) => l.trim()).filter(Boolean) },
      reference: reference || undefined,
      detailsTitle: detailsTitle || undefined,
      detailLines: detailLines.split("\n").map((l) => l.trim()).filter(Boolean),
      items: items.filter((i) => i.desc || i.amount).map((i) => ({ desc: i.desc, amount: Number(i.amount) || 0 })),
      extraLines,
    };
    openInvoice(buildManualInvoiceHtml(data, window.location.origin), data.invoiceNo);
  };

  const filteredBookings = bookings.filter((b) => {
    const s = q.toLowerCase().trim();
    return !s || `${b.bookingRef} ${b.pnr} ${b.contactEmail} ${b.origin} ${b.destination}`.toLowerCase().includes(s);
  });

  return (
    <AdminShell title="Manual Invoices">
      <p className="mb-4 max-w-2xl text-sm text-slate-500">Create a branded invoice for a customer — start from scratch or from an existing booking, edit the lines, then print or save as PDF.</p>

      <div className="mb-4 flex gap-2">
        {([["blank", "New (blank)", FilePlus2], ["booking", "From a booking", ReceiptText]] as const).map(([m, label, Icon]) => (
          <button key={m} onClick={() => setMode(m)} className={cn("flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ring-1", mode === m ? "bg-brand text-white ring-brand" : "bg-white text-slate-600 ring-slate-200")}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {mode === "booking" && (
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <Search size={15} className="text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search booking ref, email, route…" className="w-full bg-transparent text-sm outline-none" />
              </div>
              {loadingB ? <div className="flex justify-center py-6 text-slate-400"><Loader2 className="animate-spin" size={18} /></div> : (
                <div className="max-h-56 space-y-1.5 overflow-y-auto">
                  {filteredBookings.slice(0, 40).map((b) => (
                    <button key={b.id} onClick={() => prefillFromBooking(b)} className={cn("flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm", pickedId === b.id ? "border-brand bg-brand/5" : "border-slate-200 hover:bg-slate-50")}>
                      <span><span className="font-semibold text-slate-800">{b.bookingRef}</span> <span className="text-xs text-slate-400">{b.origin}→{b.destination} · {formatDate(b.departDate)}</span></span>
                      <span className="text-xs font-semibold text-slate-600">{formatINR(b.totalAmount)}</span>
                    </button>
                  ))}
                  {filteredBookings.length === 0 && <p className="py-4 text-center text-xs text-slate-400">No bookings found.</p>}
                </div>
              )}
            </div>
          )}

          {/* Bill To */}
          <Section title="Billed To">
            <div className="grid gap-3 sm:grid-cols-2">
              <L label="Name"><input value={billName} onChange={(e) => setBillName(e.target.value)} className="inp" placeholder="Customer / company name" /></L>
              <L label="Reference (optional)"><input value={reference} onChange={(e) => setReference(e.target.value)} className="inp" placeholder="Booking ref / PNR / PO" /></L>
            </div>
            <L label="Address / Email / Phone / GSTIN (one per line)"><textarea value={billLines} onChange={(e) => setBillLines(e.target.value)} rows={3} className="inp" placeholder={"you@email.com\n+91 98xxxxxxx\nGSTIN: 29ABCDE1234F1Z5"} /></L>
          </Section>

          {/* Items */}
          <Section title="Line items">
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={it.desc} onChange={(e) => setItem(i, { desc: e.target.value })} placeholder="Description (e.g. Air fare DEL–BOM)" className="inp flex-1" />
                  <div className="flex items-center gap-1 rounded-xl border border-slate-200 px-2 focus-within:border-brand">
                    <span className="text-slate-400">₹</span>
                    <input type="number" value={it.amount || ""} onChange={(e) => setItem(i, { amount: Number(e.target.value) })} placeholder="0" className="w-24 bg-transparent py-2 text-sm outline-none" />
                  </div>
                  <button onClick={() => removeItem(i)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            <button onClick={addItem} className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"><Plus size={15} /> Add item</button>
          </Section>

          {/* Charges */}
          <Section title="Charges & GST">
            <div className="grid gap-3 sm:grid-cols-2">
              <L label="Service charge (₹)"><input type="number" value={serviceCharge || ""} onChange={(e) => setServiceCharge(Number(e.target.value))} className="inp" placeholder="0" /></L>
              <L label="GST (place of supply)">
                <select value={gstMode} onChange={(e) => setGstMode(e.target.value as GstMode)} className="inp">
                  <option value="NONE">No GST</option>
                  <option value="IGST">IGST ({config.igstRate}%) · other state</option>
                  <option value="CGST_SGST">CGST + SGST ({config.cgstRate + config.sgstRate}%) · same state</option>
                </select>
              </L>
            </div>
            <p className="mt-1 text-xs text-slate-400">GST is applied on items subtotal + service charge.</p>
          </Section>
        </div>

        {/* Preview / total */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <h3 className="font-bold text-slate-900">Invoice total</h3>
            <div className="mt-3 space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatINR(subtotal)} />
              {serviceCharge > 0 && <Row label="Service charge" value={formatINR(serviceCharge)} />}
              {gst.igst > 0 && <Row label={`IGST (${config.igstRate}%)`} value={formatINR(gst.igst)} />}
              {gst.cgst > 0 && <Row label={`CGST (${config.cgstRate}%)`} value={formatINR(gst.cgst)} />}
              {gst.sgst > 0 && <Row label={`SGST (${config.sgstRate}%)`} value={formatINR(gst.sgst)} />}
              <div className="my-1 border-t border-dashed border-slate-200" />
              <Row label={<span className="font-bold text-slate-900">Total</span>} value={<span className="text-lg font-extrabold text-slate-900">{formatINR(total)}</span>} />
            </div>
            <Button className="mt-4 w-full" onClick={generate} disabled={subtotal <= 0 || !billName.trim()}><FileText size={16} /> Generate invoice</Button>
            <p className="mt-2 text-[11px] text-slate-400">Opens a print-ready invoice you can save as PDF or print.</p>
          </div>
        </div>
      </div>
      <style>{`.inp{width:100%;border:1px solid #e2e8f0;border-radius:0.6rem;padding:0.5rem 0.7rem;font-size:0.875rem;outline:none}.inp:focus{border-color:var(--brand)}`}</style>
    </AdminShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <h2 className="mb-3 font-bold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mt-3 block first:mt-0"><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}
function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return <div className="flex items-center justify-between text-slate-600"><span>{label}</span><span className="font-semibold text-slate-800">{value}</span></div>;
}
