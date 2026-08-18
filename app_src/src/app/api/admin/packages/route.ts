import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { DEMO_PACKAGES } from "@/lib/packages";

export const dynamic = "force-dynamic";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

/** List all packages (DB rows + demo, for the admin table). */
export async function GET() {
  const { ok } = await isAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await prisma.package.findMany({ orderBy: { updatedAt: "desc" } });
  const dbSlugs = new Set(rows.map((r) => r.slug));
  const demo = DEMO_PACKAGES.filter((p) => !dbSlugs.has(p.slug)).map((p) => ({ ...p, _demo: true }));
  return NextResponse.json({ packages: [...rows.map((r) => ({ ...r, _demo: false })), ...demo] });
}

function clean(b: Record<string, unknown>) {
  const asArr = (v: unknown): string[] => Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
  return {
    slug: slugify(String(b.slug || b.title || "")) || `pkg-${Date.now()}`,
    title: String(b.title || "").trim(),
    destination: String(b.destination || "").trim(),
    country: String(b.country || "").trim(),
    nights: Number(b.nights || 0),
    days: Number(b.days || 0),
    image: String(b.image || "/packages/bali.jpg").trim(),
    priceINR: Number(b.priceINR || 0),
    priceUSD: b.priceUSD ? Number(b.priceUSD) : null,
    rating: Number(b.rating || 4.5),
    reviews: Number(b.reviews || 0),
    bestTime: String(b.bestTime || "").trim() || null,
    overview: String(b.overview || "").trim(),
    categories: asArr(b.categories),
    themes: asArr(b.themes),
    highlights: asArr(b.highlights),
    itinerary: Array.isArray(b.itinerary) ? b.itinerary : [],
    inclusions: asArr(b.inclusions),
    exclusions: asArr(b.exclusions),
    paymentPolicy: asArr(b.paymentPolicy),
    cancellationPolicy: asArr(b.cancellationPolicy),
    childPolicy: asArr(b.childPolicy),
    published: b.published !== false,
  };
}

export async function POST(req: NextRequest) {
  const { ok } = await isAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await req.json();
    const data = clean(body);
    if (!data.title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!data.overview) return NextResponse.json({ error: "Overview is required" }, { status: 400 });

    const existing = await prisma.package.findUnique({ where: { slug: data.slug } });
    const saved = existing
      ? await prisma.package.update({ where: { slug: data.slug }, data })
      : await prisma.package.create({ data });
    return NextResponse.json({ package: saved, slug: saved.slug });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { ok } = await isAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    await prisma.package.deleteMany({ where: { slug } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
