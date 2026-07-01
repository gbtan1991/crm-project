import { NextResponse } from "next/server";

import { handleCalendarWebhook } from "@/lib/calendar/sync";
import { resolveGoogleWebhookBusinessId } from "@/lib/google-calendar/webhooks";

export async function POST(request: Request) {
  const channelId = request.headers.get("x-goog-channel-id");
  const resourceId = request.headers.get("x-goog-resource-id");
  const resourceState = request.headers.get("x-goog-resource-state");
  const channelToken = request.headers.get("x-goog-channel-token");

  if (!channelId || !resourceId) {
    return NextResponse.json({ error: "Kanal-Header fehlen." }, { status: 400 });
  }

  if (resourceState === "sync" || resourceState !== "exists") {
    return NextResponse.json({ ok: true });
  }

  try {
    const businessId =
      (await resolveGoogleWebhookBusinessId(channelId, resourceId)) ??
      channelToken;

    if (!businessId) {
      return NextResponse.json({ ok: true });
    }

    await handleCalendarWebhook(businessId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[calendar/webhooks/google][POST]", error);
    return NextResponse.json({ ok: true });
  }
}
