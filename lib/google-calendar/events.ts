import { GoogleCalendarOAuth } from "@/lib/google-calendar/oauth";
import { calendarEventAttendees, type CalendarEventPayload } from "@/lib/calendar/event-payload";

type GoogleEventResponse = {
  id?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
    }>;
  };
};

function googleMeetingUrl(event: GoogleEventResponse): string | undefined {
  return (
    event.hangoutLink ??
    event.conferenceData?.entryPoints?.find(
      (entryPoint) => entryPoint.entryPointType === "video" && entryPoint.uri,
    )?.uri
  );
}

function googleEventBody(payload: CalendarEventPayload) {
  return {
    summary: payload.title,
    description: payload.notes ?? undefined,
    location: payload.location ?? undefined,
    start: {
      dateTime: payload.startsAt.toISOString(),
      timeZone: payload.timeZone,
    },
    end: {
      dateTime: payload.endsAt.toISOString(),
      timeZone: payload.timeZone,
    },
    attendees: calendarEventAttendees(payload.customer).map((attendee) => ({
      email: attendee.email,
      displayName: attendee.name,
    })),
  };
}

async function googleCalendarRequest<T>(
  businessId: string,
  calendarId: string,
  path: string,
  init: RequestInit,
): Promise<T> {
  const accessToken = await GoogleCalendarOAuth.getValidAccessToken(businessId);
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Calendar event error (${response.status}): ${body}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function createGoogleCalendarEvent(
  businessId: string,
  calendarId: string,
  payload: CalendarEventPayload,
) {
  const event = await googleCalendarRequest<GoogleEventResponse>(
    businessId,
    calendarId,
    "/events?sendUpdates=all",
    {
      method: "POST",
      body: JSON.stringify(googleEventBody(payload)),
    },
  );

  if (!event.id) {
    throw new Error("Google Calendar did not return an event id.");
  }

  return {
    externalEventId: event.id,
    meetingUrl: googleMeetingUrl(event),
  };
}

export async function updateGoogleCalendarEvent(
  businessId: string,
  calendarId: string,
  eventId: string,
  payload: CalendarEventPayload,
) {
  const event = await googleCalendarRequest<GoogleEventResponse>(
    businessId,
    calendarId,
    `/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: "PATCH",
      body: JSON.stringify(googleEventBody(payload)),
    },
  );

  return { meetingUrl: googleMeetingUrl(event) };
}

export async function deleteGoogleCalendarEvent(
  businessId: string,
  calendarId: string,
  eventId: string,
) {
  const accessToken = await GoogleCalendarOAuth.getValidAccessToken(businessId);
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (response.ok || response.status === 404 || response.status === 410) {
    return;
  }

  const body = await response.text();
  throw new Error(`Google Calendar event error (${response.status}): ${body}`);
}
