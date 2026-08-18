/**
 * BDSD bus city master list — lookup and search.
 *
 * BDSD's `search` endpoint takes numeric OriginId/DestinationId and documents no
 * city-list endpoint, so the ids come from the master list the client emailed.
 * `src/data/bus-cities.json` is generated from that CSV by
 * `npx tsx scripts/build-bus-cities.ts`; re-run it when BDSD sends a refresh.
 *
 * SERVER ONLY. The dataset is ~300 KB, so never import this from a client
 * component — use the /api/bus/cities route instead (that is what BusCitySelect
 * does).
 *
 * Names are NOT unique: 318 names in the list are shared by two different ids
 * (e.g. "Adampur" is both 7126 and 11480). A name therefore cannot reliably
 * identify a city, which is why the UI selects a city object and the search API
 * takes `fromId`/`toId`. `resolveCityId` exists only for legacy name-based
 * callers and deliberately refuses to guess when a name is ambiguous.
 */
import data from "@/data/bus-cities.json";

export interface BusCity {
  id: number;
  name: string;
}

// TypeScript widens the JSON's [id, name] pairs to (string | number)[], so the
// tuple shape has to be reasserted. The generator guarantees it.
const RAW = data as unknown as { count: number; featured: number[]; cities: [number, string][] };

/** Lowercase alphanumerics only, so "Model Colony,Nashik" ≈ "modelcolonynashik". */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

interface Index {
  all: BusCity[];
  byId: Map<number, BusCity>;
  byName: Map<string, BusCity[]>;
  featured: BusCity[];
}

let index: Index | null = null;

function getIndex(): Index {
  if (index) return index;
  const all: BusCity[] = RAW.cities.map(([id, name]) => ({ id, name }));
  const byId = new Map<number, BusCity>();
  const byName = new Map<string, BusCity[]>();
  for (const city of all) {
    byId.set(city.id, city);
    const key = normalize(city.name);
    const bucket = byName.get(key);
    if (bucket) bucket.push(city);
    else byName.set(key, [city]);
  }
  const featured = RAW.featured.map((id) => byId.get(id)).filter((c): c is BusCity => Boolean(c));
  index = { all, byId, byName, featured };
  return index;
}

export function cityCount(): number {
  return getIndex().all.length;
}

export function getCityById(id: number): BusCity | null {
  return getIndex().byId.get(id) ?? null;
}

/** Cities BDSD flagged with a priority (Delhi, Shimla, Mumbai, Goa), in their order. */
export function featuredCities(): BusCity[] {
  return getIndex().featured;
}

/**
 * Resolve a free-text city name to a BDSD id.
 *
 * Returns the id for a numeric input or an unambiguous name match. Returns null
 * when the name is unknown OR shared by more than one city — callers must not
 * fall back to a guess, because booking the wrong city is a real ticket.
 */
export function resolveCityId(input: string): number | null {
  const raw = (input || "").trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const id = Number(raw);
    return getIndex().byId.has(id) ? id : null;
  }
  const matches = getIndex().byName.get(normalize(raw));
  if (!matches || matches.length !== 1) return null;
  return matches[0].id;
}

/** Why a name failed to resolve, so the API can say something useful. */
export function describeCityLookup(input: string): "ok" | "unknown" | "ambiguous" {
  const raw = (input || "").trim();
  if (/^\d+$/.test(raw)) return getIndex().byId.has(Number(raw)) ? "ok" : "unknown";
  const matches = getIndex().byName.get(normalize(raw));
  if (!matches) return "unknown";
  return matches.length === 1 ? "ok" : "ambiguous";
}

/**
 * Rank for a query: exact match first, then prefix, then a match at any word
 * start ("nashik" → "Mumbai Naka,Nashik"), then anywhere. Lower is better.
 */
function rank(cityNorm: string, words: string[], q: string): number {
  if (cityNorm === q) return 0;
  if (cityNorm.startsWith(q)) return 1;
  if (words.some((w) => w.startsWith(q))) return 2;
  if (cityNorm.includes(q)) return 3;
  return -1;
}

/**
 * Search the master list. An empty query returns the featured cities so the
 * picker opens with something useful rather than the alphabetical head.
 */
export function searchCities(query: string, limit = 30): BusCity[] {
  const { all, featured } = getIndex();
  const q = normalize(query);
  if (!q) return featured.slice(0, limit);

  const scored: { city: BusCity; score: number }[] = [];
  for (const city of all) {
    const cityNorm = normalize(city.name);
    const words = city.name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const score = rank(cityNorm, words, q);
    if (score >= 0) {
      scored.push({ city, score });
      // Exact hits are the answer; keep scanning only until the list is deep
      // enough to sort meaningfully, since 15k rows are scanned per keystroke.
      if (scored.length >= limit * 20) break;
    }
  }
  scored.sort((a, b) => a.score - b.score || a.city.name.localeCompare(b.city.name, "en"));
  return scored.slice(0, limit).map((s) => s.city);
}
