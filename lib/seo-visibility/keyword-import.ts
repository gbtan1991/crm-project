import { prisma } from "@/lib/prisma";
import {
  createBusinessKeywordForBusiness,
  syncBusinessKeywordsForBusiness,
} from "@/lib/seo-visibility/keywords";
import type { BusinessKeywordImportRowInput } from "@/lib/validation/business-keyword-import";

export type KeywordImportResult = {
  created: number;
  skippedDuplicates: number;
  skippedEmpty: number;
  failed: number;
  synced: number;
  syncFailed: number;
  totalRows: number;
  errors: string[];
};

function duplicateKey(keyword: string, locationCode: number) {
  return `${keyword.trim().toLowerCase()}::${locationCode}`;
}

export async function importBusinessKeywordsBatch(
  businessId: string,
  rows: BusinessKeywordImportRowInput[],
): Promise<KeywordImportResult> {
  const result: KeywordImportResult = {
    created: 0,
    skippedDuplicates: 0,
    skippedEmpty: 0,
    failed: 0,
    synced: 0,
    syncFailed: 0,
    totalRows: rows.length,
    errors: [],
  };

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { config: true },
  });
  if (!business) {
    result.errors.push("Unternehmen nicht gefunden.");
    return result;
  }

  const existing = await prisma.businessKeyword.findMany({
    where: { businessId },
    select: { keyword: true, locationCode: true },
  });
  const existingKeys = new Set(
    existing.map((item) => duplicateKey(item.keyword, item.locationCode)),
  );
  const seenInBatch = new Set<string>();
  const createdIds: string[] = [];

  for (const [index, row] of rows.entries()) {
    const keyword = row.keyword.trim();
    const { locationCode, locationName } = row;

    if (!keyword) {
      result.skippedEmpty += 1;
      continue;
    }

    const key = duplicateKey(keyword, locationCode);

    if (seenInBatch.has(key)) {
      result.skippedDuplicates += 1;
      result.errors.push(
        `Zeile ${index + 1}: Duplikat in der Liste (${keyword}, ${locationName}).`,
      );
      continue;
    }

    if (existingKeys.has(key)) {
      result.skippedDuplicates += 1;
      result.errors.push(
        `Zeile ${index + 1}: Keyword existiert bereits (${keyword}, ${locationName}).`,
      );
      continue;
    }

    seenInBatch.add(key);

    const created = await createBusinessKeywordForBusiness({
      businessId,
      data: {
        keyword,
        locationCode,
        locationName,
      },
    });

    if ("error" in created) {
      result.failed += 1;
      result.errors.push(`Zeile ${index + 1}: ${created.error}`);
      continue;
    }

    existingKeys.add(key);
    createdIds.push(created.keyword.id);
    result.created += 1;
  }

  if (createdIds.length > 0) {
    try {
      const syncResult = await syncBusinessKeywordsForBusiness(businessId, {
        keywordIds: createdIds,
        force: true,
      });
      result.synced = syncResult.synced;
      result.syncFailed = syncResult.failed;
    } catch (error) {
      result.errors.push(
        error instanceof Error
          ? error.message
          : "Erstes Ranking konnte nicht abgerufen werden.",
      );
    }
  }

  return result;
}
