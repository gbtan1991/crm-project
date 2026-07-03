import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { importBusinessKeywordsBatch } from "@/lib/seo-visibility/keyword-import";
import { businessKeywordImportSchema } from "@/lib/validation/business-keyword-import";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = businessKeywordImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Importdaten." },
        { status: 400 },
      );
    }

    const result = await importBusinessKeywordsBatch(businessId, parsed.data.keywords);

    if (result.created === 0 && result.failed === 0 && result.skippedDuplicates === 0) {
      return NextResponse.json(
        { error: "Es wurden keine Keywords importiert.", result },
        { status: 400 },
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/business-keywords/import][POST]", error);
    return NextResponse.json(
      { error: "Keywords konnten nicht importiert werden." },
      { status: 500 },
    );
  }
}
