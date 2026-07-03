import { extractHostname, hostnamesMatch } from "@/lib/seo-visibility/domain";
import type {
  RankingProvider,
  RankingSearchParams,
  RankingSearchResult,
} from "@/lib/seo-visibility/ranking-provider";

type SerpApiOrganicResult = {
  position?: number;
  title?: string;
  link?: string;
};

type SerpApiResponse = {
  organic_results?: SerpApiOrganicResult[];
  error?: string;
};

function getSerpApiKey(): string {
  const key = process.env.SERPAPI_API_KEY?.trim();
  if (!key) {
    throw new Error("SERPAPI_API_KEY ist nicht konfiguriert.");
  }
  return key;
}

function extractTopDomains(results: SerpApiOrganicResult[], limit = 10): string[] {
  const domains: string[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    if (!result.link) continue;
    const hostname = extractHostname(result.link);
    if (!hostname || seen.has(hostname)) continue;
    seen.add(hostname);
    domains.push(hostname);
    if (domains.length >= limit) break;
  }

  return domains;
}

export class SerpApiRankingProvider implements RankingProvider {
  async searchOrganic(params: RankingSearchParams): Promise<RankingSearchResult> {
    const apiKey = getSerpApiKey();
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", params.keyword);
    url.searchParams.set("num", "100");
    url.searchParams.set("google_domain", params.market.googleDomain);
    url.searchParams.set("gl", params.market.gl);
    url.searchParams.set("hl", params.market.hl);
    url.searchParams.set("api_key", apiKey);

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`SerpAPI-Anfrage fehlgeschlagen (${response.status}).`);
    }

    const data = (await response.json()) as SerpApiResponse;
    if (data.error) {
      throw new Error(data.error);
    }

    const organicResults = data.organic_results ?? [];
    const topDomains = extractTopDomains(organicResults);

    let position: number | null = null;
    let rankingUrl: string | null = null;
    let rankingTitle: string | null = null;

    for (const result of organicResults) {
      if (!result.link || typeof result.position !== "number") continue;
      if (!hostnamesMatch(result.link, params.targetDomain)) continue;
      position = result.position;
      rankingUrl = result.link;
      rankingTitle = result.title ?? null;
      break;
    }

    return {
      position,
      rankingUrl,
      rankingTitle,
      topDomains,
    };
  }
}
