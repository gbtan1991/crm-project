import { RankingSource } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { toDateOnlyInTimeZone } from "@/lib/seo-visibility/dates";
import { normalizeDomain } from "@/lib/seo-visibility/domain";
import { resolveMarket } from "@/lib/seo-visibility/market";
import {
  getRankingProvider,
  getRankingProviderName,
} from "@/lib/seo-visibility/ranking-provider";
import {
  aggregateTierCounts,
  getVisibility,
  type KeywordVisibility,
} from "@/lib/seo-visibility/visibility";
import type { BusinessKeywordWriteInput } from "@/lib/validation/business-keyword";

const SYNC_DELAY_MS = 300;

export type BusinessKeywordRankingRow = {
  position: number | null;
  rankingUrl: string | null;
  rankingTitle: string | null;
  checkedAt: string;
  visibility: KeywordVisibility;
  error: string | null;
};

export type BusinessKeywordListRow = {
  id: string;
  keyword: string;
  targetDomain: string;
  locationLabel: string | null;
  latestRanking: BusinessKeywordRankingRow | null;
  syncedToday: boolean;
};

export type KeywordRankingSyncRow = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  totalCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
};

export type BusinessKeywordsOverview = {
  domain: string | null;
  targetDomain: string | null;
  country: string;
  keywords: BusinessKeywordListRow[];
  tierSummary: ReturnType<typeof aggregateTierCounts>;
  lastSync: KeywordRankingSyncRow | null;
  dueCount: number;
  syncedTodayCount: number;
};

export type SyncKeywordResult = {
  keywordId: string;
  keyword: string;
  position: number | null;
  rankingUrl: string | null;
  visibility: KeywordVisibility;
  error?: string;
  skipped?: boolean;
};

export type SyncBusinessKeywordsResult = {
  syncId: string | null;
  synced: number;
  failed: number;
  skipped: number;
  results: SyncKeywordResult[];
};

export type SyncBusinessKeywordsOptions = {
  keywordIds?: string[];
  /** When true, sync even if already checked today (e.g. brand-new keyword). */
  force?: boolean;
  /** Use cheaper DataForSEO standard queue instead of live mode. */
  useQueue?: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapLatestRanking(
  ranking: {
    position: number | null;
    rankingUrl: string | null;
    rankingTitle: string | null;
    checkedAt: Date;
    error: string | null;
  } | null,
): BusinessKeywordRankingRow | null {
  if (!ranking) return null;
  return {
    position: ranking.position,
    rankingUrl: ranking.rankingUrl,
    rankingTitle: ranking.rankingTitle,
    checkedAt: ranking.checkedAt.toISOString(),
    visibility: getVisibility(ranking.position),
    error: ranking.error,
  };
}

async function getBusinessContext(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { config: true },
  });
  if (!business) return null;

  const targetDomain = normalizeDomain(business.config?.domain ?? null);
  const country = business.config?.country ?? "CH";
  const timezone = business.config?.timezone ?? "UTC";

  return {
    business,
    domain: business.config?.domain ?? null,
    targetDomain,
    country,
    timezone,
    market: resolveMarket(country),
  };
}

async function getSyncedTodayKeywordIds(
  businessId: string,
  checkedOn: Date,
): Promise<Set<string>> {
  const rankings = await prisma.businessKeywordRanking.findMany({
    where: {
      keyword: { businessId },
      source: RankingSource.GOOGLE_ORGANIC,
      checkedOn,
    },
    select: { keywordId: true },
  });

  return new Set(rankings.map((ranking) => ranking.keywordId));
}

