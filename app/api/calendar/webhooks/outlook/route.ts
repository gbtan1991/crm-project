import { NextResponse } from "next/server";

import { handleCalendarWebhook } from "@/lib/calendar/sync";
import { resolveOutlookWebhookBusinessId } from "@/lib/outlook-calendar/webhooks";

type OutlookNotification = {
  value?: Array<{
    clientState?: string;
    subscriptionId?: string;
  }>;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validationToken = searchParams.get("validationToken");

  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const validationToken = searchParams.get("validationToken");

  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  try {
    const body = (await request.json()) as OutlookNotification;

    for (const notification of body.value ?? []) {
      if (!notification.clientState) {
        continue;
      }

      const businessId = await resolveOutlookWebhookBusinessId(
        notification.clientState,
      );

      if (businessId) {
        await handleCalendarWebhook(businessId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[calendar/webhooks/outlook][POST]", error);
    return NextResponse.json({ ok: true });
  }
}
