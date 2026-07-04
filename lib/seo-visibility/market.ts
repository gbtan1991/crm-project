export type MarketConfig = {
  googleDomain: string;
  gl: string;
  hl: string;
  /** DataForSEO country-level location code. */
  locationCode: number;
  languageCode: string;
};

const MARKET_MAP: Record<string, MarketConfig> = {
  CH: {
    googleDomain: "google.ch",
    gl: "ch",
    hl: "de",
    locationCode: 2756,
    languageCode: "de",
  },
  DE: {
    googleDomain: "google.de",
    gl: "de",
    hl: "de",
    locationCode: 2276,
    languageCode: "de",
  },
  AT: {
    googleDomain: "google.at",
    gl: "at",
    hl: "de",
    locationCode: 2040,
    languageCode: "de",
  },
  US: {
    googleDomain: "google.com",
    gl: "us",
    hl: "en",
    locationCode: 2840,
    languageCode: "en",
  },
  GB: {
    googleDomain: "google.co.uk",
    gl: "uk",
    hl: "en",
    locationCode: 2826,
    languageCode: "en",
  },
  IN: {
    googleDomain: "google.co.in",
    gl: "in",
    hl: "en",
    locationCode: 2356,
    languageCode: "en",
  },
  FR: {
    googleDomain: "google.fr",
    gl: "fr",
    hl: "fr",
    locationCode: 2250,
    languageCode: "fr",
  },
  IT: {
    googleDomain: "google.it",
    gl: "it",
    hl: "it",
    locationCode: 2380,
    languageCode: "it",
  },
};

const DEFAULT_MARKET: MarketConfig = {
  googleDomain: "google.com",
  gl: "us",
  hl: "en",
  locationCode: 2840,
  languageCode: "en",
};

export function resolveMarket(country: string | null | undefined): MarketConfig {
  const code = country?.trim().toUpperCase();
  if (!code) return MARKET_MAP.CH;
  return MARKET_MAP[code] ?? DEFAULT_MARKET;
}

/** Approximate Google SERP preview when no DataForSEO check_url is stored yet. */
export function buildGoogleSearchPreviewUrl(
  keyword: string,
  country: string | null | undefined,
): string {
  const market = resolveMarket(country);
  const params = new URLSearchParams({
    q: keyword,
    hl: market.hl,
    gl: market.gl,
  });
  return `https://${market.googleDomain}/search?${params.toString()}`;
}
