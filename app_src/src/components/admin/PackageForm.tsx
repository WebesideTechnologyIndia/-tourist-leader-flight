"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Save, AlertCircle, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { PACKAGE_CATEGORIES, type Package } from "@/lib/packages";
import { cn } from "@/lib/utils";

const IMAGE_OPTIONS = [
  "/packages/vietnam.jpg", "/packages/bali.jpg", "/packages/thailand.jpg", "/packages/maldives.jpg",
  "/packages/dubai.jpg", "/packages/europe.jpg", "/destinations/goa.jpg", "/destinations/jaipur.jpg", "/destinations/singapore.jpg",
];

const linesToArr = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const arrToLines = (a?: string[]) => (a || []).join("\n");

interface DayForm { title: string; summary: string; points: string }

export function PackageForm({ initial }: { initial?: Package | null }) {
  const router = useRouter();
  const [f, setF] = useState({
    slug: initial?.slug || "", title: initial?.title || "", destination: initial?.destination || "", country: initial?.country || "",
    image: initial?.image || IMAGE_OPTIONS[0], nights: initial?.nights ?? 4, days: initial?.days ?? 5,
    priceINR: initial?.priceINR ?? 0, priceUSD: initial?.priceUSD ?? "", rating: initial?.rating ?? 4.6, reviews: initial?.reviews ?? 0,
    bestTime: initial?.bestTime || "", overview: initial?.overview || "", published: true,
    themes: arrToLines(initial?.themes), highlights: arrToLines(initial?.highlights),
    inclusions: arrToLines(initial?.inclusions), exclusions: arrToLines(initial?.exclusions),
    paymentPolicy: arrToLines(initial?.paymentPolicy), cancellationPolicy: arrToLines(initial?.cancellationPolicy), childPolicy: arrToLines(initial?.childPolicy),
  });
  const [categories, setCategories] = useState<string[]>(initial?.categories || ["BEACH"]);
  const [itinerary, setItinerary] = useState<DayForm[]>(
    initial?.itinerary?.length
      ? initial.itinerary.map((d) => ({ title: d.title, summary: d.summary || "", points: arrToLines(d.points) }))
      : [{ title: "", summary: "", points: "" }]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const toggleCat = (id: string) => setCategories((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);
  const setDay = (i: number, patch: Partial<DayForm>) => setItinerary((d) => d.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const addDay = () => setItinerary((d) => [...d, { title: "", summary: "", points: "" }]);
  const removeDay = (i: number) => setItinerary((d) => d.filter((_, idx) => idx !== i));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!f.title.trim()) { setError("Title is required"); return; }
    if (!f.overview.trim()) { setError("Overview is required"); return; }
    setLoading(true);
    const payload = {
      ...f, priceUSD: f.priceUSD === "" ? null : Number(f.priceUSD),
      categories, themes: linesToArr(f.themes), highlights: linesToArr(f.highlights),
      inclusions: linesToArr(f.inclusions), exclusions: linesToArr(f.exclusions),
      paymentPolicy: linesToArr(f.paymentPolicy), cancellationPolicy: linesToArr(f.cancellationPolicy), childPolicy: linesToArr(f.childPolicy),
      itinerary: itinerary.filter((d) => d.title.trim()).map((d, i) => ({ day: i + 1, title: d.title.trim(), summary: d.summary.trim(), points: linesToArr(d.points) })),
    };
    try {
      const res = await fetch("/api/admin/packages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok && data.slug) router.push("/admin/packages");
      else setError(data.error || "Could not save package");
    } catch { setError("Network error"); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Basics */}
      <Card title="Basics">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title *"><input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Phu Quoc Island Escape" className="ainp" /></Field>
          <Field label="Slug (auto)"><input value={f.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto from title" className="ainp" /></Field>
          <Field label="Destination *"><input value={f.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Phu Quoc, Vietnam" className="ainp" /></Field>
          <Field label="Country *"><input value={f.country} onChange={(e) => set("country", e.target.value)} placeholder="Vietnam" className="ainp" /></Field>
          <Field label="Nights"><input type="number" min={0} value={f.nights} onChange={(e) => set("nights", Number(e.target.value))} className="ainp" /></Field>
          <Field label="Days"><input type="number" min={0} value={f.days} onChange={(e) => set("days", Number(e.target.value))} className="ainp" /></Field>
          <Field label="Price ₹ / person *"><input type="number" min={0} value={f.priceINR} onChange={(e) => set("priceINR", Number(e.target.value))} className="ainp" /></Field>
          <Field label="Price $ / person (optional)"><input type="number" min={0} value={f.priceUSD} onChange={(e) => set("priceUSD", e.target.value)} className="ainp" /></Field>
          <Field label="Rating"><input type="number" step="0.1" min={0} max={5} value={f.rating} onChange={(e) => set("rating", Number(e.target.value))} className="ainp" /></Field>
          <Field label="Reviews"><input type="number" min={0} value={f.reviews} onChange={(e) => set("reviews", Number(e.target.value))} className="ainp" /></Field>
          <Field label="Best time"><input value={f.bestTime} onChange={(e) => set("bestTime", e.target.value)} placeholder="Nov – Apr" className="ainp" /></Field>
        </div>
        <Field label="Cover image" className="mt-3">
          <ImageUpload value={f.image} onChange={(url) => set("image", url)} folder="packages" presets={IMAGE_OPTIONS} />
        </Field>
        <Field label="Overview *" className="mt-3"><textarea value={f.overview} onChange={(e) => set("overview", e.target.value)} rows={3} placeholder="Short description of the package…" className="ainp resize-none" /></Field>
      </Card>

      {/* Categories + themes */}
      <Card title="Categories & Themes">
        <p className="mb-2 text-xs font-semibold text-slate-600">Categories</p>
        <div className="flex flex-wrap gap-2">
          {PACKAGE_CATEGORIES.filter((c) => c.id !== "ALL").map((c) => (
            <button type="button" key={c.id} onClick={() => toggleCat(c.id)} className={cn("rounded-lg border px-3 py-1.5 text-xs font-semibold", categories.includes(c.id) ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-600")}>{c.label}</button>
          ))}
        </div>
        <Field label="Themes (one per line)" className="mt-3"><textarea value={f.themes} onChange={(e) => set("themes", e.target.value)} rows={3} placeholder={"Islands\nWater Parks\nSightseeing"} className="ainp resize-none" /></Field>
        <Field label="Highlights (one per line)" className="mt-3"><textarea value={f.highlights} onChange={(e) => set("highlights", e.target.value)} rows={4} placeholder={"4 Nights stay with breakfast\nIsland tour + cable car"} className="ainp resize-none" /></Field>
      </Card>

      {/* Itinerary */}
      <Card title="Day-wise Itinerary" action={<Button type="button" size="sm" variant="soft" onClick={addDay}><Plus size={14} /> Add Day</Button>}>
        <div className="space-y-3">
          {itinerary.map((d, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">D{i + 1}</span>
                <GripVertical size={14} className="text-slate-300" />
                <input value={d.title} onChange={(e) => setDay(i, { title: e.target.value })} placeholder="Day title (e.g. Arrive in Phu Quoc)" className="ainp flex-1" />
                {itinerary.length > 1 && <button type="button" onClick={() => removeDay(i)} className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 size={15} /></button>}
              </div>
              <input value={d.summary} onChange={(e) => setDay(i, { summary: e.target.value })} placeholder="Short summary (optional)" className="ainp mb-2" />
              <textarea value={d.points} onChange={(e) => setDay(i, { points: e.target.value })} rows={3} placeholder={"Itinerary points (one per line)\n08:15: Pick up at hotel\nLunch on the island"} className="ainp resize-none" />
            </div>
          ))}
        </div>
      </Card>

      {/* Inclusions / Exclusions */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Card title="Inclusions"><textarea value={f.inclusions} onChange={(e) => set("inclusions", e.target.value)} rows={6} placeholder="One per line" className="ainp resize-none" /></Card>
        <Card title="Exclusions"><textarea value={f.exclusions} onChange={(e) => set("exclusions", e.target.value)} rows={6} placeholder="One per line" className="ainp resize-none" /></Card>
      </div>

      {/* Policies */}
      <Card title="Payment Policy"><textarea value={f.paymentPolicy} onChange={(e) => set("paymentPolicy", e.target.value)} rows={3} placeholder="One per line" className="ainp resize-none" /></Card>
      <Card title="Cancellation Policy"><textarea value={f.cancellationPolicy} onChange={(e) => set("cancellationPolicy", e.target.value)} rows={4} placeholder="One per line" className="ainp resize-none" /></Card>
      <Card title="Child Policy"><textarea value={f.childPolicy} onChange={(e) => set("childPolicy", e.target.value)} rows={4} placeholder="One per line" className="ainp resize-none" /></Card>

      <Card title="Visibility">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={f.published} onChange={(e) => set("published", e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" /> Published (visible on the site)
        </label>
      </Card>

      {error && <p className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600"><AlertCircle size={14} /> {error}</p>}

      <div className="sticky bottom-0 flex items-center gap-2 border-t border-slate-200 bg-white/90 py-3 backdrop-blur">
        <Button type="submit" disabled={loading} className="px-8">{loading ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Save size={16} /> Save Package</>}</Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/packages")}>Cancel</Button>
      </div>
      <style>{`.ainp{width:100%;border:1px solid #e2e8f0;border-radius:0.6rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none}.ainp:focus{border-color:var(--brand)}`}</style>
    </form>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-slate-900">{title}</h2>{action}</div>
      {children}
    </div>
  );
}
function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={cn("block", className)}><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}
