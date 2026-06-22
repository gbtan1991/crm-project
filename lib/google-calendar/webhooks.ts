import { randomUUID } from "node:crypto";

import { env } from "@/env/server.mjs";
import { prisma } from "@/lib/prisma";
import { GoogleCalendarOAuth } from "@/lib/google-calendar/oauth";

const WATCH_TTL_MS = 6 * 24 * 60 * 60 * 1000; // 6 days (Google max ~7)

export async function registerGoogleWebhook(businessId: string) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { businessId },
  });

  if (!connection?.connectedAt) {
    throw new Error("Google Calendar is not connected.");
  }

  if (connection.webhookChannelId && connection.webhookResourceId) {
    await stopGoogleWebhook(businessId).catch(() => undefined);
  }

  const accessToken = await GoogleCalendarOAuth.getValidAccessToken(businessId);
  const calendarId = connection.calendarId ?? "primary";
  const channelId = randomUUID();
  const expiration = Date.now() + WATCH_TTL_MS;
  const webhookUrl = `${env.NEXT_PUBLIC_URL}/api/calendar/webhooks/google`;

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
        token: businessId,
        expiration: String(expiration),
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google watch registration failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    id: string;
    resourceId: string;
    expiration: string;
  };

  await prisma.calendarConnection.update({
    where: { businessId },
    data: {
      webhookChannelId: data.id,
      webhookResourceId: data.resourceId,
      webhookExpiresAt: new Date(Number(data.expiration)),
    },
  });
}

export async function stopGoogleWebhook(businessId: string) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { businessId },
  });

  if (!connection?.webhookChannelId || !connection.webhookResourceId) {
    return;
  }

  const accessToken = await GoogleCalendarOAuth.getValidAccessToken(businessId);

  await fetch("https://www.googleapis.com/calendar/v3/channels/stop", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: connection.webhookChannelId,
      resourceId: connection.webhookResourceId,
    }),
  }).catch(() => undefined);

  await prisma.calendarConnection.update({
    where: { businessId },
    data: {
      webhookChannelId: null,
      webhookResourceId: null,
      webhookExpiresAt: null,
    },
  });
}

export async function renewGoogleWebhookIfNeeded(businessId: string) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { businessId },
  });

  if (!connection?.connectedAt) {
    return { renewed: false };
  }

  const renewBy = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (connection.webhookExpiresAt && connection.webhookExpiresAt > renewBy) {
    return { renewed: false };
  }

  await registerGoogleWebhook(businessId);
  return { renewed: true };
}

export async function resolveGoogleWebhookBusinessId(
  channelId: string,
  resourceId: string,
) {
  const connection = await prisma.calendarConnection.findFirst({
    where: {
      webhookChannelId: channelId,
      webhookResourceId: resourceId,
    },
    select: { businessId: true },
  });

  return connection?.businessId ?? null;
}
