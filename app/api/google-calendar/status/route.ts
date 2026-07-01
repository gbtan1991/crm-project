import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { GoogleCalendarOAuth } from "@/lib/google-calendar/oauth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        { error: "businessId ist erforderlich." },
        { status: 400 },
      );
    }

    await requireBusinessOwnerOrAdmin(businessId);
    const status = await GoogleCalendarOAuth.getConnectionStatus(businessId);

    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[google-calendar/status][GET]", error);
    return NextResponse.json({ error: "Es ist ein Fehler aufgetreten." }, { status: 500 });
  }
}
