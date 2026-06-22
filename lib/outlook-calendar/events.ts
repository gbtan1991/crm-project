import {
  calendarEventAttendees,
  type CalendarEventPayload,
} from "@/lib/calendar/event-payload";
import { OutlookCalendarOAuth } from "@/lib/outlook-calendar/oauth";

type OutlookEventResponse = {
  id?: string;
  onlineMeeting?: { joinUrl?: string };
  onlineMeetingUrl?: string;
};

function outlookMeetingUrl(event: OutlookEventResponse): string | undefined {
  return event.onlineMeeting?.joinUrl ?? event.onlineMeetingUrl;
}

function outlookEventBody(payload: CalendarEventPayload) {
  return {
    subject: payload.title,
    body: {
      contentType: "Text",
      content: payload.notes ?? "",
    },
    start: {
      dateTime: payload.startsAt.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: payload.endsAt.toISOString(),
      timeZone: "UTC",
    },
    location: payload.location
      ? {
          displayName: payload.location,
        }
      : undefined,
    attendees: calendarEventAttendees(payload.customer).map((attendee) => ({
      emailAddress: {
        address: attendee.email,
        name: attendee.name,
      },
      type: "required",
    })),
  };
}

async function outlookCalendarRequest<T>(
  businessId: string,
  path: string,
  init: RequestInit,
): Promise<T> {
  const accessToken = await OutlookCalendarOAuth.getValidAccessToken(businessId);
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Outlook Calendar event error (${response.status}): ${body}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function createOutlookCalendarEvent(
  businessId: string,
  payload: CalendarEventPayload,
) {
  const event = await outlookCalendarRequest<OutlookEventResponse>(
    businessId,
    "/me/events",
    {
      method: "POST",
      body: JSON.stringify(outlookEventBody(payload)),
    },
  );

  if (!event.id) {
    throw new Error("Outlook Calendar did not return an event id.");
  }

  return {
    externalEventId: event.id,
    meetingUrl: outlookMeetingUrl(event),
  };
}

export async function updateOutlookCalendarEvent(
  businessId: string,
  eventId: string,
  payload: CalendarEventPayload,
) {
  const event = await outlookCalendarRequest<OutlookEventResponse>(
    businessId,
    `/me/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(outlookEventBody(payload)),
    },
  );

  return { meetingUrl: outlookMeetingUrl(event) };
}

export async function deleteOutlookCalendarEvent(
  businessId: string,
  eventId: string,
) {
  const accessToken = await OutlookCalendarOAuth.getValidAccessToken(businessId);
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (response.ok || response.status === 404 || response.status === 410) {
    return;
  }

  const body = await response.text();
  throw new Error(`Outlook Calendar event error (${response.status}): ${body}`);
}