export async function listBusinessKeywordsForBusiness(
  businessId: string,
): Promise<BusinessKeywordsOverview | null> {
  const context = await getBusinessContext(businessId);
  if (!context) return null;

  const checkedOn = toDateOnlyInTimeZone(new Date(), context.timezone);

  const [keywords, lastSync, syncedTodayIds] = await Promise.all([
    prisma.businessKeyword.findMany({
      where: { businessId },
      orderBy: { createdAt: "asc" },
      include: {
        rankings: {
          where: { source: RankingSource.GOOGLE_ORGANIC },
          orderBy: { checkedAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.keywordRankingSync.findFirst({
      where: { businessId, source: RankingSource.GOOGLE_ORGANIC },
      orderBy: { startedAt: "desc" },
    }),
    getSyncedTodayKeywordIds(businessId, checkedOn),
  ]);

  const rows: BusinessKeywordListRow[] = keywords.map((keyword) => ({
    id: keyword.id,
    keyword: keyword.keyword,
    targetDomain: keyword.targetDomain,
    locationLabel: keyword.locationLabel,
    latestRanking: mapLatestRanking(keyword.rankings[0] ?? null),
    syncedToday: syncedTodayIds.has(keyword.id),
  }));

  const syncedTodayCount = rows.filter((row) => row.syncedToday).length;

  return {
    domain: context.domain,
    targetDomain: context.targetDomain,
    country: context.country,
    keywords: rows,
    tierSummary: aggregateTierCounts(
      rows.map((row) => ({ position: row.latestRanking?.position ?? null })),
    ),
    dueCount: rows.length - syncedTodayCount,
    syncedTodayCount,
    lastSync: lastSync
      ? {
          id: lastSync.id,
          startedAt: lastSync.startedAt.toISOString(),
          finishedAt: lastSync.finishedAt?.toISOString() ?? null,
          totalCount: lastSync.totalCount,
          successCount: lastSync.successCount,
          failedCount: lastSync.failedCount,
          skippedCount: lastSync.skippedCount,
        }
      : null,
  };
}

export async function createBusinessKeywordForBusiness(input: {
  businessId: string;
  data: BusinessKeywordWriteInput;
}) {
  const context = await getBusinessContext(input.businessId);
  if (!context) {
    return { error: "Unternehmen nicht gefunden." as const };
  }
  if (!context.targetDomain) {
    return {
      error:
        "Bitte hinterlegen Sie zuerst eine Website-Domain in den Unternehmenseinstellungen.",
    } as const;
  }

  const existing = await prisma.businessKeyword.findUnique({
    where: {
      businessId_keyword: {
        businessId: input.businessId,
        keyword: input.data.keyword,
      },
    },
  });
  if (existing) {
    return { error: "Dieses Keyword ist bereits vorhanden." as const };
  }

  const keyword = await prisma.businessKeyword.create({
    data: {
      businessId: input.businessId,
      keyword: input.data.keyword,
      targetDomain: context.targetDomain,
      locationLabel: input.data.locationLabel || null,
    },
  });

  return {
    keyword: {
      id: keyword.id,
      keyword: keyword.keyword,
      targetDomain: keyword.targetDomain,
      locationLabel: keyword.locationLabel,
      latestRanking: null,
      syncedToday: false,
    } satisfies BusinessKeywordListRow,
  };
}

export async function deleteBusinessKeywordForBusiness(input: {
  businessId: string;
  keywordId: string;
}) {
  const existing = await prisma.businessKeyword.findFirst({
    where: {
      id: input.keywordId,
      businessId: input.businessId,
    },
  });

  if (!existing) {
    return { error: "Keyword nicht gefunden." as const };
  }

  await prisma.businessKeyword.delete({ where: { id: input.keywordId } });
  return { ok: true as const };
}

async function syncKeywordRanking(input: {
  keyword: { id: string; keyword: string; targetDomain: string };
  provider: Awaited<ReturnType<typeof getRankingProvider>>;
  providerName: string;
  market: ReturnType<typeof resolveMarket>;
  syncId: string;
  checkedOn: Date;
  checkedAt: Date;
  useQueue?: boolean;
}): Promise<SyncKeywordResult> {
  try {
    const searchResult = await input.provider.searchOrganic({
      keyword: input.keyword.keyword,
      targetDomain: input.keyword.targetDomain,
      market: input.market,
      useQueue: input.useQueue,
    });

    await prisma.businessKeywordRanking.upsert({
      where: {
        keywordId_source_checkedOn: {
          keywordId: input.keyword.id,
          source: RankingSource.GOOGLE_ORGANIC,
          checkedOn: input.checkedOn,
        },
      },
      create: {
        keywordId: input.keyword.id,
        syncId: input.syncId,
        source: RankingSource.GOOGLE_ORGANIC,
        provider: input.providerName,
        position: searchResult.position,
        rankingUrl: searchResult.rankingUrl,
        rankingTitle: searchResult.rankingTitle,
        topDomains: { top10: searchResult.topDomains },
        checkedAt: input.checkedAt,
        checkedOn: input.checkedOn,
        error: null,
      },
      update: {
        syncId: input.syncId,
        provider: input.providerName,
        position: searchResult.position,
        rankingUrl: searchResult.rankingUrl,
        rankingTitle: searchResult.rankingTitle,
        topDomains: { top10: searchResult.topDomains },
        checkedAt: input.checkedAt,
        error: null,
      },
    });

    return {
      keywordId: input.keyword.id,
      keyword: input.keyword.keyword,
      position: searchResult.position,
      rankingUrl: searchResult.rankingUrl,
      visibility: getVisibility(searchResult.position),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Synchronisation fehlgeschlagen.";

    await prisma.businessKeywordRanking.upsert({
      where: {
        keywordId_source_checkedOn: {
          keywordId: input.keyword.id,
          source: RankingSource.GOOGLE_ORGANIC,
          checkedOn: input.checkedOn,
        },
      },
      create: {
        keywordId: input.keyword.id,
        syncId: input.syncId,
        source: RankingSource.GOOGLE_ORGANIC,
        provider: input.providerName,
        position: null,
        rankingUrl: null,
        rankingTitle: null,
        topDomains: null,
        checkedAt: input.checkedAt,
        checkedOn: input.checkedOn,
        error: message,
      },
      update: {
        syncId: input.syncId,
        provider: input.providerName,
        checkedAt: input.checkedAt,
        error: message,
      },
    });

    return {
      keywordId: input.keyword.id,
      keyword: input.keyword.keyword,
      position: null,
      rankingUrl: null,
      visibility: getVisibility(null),
      error: message,
    };
  }
}

export async function syncBusinessKeywordsForBusiness(
  businessId: string,
  options: SyncBusinessKeywordsOptions = {},
): Promise<SyncBusinessKeywordsResult> {
  const context = await getBusinessContext(businessId);
  if (!context) {
    throw new Error("Unternehmen nicht gefunden.");
  }
  if (!context.targetDomain) {
    throw new Error(
      "Bitte hinterlegen Sie zuerst eine Website-Domain in den Unternehmenseinstellungen.",
    );
  }

  const keywords = await prisma.businessKeyword.findMany({
    where: {
      businessId,
      ...(options.keywordIds?.length ? { id: { in: options.keywordIds } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  if (keywords.length === 0) {
    throw new Error("Es sind keine Keywords zum Synchronisieren vorhanden.");
  }

  const checkedOn = toDateOnlyInTimeZone(new Date(), context.timezone);
  const syncedTodayIds = options.force
    ? new Set<string>()
    : await getSyncedTodayKeywordIds(businessId, checkedOn);

  const dueKeywords = keywords.filter((keyword) => !syncedTodayIds.has(keyword.id));
  const skippedKeywords = keywords.filter((keyword) => syncedTodayIds.has(keyword.id));

  const skippedResults: SyncKeywordResult[] = skippedKeywords.map((keyword) => ({
    keywordId: keyword.id,
    keyword: keyword.keyword,
    position: null,
    rankingUrl: null,
    visibility: getVisibility(null),
    skipped: true,
  }));

  if (dueKeywords.length === 0) {
    return {
      syncId: null,
      synced: 0,
      failed: 0,
      skipped: skippedResults.length,
      results: skippedResults,
    };
  }

  const providerName = getRankingProviderName();
  const provider = await getRankingProvider();
  const checkedAt = new Date();

  const sync = await prisma.keywordRankingSync.create({
    data: {
      businessId,
      source: RankingSource.GOOGLE_ORGANIC,
      provider: providerName,
      startedAt: checkedAt,
      totalCount: dueKeywords.length,
      skippedCount: skippedResults.length,
    },
  });

  const results: SyncKeywordResult[] = [...skippedResults];
  let successCount = 0;
  let failedCount = 0;

  for (let index = 0; index < dueKeywords.length; index += 1) {
    const keyword = dueKeywords[index];
    const result = await syncKeywordRanking({
      keyword,
      provider,
      providerName,
      market: context.market,
      syncId: sync.id,
      checkedOn,
      checkedAt,
      useQueue: options.useQueue,
    });

    results.push(result);

    if (result.error) {
      failedCount += 1;
    } else {
      successCount += 1;
    }

    if (index < dueKeywords.length - 1) {
      await sleep(SYNC_DELAY_MS);
    }
  }

  await prisma.keywordRankingSync.update({
    where: { id: sync.id },
    data: {
      finishedAt: new Date(),
      successCount,
      failedCount,
      skippedCount: skippedResults.length,
    },
  });

  return {
    syncId: sync.id,
    synced: successCount,
    failed: failedCount,
    skipped: skippedResults.length,
    results,
  };
}

export async function syncAllDueBusinessKeywords() {
  const businesses = await prisma.business.findMany({
    where: {
      businessKeywords: { some: {} },
    },
    select: { id: true },
  });

  const summary = {
    businesses: businesses.length,
    synced: 0,
    failed: 0,
    skipped: 0,
    apiCalls: 0,
    results: [] as Array<{
      businessId: string;
      synced?: number;
      failed?: number;
      skipped?: number;
      error?: string;
    }>,
  };

  for (const { id: businessId } of businesses) {
    try {
      const result = await syncBusinessKeywordsForBusiness(businessId, {
        useQueue: true,
      });
      summary.synced += result.synced;
      summary.failed += result.failed;
      summary.skipped += result.skipped;
      summary.apiCalls += result.synced + result.failed;
      summary.results.push({
        businessId,
        synced: result.synced,
        failed: result.failed,
        skipped: result.skipped,
      });
    } catch (error) {
      summary.results.push({
        businessId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return summary;
}
