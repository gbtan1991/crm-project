import { CalendarProvider } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { CalendarSyncResult } from "@/lib/calendar/types";
import { syncBusinessTimeZoneFromCalendar } from "@/lib/calendar/timezone";
import { runGoogleIncrementalSync, runGoogleInitialSync } from "@/lib/google-calendar/sync";
import {
  registerGoogleWebhook,
  renewGoogleWebhookIfNeeded,
} from "@/lib/google-calendar/webhooks";
import {
  runOutlookIncrementalSync,
  runOutlookInitialSync,
} from "@/lib/outlook-calendar/sync";
import {
  registerOutlookWebhook,
  renewOutlookWebhookIfNeeded,
} from "@/lib/outlook-calendar/webhooks";

async function getConnectionContext(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      config: true,
      calendarConnection: true,
    },
  });

  const connection = business?.calendarConnection;
  if (!business || !connection?.connectedAt || !connection.provider) {
    return null;
  }

  return {
    businessId,
    provider: connection.provider,
    calendarId: connection.calendarId ?? "primary",
    timezone: business.config?.timezone ?? "UTC",
    initialSyncAt: connection.initialSyncAt,
    accountEmail: connection.accountEmail,
  };
}

export async function setupCalendarSync(businessId: string) {
  await syncBusinessTimeZoneFromCalendar(businessId).catch(() => null);

  const ctx = await getConnectionContext(businessId);
  if (!ctx) {
    throw new Error("Calendar is not connected.");
  }

  const initialResult =
    ctx.provider === CalendarProvider.GOOGLE
      ? await runGoogleInitialSync(ctx)
      : await runOutlookInitialSync(ctx);

  if (ctx.provider === CalendarProvider.GOOGLE) {
    await registerGoogleWebhook(businessId);
  } else {
    await registerOutlookWebhook(businessId);
  }

  return initialResult;
}

export async function syncBusinessCalendar(
  businessId: string,
  options: { initial?: boolean } = {},
): Promise<CalendarSyncResult> {
  await syncBusinessTimeZoneFromCalendar(businessId).catch(() => null);

  const ctx = await getConnectionContext(businessId);
  if (!ctx) {
    throw new Error("Calendar is not connected.");
  }

  try {
    let result: CalendarSyncResult;

    if (options.initial || !ctx.initialSyncAt) {
      result =
        ctx.provider === CalendarProvider.GOOGLE
          ? await runGoogleInitialSync(ctx)
          : await runOutlookInitialSync(ctx);
    } else {
      result =
        ctx.provider === CalendarProvider.GOOGLE
          ? await runGoogleIncrementalSync(ctx)
          : await runOutlookIncrementalSync(ctx);
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.calendarConnection.update({
      where: { businessId },
      data: { lastSyncError: message },
    });
    throw error;
  }
}

export async function syncAllBusinessCalendars() {
  const connections = await prisma.calendarConnection.findMany({
    where: {
      connectedAt: { not: null },
      provider: { not: null },
      initialSyncAt: { not: null },
    },
    select: { businessId: true },
  });

  const summary = {
    businesses: connections.length,
    succeeded: 0,
    failed: 0,
    results: [] as Array<{ businessId: string; result?: CalendarSyncResult; error?: string }>,
  };

  for (const { businessId } of connections) {
    try {
      const result = await syncBusinessCalendar(businessId);
      summary.succeeded += 1;
      summary.results.push({ businessId, result });
    } catch (error) {
      summary.failed += 1;
      summary.results.push({
        businessId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return summary;
}

export async function renewAllCalendarWebhooks() {
  const connections = await prisma.calendarConnection.findMany({
    where: {
      connectedAt: { not: null },
      provider: { not: null },
    },
    select: { businessId: true, provider: true },
  });

  const summary = {
    businesses: connections.length,
    renewed: 0,
    failed: 0,
  };

  for (const { businessId, provider } of connections) {
    try {
      const result =
        provider === CalendarProvider.GOOGLE
          ? await renewGoogleWebhookIfNeeded(businessId)
          : await renewOutlookWebhookIfNeeded(businessId);

      if (result.renewed) {
        summary.renewed += 1;
      }
    } catch (error) {
      summary.failed += 1;
      console.error(`[calendar] webhook renewal failed for ${businessId}`, error);
    }
  }

  return summary;
}

export async function handleCalendarWebhook(businessId: string) {
  return syncBusinessCalendar(businessId);
}
