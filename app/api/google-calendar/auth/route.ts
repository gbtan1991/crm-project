import { NextResponse } from "next/server";
import { z } from "zod";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { GoogleCalendarOAuth } from "@/lib/google-calendar/oauth";
import { businessOnboardingPath } from "@/lib/business-paths";
import { calendarAuthRequestSchema } from "@/lib/validation/calendar-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = calendarAuthRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const { businessId, redirectPath } = parsed.data;
    await requireBusinessOwnerOrAdmin(businessId);

    const authUrl = GoogleCalendarOAuth.getAuthUrl(
      businessId,
      redirectPath ?? businessOnboardingPath(businessId),
    );

    return NextResponse.json({ authUrl });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data." }, { status: 400 });
    }
    console.error("[google-calendar/auth][POST]", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL." },
      { status: 500 },
    );
  }
}
