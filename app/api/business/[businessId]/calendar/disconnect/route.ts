import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { disconnectBusinessCalendar } from "@/lib/calendar/disconnect";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    await disconnectBusinessCalendar(businessId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/calendar/disconnect][DELETE]", error);
    return NextResponse.json(
      { error: "Kalender konnte nicht getrennt werden." },
      { status: 500 },
    );
  }
}
