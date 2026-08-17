/**
 * BDSD bus city master list — CSV / SQL → JSON builder (offline).
 *
 *   npx tsx scripts/build-bus-cities.ts [--csv <path>] [--out <path>]
 *   npx tsx scripts/build-bus-cities.ts --sql "bus_city_list (6).sql"
 *
 * The client sends this list either as a CSV or as a phpMyAdmin dump of their
 * `bus_city_list` table; both carry the same four columns, so --sql parses the
 * INSERT rows and everything downstream is identical.
 *
 * BDSD's bus `search` endpoint takes numeric OriginId/DestinationId and their
 * documentation exposes no city-list endpoint, so the mapping has to come from
 * the master list they send by email. This turns that CSV into the JSON the app
 * ships in src/data/bus-cities.json.
 *
 * The CSV columns are `id,city_id,city_name,priority`:
 *   - `city_id` is the value BDSD wants as OriginId/DestinationId. Verified
 *     against the two ids in their own docs sample: Bangalore 8463,
 *     Hyderabad 9573.
 *   - `id` is only a row number in their export and is discarded.
 *   - `priority` is set on four cities (Delhi, Shimla, Mumbai, Goa) and is kept
 *     as the "featured" ordering for an empty search box.
 *
 * Re-run this whenever BDSD sends a refreshed list. No network I/O.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const sqlArg = arg("sql", "");
const csvPath = resolve(arg("csv", "bus_city_list.csv"));
const outPath = resolve(arg("out", "src/data/bus-cities.json"));

/** Minimal RFC-4180 row splitter — the export quotes every field. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ""));
}

/**
 * Pull the value tuples out of a phpMyAdmin `INSERT INTO ... VALUES (...),(...);`
 * dump. Only `bus_city_list` rows are read, so a multi-table dump is safe.
 * Handles NULL, backslash escapes and doubled quotes inside a string.
 */
function parseSqlInserts(text: string): string[][] {
  const rows: string[][] = [];
  const stmt = /INSERT\s+INTO\s+`?bus_city_list`?[^)]*\)\s*VALUES\s*/gi;
  let m: RegExpExecArray | null;
  while ((m = stmt.exec(text))) {
    let i = m.index + m[0].length;
    // Walk tuples until the statement terminator.
    for (; i < text.length; i++) {
      const ch = text[i];
      if (ch === ";") break;
      if (ch !== "(") continue;
      const row: string[] = [];
      let field = "";
      let quoted = false;
      i++;
      for (; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
          if (c === "\\") { field += text[++i] ?? ""; continue; }
          if (c === "'") {
            if (text[i + 1] === "'") { field += "'"; i++; continue; }
            quoted = false;
            continue;
          }
          field += c;
        } else if (c === "'") quoted = true;
        else if (c === ",") { row.push(field.trim()); field = ""; }
        else if (c === ")") { row.push(field.trim()); break; }
        else field += c;
      }
      rows.push(row.map((v) => (v === "NULL" ? "" : v)));
    }
  }
  return rows;
}

let rows: string[][];
let iCityId: number, iName: number, iPriority: number;

if (sqlArg) {
  // Column order is fixed by the dump's own INSERT list: id, city_id, city_name, priority.
  rows = parseSqlInserts(readFileSync(resolve(sqlArg), "utf8"));
  if (!rows.length) throw new Error(`no bus_city_list INSERT rows found in ${sqlArg}`);
  rows.unshift([]); // the loop below skips row 0 as a header
  [iCityId, iName, iPriority] = [1, 2, 3];
} else {
  rows = parseCsv(readFileSync(csvPath, "utf8").replace(/^﻿/, ""));
  const header = rows[0].map((h) => h.trim().toLowerCase());
  iCityId = header.indexOf("city_id");
  iName = header.indexOf("city_name");
  iPriority = header.indexOf("priority");
  if (iCityId < 0 || iName < 0) throw new Error(`csv is missing city_id/city_name: ${header.join(",")}`);
}

const seen = new Set<number>();
const cities: [number, string][] = [];
const featured: { id: number; priority: number }[] = [];

for (const r of rows.slice(1)) {
  const id = Number(r[iCityId]);
  // Their names carry stray leading/trailing spaces on ~85 rows.
  const name = (r[iName] ?? "").trim();
  if (!Number.isFinite(id) || id <= 0 || !name) continue;
  if (seen.has(id)) continue; // ids are unique today; guard against a bad refresh
  seen.add(id);
  cities.push([id, name]);
  const p = Number(r[iPriority]);
  if (Number.isFinite(p) && p > 0) featured.push({ id, priority: p });
}

cities.sort((a, b) => a[1].localeCompare(b[1], "en"));
featured.sort((a, b) => a.priority - b.priority);

const payload = {
  source: sqlArg
    ? `bus_city_list table dump shared by the client (${sqlArg.split("/").pop()})`
    : "BDSD Technology bus city master list (emailed by the client 2026-08-08)",
  count: cities.length,
  featured: featured.map((f) => f.id),
  cities,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload));
console.log(`wrote ${outPath}: ${cities.length} cities, featured ${payload.featured.join(", ")}`);
