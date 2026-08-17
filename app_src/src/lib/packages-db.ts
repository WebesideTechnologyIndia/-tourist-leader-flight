import { prisma } from "./prisma";
import { DEMO_PACKAGES, type Package, type ItineraryDay } from "./packages";

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToPackage(r: any): Package {
  const arr = (v: any): string[] => (Array.isArray(v) ? v : []);
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    destination: r.destination,
    country: r.country,
    nights: r.nights,
    days: r.days,
    image: r.image,
    priceINR: r.priceINR,
    priceUSD: r.priceUSD ?? undefined,
    rating: r.rating,
    reviews: r.reviews,
    bestTime: r.bestTime || "",
    overview: r.overview,
    categories: arr(r.categories),
    themes: arr(r.themes),
    highlights: arr(r.highlights),
    itinerary: (Array.isArray(r.itinerary) ? r.itinerary : []) as ItineraryDay[],
    inclusions: arr(r.inclusions),
    exclusions: arr(r.exclusions),
    paymentPolicy: arr(r.paymentPolicy),
    cancellationPolicy: arr(r.cancellationPolicy),
    childPolicy: arr(r.childPolicy),
  };
}

/** All packages: DB (published) override/extend the built-in demo set by slug. */
export async function getAllPackages(): Promise<Package[]> {
  try {
    const rows = await prisma.package.findMany({ where: { published: true }, orderBy: { createdAt: "desc" } });
    const db = rows.map(rowToPackage);
    const dbSlugs = new Set(db.map((p) => p.slug));
    const demo = DEMO_PACKAGES.filter((p) => !dbSlugs.has(p.slug));
    return [...db, ...demo];
  } catch {
    return DEMO_PACKAGES;
  }
}

export async function getPackageBySlug(slug: string): Promise<Package | null> {
  try {
    const row = await prisma.package.findUnique({ where: { slug } });
    if (row && row.published) return rowToPackage(row);
  } catch { /* fall through */ }
  return DEMO_PACKAGES.find((p) => p.slug === slug) || null;
}
