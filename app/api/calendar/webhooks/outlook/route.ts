import { NextResponse } from "next/server";

import { handleCalendarWebhook } from "@/lib/calendar/sync";
import { resolveOutlookWebhookBusinessId } from "@/lib/outlook-calendar/webhooks";

export const dynamic = "force-dynamic";

type OutlookNotification = {
  value?: Array<{
    clientState?: string;
    subscriptionId?: string;
    changeType?: string;
  }>;
};

function validationResponse(validationToken: string) {
  return new NextResponse(validationToken, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validationToken = searchParams.get("validationToken");

  if (validationToken) {
    return validationResponse(validationToken);
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const validationToken = searchParams.get("validationToken");

  if (validationToken) {
    return validationResponse(validationToken);
  }

  try {
    const body = (await request.json()) as OutlookNotification;
    const notifications = body.value ?? [];

    if (notifications.length > 0) {
      console.info(
        `[calendar/webhooks/outlook][POST] received ${notifications.length} notification(s)`,
      );
    }

    for (const notification of notifications) {
      if (!notification.clientState) {
        continue;
      }

      const businessId = await resolveOutlookWebhookBusinessId(
        notification.clientState,
      );

      if (businessId) {
        console.info(
          `[calendar/webhooks/outlook][POST] syncing business ${businessId} (${notification.changeType ?? "change"})`,
        );
        void handleCalendarWebhook(businessId).catch((error) => {
          console.error(
            `[calendar/webhooks/outlook] sync failed for ${businessId}`,
            error,
          );
        });
      }
    }

    // Graph expects a quick response; sync runs in the background.
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("[calendar/webhooks/outlook][POST]", error);
    return NextResponse.json({ ok: true }, { status: 202 });
  }
}
