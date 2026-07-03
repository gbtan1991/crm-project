import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { deleteBusinessKeywordForBusiness } from "@/lib/seo-visibility/keywords";

type RouteContext = {
  params: Promise<{ businessId: string; keywordId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { businessId, keywordId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const result = await deleteBusinessKeywordForBusiness({ businessId, keywordId });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/business-keywords/[keywordId]][DELETE]", error);
    return NextResponse.json(
      { error: "Keyword konnte nicht gelöscht werden." },
      { status: 500 },
    );
  }
}
