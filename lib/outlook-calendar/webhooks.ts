import { env } from "@/env/server.mjs";
import { prisma } from "@/lib/prisma";
import { OutlookCalendarOAuth } from "@/lib/outlook-calendar/oauth";

const SUBSCRIPTION_TTL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days (renew before ~3d max)

function subscriptionExpirationIso() {
  return new Date(Date.now() + SUBSCRIPTION_TTL_MS).toISOString();
}

export async function registerOutlookWebhook(businessId: string) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { businessId },
  });

  if (!connection?.connectedAt) {
    throw new Error("Outlook Calendar is not connected.");
  }

  if (connection.graphSubscriptionId) {
    await stopOutlookWebhook(businessId).catch(() => undefined);
  }

  const accessToken = await OutlookCalendarOAuth.getValidAccessToken(businessId);
  const webhookUrl = `${env.NEXT_PUBLIC_URL}/api/calendar/webhooks/outlook`;

  const response = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      changeType: "created,updated,deleted",
      notificationUrl: webhookUrl,
      resource: "/me/events",
      expirationDateTime: subscriptionExpirationIso(),
      clientState: businessId,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Outlook subscription registration failed (${response.status}): ${body}`,
    );
  }

  const data = (await response.json()) as {
    id: string;
    expirationDateTime: string;
  };

  await prisma.calendarConnection.update({
    where: { businessId },
    data: {
      graphSubscriptionId: data.id,
      graphSubscriptionExpiresAt: new Date(data.expirationDateTime),
    },
  });
}

export async function stopOutlookWebhook(businessId: string) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { businessId },
  });

  if (!connection?.graphSubscriptionId) {
    return;
  }

  const accessToken = await OutlookCalendarOAuth.getValidAccessToken(businessId);

  await fetch(
    `https://graph.microsoft.com/v1.0/subscriptions/${connection.graphSubscriptionId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  ).catch(() => undefined);

  await prisma.calendarConnection.update({
    where: { businessId },
    data: {
      graphSubscriptionId: null,
      graphSubscriptionExpiresAt: null,
    },
  });
}

export async function renewOutlookWebhookIfNeeded(businessId: string) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { businessId },
  });

  if (!connection?.connectedAt) {
    return { renewed: false };
  }

  const renewBy = new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (
    connection.graphSubscriptionId &&
    connection.graphSubscriptionExpiresAt &&
    connection.graphSubscriptionExpiresAt > renewBy
  ) {
    return { renewed: false };
  }

  if (connection.graphSubscriptionId) {
    const accessToken = await OutlookCalendarOAuth.getValidAccessToken(
      businessId,
    );

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/subscriptions/${connection.graphSubscriptionId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expirationDateTime: subscriptionExpirationIso(),
        }),
      },
    );

    if (response.ok) {
      const data = (await response.json()) as { expirationDateTime: string };
      await prisma.calendarConnection.update({
        where: { businessId },
        data: {
          graphSubscriptionExpiresAt: new Date(data.expirationDateTime),
        },
      });
      return { renewed: true };
    }
  }

  await registerOutlookWebhook(businessId);
  return { renewed: true };
}

export async function resolveOutlookWebhookBusinessId(clientState: string) {
  const connection = await prisma.calendarConnection.findFirst({
    where: {
      businessId: clientState,
      graphSubscriptionId: { not: null },
    },
    select: { businessId: true },
  });

  return connection?.businessId ?? clientState;
}
