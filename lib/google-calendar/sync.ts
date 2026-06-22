import { CalendarProvider } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { startOfTodayInTimezone, toRfc3339 } from "@/lib/datetime";
import { applyCalendarEvents } from "@/lib/calendar/bookings";
import type {
  CalendarConnectionContext,
  CalendarSyncResult,
  NormalizedCalendarEvent,
} from "@/lib/calendar/types";
import { GoogleCalendarOAuth } from "@/lib/google-calendar/oauth";

type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  hangoutLink?: string;
  location?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
    }>;
  };
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
  }>;
};

type GoogleEventsResponse = {
  items?: GoogleEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

function parseGoogleEvent(event: GoogleEvent): NormalizedCalendarEvent | null {
  if (!event.id) {
    return null;
  }

  const allDay = Boolean(event.start?.date && !event.start?.dateTime);
  const startRaw = event.start?.dateTime ?? event.start?.date;
  const endRaw = event.end?.dateTime ?? event.end?.date;

  if (!startRaw || !endRaw) {
    return null;
  }

  const startsAt = new Date(startRaw);
  const endsAt = new Date(endRaw);

  const attendee = event.attendees?.find(
    (a) => a.email && !a.organizer && !a.self,
  );
  const meetingUrl =
    event.hangoutLink ??
    event.conferenceData?.entryPoints?.find(
      (entryPoint) => entryPoint.entryPointType === "video" && entryPoint.uri,
    )?.uri;

  return {
    externalEventId: event.id,
    title: event.summary?.trim() || "Untitled event",
    startsAt,
    endsAt,
    location: event.location ?? undefined,
    meetingUrl,
    notes: event.description ?? undefined,
    allDay,
    cancelled: event.status === "cancelled",
    attendeeEmail: attendee?.email,
    attendeeName: attendee?.displayName,
  };
}

async function fetchGoogleEventsPage(
  accessToken: string,
  calendarId: string,
  params: URLSearchParams,
): Promise<GoogleEventsResponse> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(
      `Google Calendar API error (${response.status}): ${body}`,
    );
    if (response.status === 410) {
      (error as Error & { status: number }).status = 410;
    }
    throw error;
  }

  return response.json() as Promise<GoogleEventsResponse>;
}

export async function runGoogleInitialSync(
  ctx: CalendarConnectionContext,
): Promise<CalendarSyncResult> {
  const accessToken = await GoogleCalendarOAuth.getValidAccessToken(
    ctx.businessId,
  );
  const calendarId = ctx.calendarId || "primary";
  const timeMin = startOfTodayInTimezone(ctx.timezone);

  const params = new URLSearchParams({
    timeMin: toRfc3339(timeMin),
    singleEvents: "true",
    showDeleted: "true",
    conferenceDataVersion: "1",
    maxResults: "250",
  });

  const events: NormalizedCalendarEvent[] = [];
  let pageToken: string | undefined;
  let syncToken: string | undefined;

  do {
    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const page = await fetchGoogleEventsPage(accessToken, calendarId, params);
    for (const item of page.items ?? []) {
      const parsed = parseGoogleEvent(item);
      if (!parsed || parsed.cancelled) {
        continue;
      }
      if (parsed.endsAt >= timeMin) {
        events.push(parsed);
      }
    }

    pageToken = page.nextPageToken;
    if (page.nextSyncToken) {
      syncToken = page.nextSyncToken;
    }
  } while (pageToken);

  const applyOptions = {
    businessId: ctx.businessId,
    provider: CalendarProvider.GOOGLE,
    isInitialImport: true,
    excludeEmails: ctx.accountEmail ? [ctx.accountEmail] : [],
  };

  const result = await applyCalendarEvents(events, applyOptions);

  await prisma.calendarConnection.update({
    where: { businessId: ctx.businessId },
    data: {
      calendarId,
      syncToken: syncToken ?? null,
      deltaLink: null,
      initialSyncAt: new Date(),
      lastSyncedAt: new Date(),
      lastSyncError: null,
    },
  });

  return result;
}

export async function runGoogleIncrementalSync(
  ctx: CalendarConnectionContext,
): Promise<CalendarSyncResult> {
  const connection = await prisma.calendarConnection.findUnique({
    where: { businessId: ctx.businessId },
  });

  if (!connection?.syncToken) {
    return runGoogleInitialSync(ctx);
  }

  const accessToken = await GoogleCalendarOAuth.getValidAccessToken(
    ctx.businessId,
  );
  const calendarId = ctx.calendarId || "primary";

  const params = new URLSearchParams({
    syncToken: connection.syncToken,
    showDeleted: "true",
    conferenceDataVersion: "1",
    maxResults: "250",
  });

  const events: NormalizedCalendarEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  try {
    do {
      if (pageToken) {
        params.set("pageToken", pageToken);
      } else {
        params.delete("pageToken");
      }

      const page = await fetchGoogleEventsPage(accessToken, calendarId, params);
      for (const item of page.items ?? []) {
        const parsed = parseGoogleEvent(item);
        if (parsed) {
          events.push(parsed);
        }
      }

      pageToken = page.nextPageToken;
      if (page.nextSyncToken) {
        nextSyncToken = page.nextSyncToken;
      }
    } while (pageToken);
  } catch (error) {
    const status =
      error instanceof Error && "status" in error
        ? (error as Error & { status?: number }).status
        : undefined;
    const message = error instanceof Error ? error.message : String(error);
    if (status === 410 || message.includes("(410)")) {
      await prisma.calendarConnection.update({
        where: { businessId: ctx.businessId },
        data: { syncToken: null },
      });
      return runGoogleInitialSync(ctx);
    }
    throw error;
  }

  const result = await applyCalendarEvents(events, {
    businessId: ctx.businessId,
    provider: CalendarProvider.GOOGLE,
    isInitialImport: false,
    excludeEmails: ctx.accountEmail ? [ctx.accountEmail] : [],
  });

  await prisma.calendarConnection.update({
    where: { businessId: ctx.businessId },
    data: {
      syncToken: nextSyncToken ?? connection.syncToken,
      lastSyncedAt: new Date(),
      lastSyncError: null,
    },
  });

  return result;
}
