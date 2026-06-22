import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { syncBusinessCalendar } from "@/lib/calendar/sync";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const result = await syncBusinessCalendar(businessId);

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/calendar/sync][POST]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Calendar sync failed.",
      },
      { status: 500 },
    );
  }
}
