import { CalendarProvider } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { stopGoogleWebhook } from "@/lib/google-calendar/webhooks";
import { stopOutlookWebhook } from "@/lib/outlook-calendar/webhooks";

export async function disconnectBusinessCalendar(businessId: string) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { businessId },
  });

  if (connection?.provider === CalendarProvider.GOOGLE) {
    await stopGoogleWebhook(businessId).catch(() => undefined);
  } else if (connection?.provider === CalendarProvider.OUTLOOK) {
    await stopOutlookWebhook(businessId).catch(() => undefined);
  }

  await prisma.booking.deleteMany({
    where: { businessId, source: "CALENDAR_IMPORT" },
  });

  if (!connection) {
    return;
  }

  await prisma.calendarConnection.update({
    where: { businessId },
    data: {
      provider: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      accountEmail: null,
      accountId: null,
      calendarId: "primary",
      connectedAt: null,
      syncToken: null,
      deltaLink: null,
      initialSyncAt: null,
      lastSyncedAt: null,
      lastSyncError: null,
      webhookChannelId: null,
      webhookResourceId: null,
      webhookExpiresAt: null,
      graphSubscriptionId: null,
      graphSubscriptionExpiresAt: null,
    },
  });
}
