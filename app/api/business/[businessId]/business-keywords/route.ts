import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  createBusinessKeywordForBusiness,
  listBusinessKeywordsForBusiness,
  syncBusinessKeywordsForBusiness,
} from "@/lib/seo-visibility/keywords";
import { businessKeywordWriteSchema } from "@/lib/validation/business-keyword";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const result = await listBusinessKeywordsForBusiness(businessId);
    if (!result) {
      return NextResponse.json({ error: "Unternehmen nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/business-keywords][GET]", error);
    return NextResponse.json(
      { error: "Keywords konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = businessKeywordWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 },
      );
    }

    const result = await createBusinessKeywordForBusiness({
      businessId,
      data: parsed.data,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    let initialSync = null;
    try {
      initialSync = await syncBusinessKeywordsForBusiness(businessId, {
        keywordIds: [result.keyword.id],
        force: true,
      });
    } catch (syncError) {
      console.error("[business/business-keywords][POST] initial sync failed", syncError);
    }

    return NextResponse.json(
      { keyword: result.keyword, initialSync },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/business-keywords][POST]", error);
    return NextResponse.json(
      { error: "Keyword konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
