import { readFileSync } from "node:fs";
import path from "node:path";

import { resolveMarket } from "@/lib/seo-visibility/market";

import type { SerpLocationOption } from "@/lib/seo-visibility/serp-location-types";

type CompactSerpLocation = {
  c: number;
  n: string;
  t: string;
};

const SEARCH_RESULT_LIMIT = 20;
const locationCache = new Map<string, SerpLocationOption[]>();

function toOption(row: CompactSerpLocation): SerpLocationOption {
  return {
    locationCode: row.c,
    locationName: row.n,
    locationType: row.t,
  };
}

function getLocationsForCountry(country: string): SerpLocationOption[] {
  const code = country.trim().toUpperCase();
  const cached = locationCache.get(code);
  if (cached) return cached;

  const filePath = path.join(
    process.cwd(),
    "data",
    "serp-locations",
    `${code.toLowerCase()}.json`,
  );

  let parsed: CompactSerpLocation[];
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8")) as CompactSerpLocation[];
  } catch {
    locationCache.set(code, []);
    return [];
  }

  const rows = parsed.map(toOption);
  locationCache.set(code, rows);
  return rows;
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function scoreLocation(location: SerpLocationOption, query: string) {
  const name = location.locationName.toLowerCase();
  if (!query) {
    return location.locationType === "Country" ? 0 : 1;
  }
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  return 99;
}

export function getDefaultCountryLocation(
  country: string,
): SerpLocationOption | null {
  const market = resolveMarket(country);
  const locations = getLocationsForCountry(country);
  const countryRow = locations.find(
    (location) =>
      location.locationCode === market.locationCode &&
      location.locationType === "Country",
  );
  if (countryRow) return countryRow;

  return (
    locations.find((location) => location.locationCode === market.locationCode) ??
    locations.find((location) => location.locationType === "Country") ??
    null
  );
}

export function searchSerpLocations(input: {
  country: string;
  query?: string;
  limit?: number;
}): SerpLocationOption[] {
  const locations = getLocationsForCountry(input.country);
  const limit = input.limit ?? SEARCH_RESULT_LIMIT;
  const query = normalizeQuery(input.query ?? "");

  if (!query) {
    return locations
      .slice()
      .sort((left, right) => {
        const leftScore = scoreLocation(left, query);
        const rightScore = scoreLocation(right, query);
        if (leftScore !== rightScore) return leftScore - rightScore;
        return left.locationName.localeCompare(right.locationName, "de");
      })
      .slice(0, limit);
  }

  return locations
    .filter((location) => location.locationName.toLowerCase().includes(query))
    .sort((left, right) => {
      const leftScore = scoreLocation(left, query);
      const rightScore = scoreLocation(right, query);
      if (leftScore !== rightScore) return leftScore - rightScore;
      return left.locationName.localeCompare(right.locationName, "de");
    })
    .slice(0, limit);
}

export function findSerpLocationByCode(input: {
  country: string;
  locationCode: number;
}): SerpLocationOption | null {
  return (
    getLocationsForCountry(input.country).find(
      (location) => location.locationCode === input.locationCode,
    ) ?? null
  );
}

export function resolveSerpLocationFromLabel(input: {
  country: string;
  label: string;
}): SerpLocationOption | null {
  const label = input.label.trim();
  if (!label) {
    return getDefaultCountryLocation(input.country);
  }

  const query = normalizeQuery(label);
  const locations = getLocationsForCountry(input.country);
  const exact = locations.find(
    (location) => location.locationName.toLowerCase() === query,
  );
  if (exact) return exact;

  const partialMatches = locations.filter((location) =>
    location.locationName.toLowerCase().includes(query),
  );
  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  return null;
}

export const SERP_LOCATION_SEARCH_LIMIT = SEARCH_RESULT_LIMIT;
