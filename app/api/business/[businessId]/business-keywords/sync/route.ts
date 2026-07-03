import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { syncBusinessKeywordsForBusiness } from "@/lib/seo-visibility/keywords";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const result = await syncBusinessKeywordsForBusiness(businessId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/business-keywords/sync][POST]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Keyword-Synchronisation fehlgeschlagen.",
      },
      { status: 500 },
    );
  }
}
