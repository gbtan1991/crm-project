import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";

type SerpLocationRow = {
  c: number;
  n: string;
  t: string;
};

const CSV_PATH = path.join(
  process.cwd(),
  "locations_serp_google_2026_06_10.csv",
);
const OUTPUT_DIR = path.join(process.cwd(), "data", "serp-locations");

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const byCountry = new Map<string, SerpLocationRow[]>();
  const stream = createReadStream(CSV_PATH, { encoding: "utf8" });
  const reader = createInterface({ input: stream, crlfDelay: Infinity });

  let isHeader = true;

  for await (const line of reader) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    if (!line.trim()) continue;

    const [locationCode, locationName, , countryIsoCode, locationType] =
      parseCsvLine(line);

    const country = countryIsoCode?.trim().toUpperCase();
    const code = Number.parseInt(locationCode, 10);
    const name = locationName?.trim();
    const type = locationType?.trim();

    if (!country || !Number.isFinite(code) || !name || !type) continue;

    const rows = byCountry.get(country) ?? [];
    rows.push({ c: code, n: name, t: type });
    byCountry.set(country, rows);
  }

  for (const [country, rows] of byCountry.entries()) {
    rows.sort((left, right) => left.n.localeCompare(right.n, "de"));
    const outputPath = path.join(OUTPUT_DIR, `${country.toLowerCase()}.json`);
    writeFileSync(outputPath, JSON.stringify(rows));
  }

  console.log(`Wrote ${byCountry.size} country files to ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
