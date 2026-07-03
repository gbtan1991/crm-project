import {
  fetchDataForSeoLiveOrganic,
  fetchDataForSeoQueuedOrganic,
} from "@/lib/seo-visibility/dataforseo-client";
import type {
  RankingProvider,
  RankingSearchParams,
  RankingSearchResult,
} from "@/lib/seo-visibility/ranking-provider";

export class DataForSeoRankingProvider implements RankingProvider {
  async searchOrganic(params: RankingSearchParams): Promise<RankingSearchResult> {
    if (params.useQueue) {
      return fetchDataForSeoQueuedOrganic(params);
    }
    return fetchDataForSeoLiveOrganic(params);
  }
}
