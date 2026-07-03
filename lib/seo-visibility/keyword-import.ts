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

  const existing = await prisma.businessKeyword.findMany({
    where: { businessId },
    select: { keyword: true },
  });
  const existingKeywords = new Set(
    existing.map((item) => item.keyword.trim().toLowerCase()),
  );
  const seenInBatch = new Set<string>();
  const createdIds: string[] = [];

  for (const [index, row] of rows.entries()) {
    const keyword = row.keyword.trim();
    const locationLabel = row.locationLabel?.trim() ?? "";
    const normalized = keyword.toLowerCase();

    if (!keyword) {
      result.skippedEmpty += 1;
      continue;
    }

    if (seenInBatch.has(normalized)) {
      result.skippedDuplicates += 1;
      result.errors.push(`Zeile ${index + 1}: Duplikat in der CSV (${keyword}).`);
      continue;
    }

    if (existingKeywords.has(normalized)) {
      result.skippedDuplicates += 1;
      result.errors.push(`Zeile ${index + 1}: Keyword existiert bereits (${keyword}).`);
      continue;
    }

    seenInBatch.add(normalized);

    const created = await createBusinessKeywordForBusiness({
      businessId,
      data: { keyword, locationLabel },
    });

    if ("error" in created) {
      result.failed += 1;
      result.errors.push(`Zeile ${index + 1}: ${created.error}`);
      continue;
    }

    existingKeywords.add(normalized);
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
