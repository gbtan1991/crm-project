import { CalendarProvider } from "@/lib/generated/prisma/client";
import {
  type CalendarEventPayload,
} from "@/lib/calendar/event-payload";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from "@/lib/google-calendar/events";
import {
  createOutlookCalendarEvent,
  deleteOutlookCalendarEvent,
  updateOutlookCalendarEvent,
} from "@/lib/outlook-calendar/events";
import { prisma } from "@/lib/prisma";

export class CalendarNotConnectedError extends Error {
  constructor() {
    super("Connect a calendar before creating appointments.");
    this.name = "CalendarNotConnectedError";
  }
}

type ConnectedCalendarContext = {
  businessId: string;
  provider: CalendarProvider;
  calendarId: string;
  timeZone: string;
};

export async function getConnectedCalendarContext(
  businessId: string,
): Promise<ConnectedCalendarContext> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      config: true,
      calendarConnection: true,
    },
  });

  const connection = business?.calendarConnection;
  if (!business || !connection?.connectedAt || !connection.provider) {
    throw new CalendarNotConnectedError();
  }

  return {
    businessId,
    provider: connection.provider,
    calendarId: connection.calendarId ?? "primary",
    timeZone: business.config?.timezone ?? "UTC",
  };
}

export async function createCalendarEvent(
  ctx: ConnectedCalendarContext,
  payload: Omit<CalendarEventPayload, "timeZone">,
) {
  const eventPayload = { ...payload, timeZone: ctx.timeZone };

  if (ctx.provider === CalendarProvider.GOOGLE) {
    return createGoogleCalendarEvent(
      ctx.businessId,
      ctx.calendarId,
      eventPayload,
    );
  }

  return createOutlookCalendarEvent(ctx.businessId, eventPayload);
}

export async function updateCalendarEvent(
  ctx: ConnectedCalendarContext,
  eventId: string,
  payload: Omit<CalendarEventPayload, "timeZone">,
) {
  const eventPayload = { ...payload, timeZone: ctx.timeZone };

  if (ctx.provider === CalendarProvider.GOOGLE) {
    return updateGoogleCalendarEvent(
      ctx.businessId,
      ctx.calendarId,
      eventId,
      eventPayload,
    );
  }

  return updateOutlookCalendarEvent(ctx.businessId, eventId, eventPayload);
}

export async function deleteCalendarEvent(
  ctx: ConnectedCalendarContext,
  eventId: string,
) {
  if (ctx.provider === CalendarProvider.GOOGLE) {
    await deleteGoogleCalendarEvent(ctx.businessId, ctx.calendarId, eventId);
    return;
  }

  await deleteOutlookCalendarEvent(ctx.businessId, eventId);
}
