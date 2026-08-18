"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Check, IndianRupee, Percent, Building2, Receipt, Users as UsersIcon, PanelTop } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { INDIAN_STATES } from "@/lib/states";
import { quoteBooking, computeCommission, gstLabel, type BillingConfigData, DEFAULT_BILLING } from "@/lib/billing-core";
import { formatINR, cn } from "@/lib/utils";

export default function AdminSettingsPage() {
  const [cfg, setCfg] = useState<BillingConfigData>(DEFAULT_BILLING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof BillingConfigData>(k: K, v: BillingConfigData[K]) => setCfg((c) => ({ ...c, [k]: v }));

  // Header navigation toggles (front-end links)
  const [site, setSite] = useState({ showListProperty: false, showTlBiz: false });
  const [savingSite, setSavingSite] = useState(false);
  const [savedSite, setSavedSite] = useState(false);

  useEffect(() => {
    fetch("/api/admin/billing", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (d.config) setCfg(d.config); }).finally(() => setLoading(false));
    fetch("/api/site-config", { cache: "no-store" }).then((r) => r.json()).then((d) => setSite({ showListProperty: !!d.showListProperty, showTlBiz: !!d.showTlBiz })).catch(() => {});
  }, []);

  const saveSite = async (next: { showListProperty: boolean; showTlBiz: boolean }) => {
    setSite(next); setSavingSite(true); setSavedSite(false);
    const res = await fetch("/api/site-config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
    setSavingSite(false);
    if (res.ok) { setSavedSite(true); setTimeout(() => setSavedSite(false), 2000); }
  };

  const save = async () => {
    setSaving(true); setSaved(false);
    const res = await fetch("/api/admin/billing", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg) });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  // live preview on a ₹10,000 booking
  const sample = 10000;
  const previewInState = useMemo(() => quoteBooking(sample, cfg.companyState, cfg), [cfg]);
  const previewOutState = useMemo(() => quoteBooking(sample, "Maharashtra", cfg), [cfg]);
  const commission = useMemo(() => computeCommission(sample, cfg.companyState, cfg), [cfg]);

  return (
    <AdminShell title="Settings">
      {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div> : (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            {/* Service charge */}
            <Card icon={Receipt} title="Service charge" sub="Added to every booking (customer & agent), on top of existing fees.">
              <div className="grid gap-3 sm:grid-cols-2">
                <L label="Charge type">
                  <div className="flex gap-2">
                    {(["FLAT", "PERCENT"] as const).map((t) => (
                      <button key={t} onClick={() => set("serviceChargeType", t)} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold", cfg.serviceChargeType === t ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-600")}>
                        {t === "FLAT" ? <><IndianRupee size={14} /> Flat ₹ / pax</> : <><Percent size={14} /> % of total</>}
                      </button>
                    ))}
                  </div>
                </L>
                <L label={cfg.serviceChargeType === "FLAT" ? "Amount (₹ per passenger)" : "Percent (%) of total"}>
                  <input type="number" min={0} step={cfg.serviceChargeType === "FLAT" ? 1 : 0.1} value={cfg.serviceChargeValue} onChange={(e) => set("serviceChargeValue", Number(e.target.value))} className="inp" />
                </L>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {cfg.serviceChargeType === "FLAT"
                  ? <><b>Flat</b> — charged <b>per passenger</b>. e.g. ₹{cfg.serviceChargeValue || 0} × 2 passengers = {formatINR((cfg.serviceChargeValue || 0) * 2)}.</>
                  : <><b>Percent</b> — {cfg.serviceChargeValue || 0}% of the <b>total</b> booking amount.</>}
              </p>
            </Card>

            {/* GST */}
            <Card icon={Building2} title="GST (place of supply)" sub="Same state as company → CGST + SGST. Other state → IGST.">
              <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={cfg.gstEnabled} onChange={(e) => set("gstEnabled", e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" /> Apply GST on service charge & commission
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <L label="Company / onboarding state">
                  <select value={cfg.companyState} onChange={(e) => set("companyState", e.target.value)} className="inp">
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </L>
                <L label="IGST rate (%)"><input type="number" min={0} value={cfg.igstRate} onChange={(e) => set("igstRate", Number(e.target.value))} className="inp" /></L>
                <L label="CGST rate (%)"><input type="number" min={0} value={cfg.cgstRate} onChange={(e) => set("cgstRate", Number(e.target.value))} className="inp" /></L>
                <L label="SGST rate (%)"><input type="number" min={0} value={cfg.sgstRate} onChange={(e) => set("sgstRate", Number(e.target.value))} className="inp" /></L>
              </div>
            </Card>

            {/* Agent commission */}
            <Card icon={UsersIcon} title="Agent commission" sub="Earned by agents on their bookings, credited to their wallet.">
              <div className="grid gap-3 sm:grid-cols-2">
                <L label="Commission (% of booking)"><input type="number" min={0} step={0.1} value={cfg.agentCommissionPercent} onChange={(e) => set("agentCommissionPercent", Number(e.target.value))} className="inp" /></L>
                <L label="GST on commission">
                  <label className="flex h-[38px] cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" checked={cfg.commissionGstApplicable} onChange={(e) => set("commissionGstApplicable", e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" /> Apply GST
                  </label>
                </L>
              </div>
            </Card>

            {/* Header navigation links */}
            <Card icon={PanelTop} title="Header navigation links" sub="Show or hide the partner links in the site header. When hidden, 'Book Your Flights' & 'Book Your Hotels' are shown instead.">
              <div className="space-y-2">
                <Toggle
                  label="List Your Property"
                  sub={site.showListProperty ? "Visible in header" : "Hidden — showing 'Book Your Flights'"}
                  on={site.showListProperty}
                  onToggle={() => saveSite({ ...site, showListProperty: !site.showListProperty })}
                />
                <Toggle
                  label="TL Biz"
                  sub={site.showTlBiz ? "Visible in header" : "Hidden — showing 'Book Your Hotels'"}
                  on={site.showTlBiz}
                  onToggle={() => saveSite({ ...site, showTlBiz: !site.showTlBiz })}
                />
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                {savingSite ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : savedSite ? <><Check size={13} className="text-emerald-600" /> Saved — applies on next page load</> : "Toggle anytime; changes save automatically."}
              </p>
            </Card>

            <div className="sticky bottom-0 flex items-center gap-3 border-t border-slate-200 bg-slate-100/80 py-3 backdrop-blur">
              <Button onClick={save} disabled={saving} className="px-8">{saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : saved ? <><Check size={16} /> Saved</> : <><Save size={16} /> Save settings</>}</Button>
              <p className="text-xs text-slate-400">Changes apply to new bookings immediately.</p>
            </div>
          </div>

          {/* Live preview */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <h3 className="font-bold text-slate-900">Preview · ₹10,000 booking</h3>
              <Preview title={`Customer in ${cfg.companyState}`} q={previewInState} cfg={cfg} />
              <Preview title="Customer in another state" q={previewOutState} cfg={cfg} />
              <div className="mt-3 border-t border-dashed border-slate-200 pt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Agent commission</p>
                <Row label={`Commission (${cfg.agentCommissionPercent}%)`} value={formatINR(commission.commission)} />
                {commission.gst.total > 0 && <Row label={gstLabel(commission.gst, cfg)} value={formatINR(commission.gst.total)} />}
                <Row label="Credited to wallet" value={formatINR(commission.credit)} strong />
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`.inp{width:100%;border:1px solid #e2e8f0;border-radius:0.6rem;padding:0.5rem 0.7rem;font-size:0.875rem;outline:none}.inp:focus{border-color:var(--brand)}`}</style>
    </AdminShell>
  );
}

function Preview({ title, q, cfg }: { title: string; q: ReturnType<typeof quoteBooking>; cfg: BillingConfigData }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
      <Row label="Service charge" value={formatINR(q.serviceCharge)} />
      {q.gst.type === "IGST" && <Row label={gstLabel(q.gst, cfg)} value={formatINR(q.gst.igst)} />}
      {q.gst.type === "CGST_SGST" && <><Row label={`CGST (${cfg.cgstRate}%)`} value={formatINR(q.gst.cgst)} /><Row label={`SGST (${cfg.sgstRate}%)`} value={formatINR(q.gst.sgst)} /></>}
      <Row label="Added to total" value={formatINR(q.addon)} strong />
    </div>
  );
}
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={cn("flex items-center justify-between py-0.5 text-sm", strong ? "font-bold text-slate-900" : "text-slate-600")}><span>{label}</span><span>{value}</span></div>;
}
function Card({ icon: Icon, title, sub, children }: { icon: React.ElementType; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><Icon size={18} /></span>
        <div><h2 className="font-bold text-slate-900">{title}</h2><p className="text-xs text-slate-500">{sub}</p></div>
      </div>
      {children}
    </div>
  );
}
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}
function Toggle({ label, sub, on, onToggle }: { label: string; sub: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="truncate text-xs text-slate-500">{sub}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-brand" : "bg-slate-300")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}
