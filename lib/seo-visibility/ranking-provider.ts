import type { MarketConfig } from "@/lib/seo-visibility/market";

export type RankingSearchParams = {
  keyword: string;
  targetDomain: string;
  market: MarketConfig;
  /** Per-keyword DataForSEO location code (overrides market default). */
  locationCode: number;
  /** Use DataForSEO standard queue (cheaper, ~5 min). Default: live mode. */
  useQueue?: boolean;
};

export type RankingSearchResult = {
  position: number | null;
  rankingUrl: string | null;
  rankingTitle: string | null;
  topDomains: string[];
  /** DataForSEO snapshot URL for the exact SERP that was checked. */
  checkUrl?: string | null;
};

export interface RankingProvider {
  searchOrganic(params: RankingSearchParams): Promise<RankingSearchResult>;
}

export function getRankingProviderName(): string {
  return process.env.RANKING_PROVIDER?.trim() || "dataforseo";
}

export async function getRankingProvider(): Promise<RankingProvider> {
  const name = getRankingProviderName();
  if (name === "dataforseo") {
    const { DataForSeoRankingProvider } = await import(
      "@/lib/seo-visibility/dataforseo-provider"
    );
    return new DataForSeoRankingProvider();
  }
  if (name === "serpapi") {
    const { SerpApiRankingProvider } = await import(
      "@/lib/seo-visibility/serpapi-provider"
    );
    return new SerpApiRankingProvider();
  }
  throw new Error(`Unbekannter Ranking-Provider: ${name}`);
}
