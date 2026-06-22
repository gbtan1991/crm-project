import { CalendarProvider } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { addYears, startOfTodayInTimezone, toRfc3339 } from "@/lib/datetime";
import { applyCalendarEvents } from "@/lib/calendar/bookings";
import type {
  CalendarConnectionContext,
  CalendarSyncResult,
  NormalizedCalendarEvent,
} from "@/lib/calendar/types";
import { OutlookCalendarOAuth } from "@/lib/outlook-calendar/oauth";

type OutlookEvent = {
  id?: string;
  subject?: string;
  bodyPreview?: string;
  location?: { displayName?: string };
  onlineMeeting?: { joinUrl?: string };
  onlineMeetingUrl?: string;
  webLink?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  isAllDay?: boolean;
  isCancelled?: boolean;
  attendees?: Array<{
    emailAddress?: { address?: string; name?: string };
    type?: string;
  }>;
  "@removed"?: { reason?: string };
};

type OutlookDeltaResponse = {
  value?: OutlookEvent[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
};

function parseOutlookEvent(event: OutlookEvent): NormalizedCalendarEvent | null {
  if (!event.id) {
    return null;
  }

  if (event["@removed"]) {
    return {
      externalEventId: event.id,
      title: "Removed event",
      startsAt: new Date(),
      endsAt: new Date(),
      allDay: false,
      cancelled: true,
    };
  }

  if (!event.start?.dateTime || !event.end?.dateTime) {
    return null;
  }

  const attendee = event.attendees?.find(
    (a) => a.emailAddress?.address && a.type !== "organizer",
  );

  return {
    externalEventId: event.id,
    title: event.subject?.trim() || "Untitled event",
    startsAt: new Date(event.start.dateTime),
    endsAt: new Date(event.end.dateTime),
    location: event.location?.displayName ?? undefined,
    meetingUrl: event.onlineMeeting?.joinUrl ?? event.onlineMeetingUrl,
    notes: event.bodyPreview ?? undefined,
    allDay: Boolean(event.isAllDay),
    cancelled: Boolean(event.isCancelled),
    attendeeEmail: attendee?.emailAddress?.address,
    attendeeName: attendee?.emailAddress?.name,
  };
}

async function fetchOutlookDelta(
  accessToken: string,
  url: string,
): Promise<OutlookDeltaResponse> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Outlook Calendar API error (${response.status}): ${body}`);
  }

  return response.json() as Promise<OutlookDeltaResponse>;
}

function buildOutlookInitialDeltaUrl(ctx: CalendarConnectionContext) {
  const start = startOfTodayInTimezone(ctx.timezone);
  const end = addYears(start, 2);
  const params = new URLSearchParams({
    startDateTime: toRfc3339(start),
    endDateTime: toRfc3339(end),
    $top: "100",
  });

  return `https://graph.microsoft.com/v1.0/me/calendarView/delta?${params}`;
}

export async function runOutlookInitialSync(
  ctx: CalendarConnectionContext,
): Promise<CalendarSyncResult> {
  const accessToken = await OutlookCalendarOAuth.getValidAccessToken(
    ctx.businessId,
  );
  const timeMin = startOfTodayInTimezone(ctx.timezone);

  let url: string | undefined = buildOutlookInitialDeltaUrl(ctx);
  const events: NormalizedCalendarEvent[] = [];
  let deltaLink: string | undefined;

  while (url) {
    const page = await fetchOutlookDelta(accessToken, url);
    for (const item of page.value ?? []) {
      const parsed = parseOutlookEvent(item);
      if (!parsed || parsed.cancelled) {
        continue;
      }
      if (parsed.endsAt >= timeMin) {
        events.push(parsed);
      }
    }

    url = page["@odata.nextLink"];
    if (page["@odata.deltaLink"]) {
      deltaLink = page["@odata.deltaLink"];
    }
  }

  const result = await applyCalendarEvents(events, {
    businessId: ctx.businessId,
    provider: CalendarProvider.OUTLOOK,
    isInitialImport: true,
    excludeEmails: ctx.accountEmail ? [ctx.accountEmail] : [],
  });

  await prisma.calendarConnection.update({
    where: { businessId: ctx.businessId },
    data: {
      calendarId: "primary",
      deltaLink: deltaLink ?? null,
      syncToken: null,
      initialSyncAt: new Date(),
      lastSyncedAt: new Date(),
      lastSyncError: null,
    },
  });

  return result;
}

export async function runOutlookIncrementalSync(
  ctx: CalendarConnectionContext,
): Promise<CalendarSyncResult> {
  const connection = await prisma.calendarConnection.findUnique({
    where: { businessId: ctx.businessId },
  });

  if (!connection?.deltaLink) {
    return runOutlookInitialSync(ctx);
  }

  const accessToken = await OutlookCalendarOAuth.getValidAccessToken(
    ctx.businessId,
  );

  let url: string | undefined = connection.deltaLink;
  const events: NormalizedCalendarEvent[] = [];
  let deltaLink: string | undefined;

  while (url) {
    const page = await fetchOutlookDelta(accessToken, url);
    for (const item of page.value ?? []) {
      const parsed = parseOutlookEvent(item);
      if (parsed) {
        events.push(parsed);
      }
    }

    url = page["@odata.nextLink"];
    if (page["@odata.deltaLink"]) {
      deltaLink = page["@odata.deltaLink"];
    }
  }

  const result = await applyCalendarEvents(events, {
    businessId: ctx.businessId,
    provider: CalendarProvider.OUTLOOK,
    isInitialImport: false,
    excludeEmails: ctx.accountEmail ? [ctx.accountEmail] : [],
  });

  await prisma.calendarConnection.update({
    where: { businessId: ctx.businessId },
    data: {
      deltaLink: deltaLink ?? connection.deltaLink,
      lastSyncedAt: new Date(),
      lastSyncError: null,
    },
  });

  return result;
}
