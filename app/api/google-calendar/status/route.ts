import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { GoogleCalendarOAuth } from "@/lib/google-calendar/oauth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        { error: "businessId is required." },
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
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
