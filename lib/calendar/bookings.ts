import {
  BookingSource,
  BookingStatus,
  type CalendarProvider,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { findOrCreateCustomerFromAttendee } from "@/lib/calendar/customers";
import type { NormalizedCalendarEvent } from "@/lib/calendar/types";

type ApplyEventOptions = {
  businessId: string;
  provider: CalendarProvider;
  isInitialImport?: boolean;
  excludeEmails?: string[];
};

function resolveSyncedBookingStatus(
  existingStatus: BookingStatus | null,
  endsAt: Date,
  now: Date,
): BookingStatus {
  if (
    existingStatus === BookingStatus.COMPLETED ||
    existingStatus === BookingStatus.CANCELLED
  ) {
    return existingStatus;
  }

  if (endsAt < now) {
    return BookingStatus.OVERDUE;
  }

  if (existingStatus === BookingStatus.SCHEDULED) {
    return BookingStatus.SCHEDULED;
  }

  return BookingStatus.CONFIRMED;
}

export async function applyCalendarEvent(
  event: NormalizedCalendarEvent,
  options: ApplyEventOptions,
) {
  const { businessId, provider, isInitialImport = false } = options;

  if (event.cancelled) {
    const existing = await prisma.booking.findUnique({
      where: {
        businessId_externalProvider_externalEventId: {
          businessId,
          externalProvider: provider,
          externalEventId: event.externalEventId,
        },
      },
    });

    if (!existing) {
      return { action: "skipped" as const };
    }

    if (existing.status === BookingStatus.CANCELLED) {
      return { action: "skipped" as const };
    }

    await prisma.booking.update({
      where: { id: existing.id },
      data: { status: BookingStatus.CANCELLED },
    });

    return { action: "cancelled" as const };
  }

  const customer = await findOrCreateCustomerFromAttendee(
    businessId,
    event.attendeeEmail,
    event.attendeeName,
    { excludeEmails: options.excludeEmails },
  );

  const existing = await prisma.booking.findUnique({
    where: {
      businessId_externalProvider_externalEventId: {
        businessId,
        externalProvider: provider,
        externalEventId: event.externalEventId,
      },
    },
  });

  const now = new Date();
  const status = resolveSyncedBookingStatus(
    existing?.status ?? null,
    event.endsAt,
    now,
  );

  const data = {
    title: event.title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    location: event.location ?? null,
    meetingUrl: event.meetingUrl ?? existing?.meetingUrl ?? null,
    notes: event.notes ?? null,
    allDay: event.allDay,
    status,
    customerId: customer?.id ?? null,
    source: BookingSource.CALENDAR_IMPORT,
    skipAutomation: isInitialImport,
  };

  if (existing) {
    await prisma.booking.update({
      where: { id: existing.id },
      data,
    });
    return { action: "updated" as const };
  }

  await prisma.booking.create({
    data: {
      businessId,
      externalEventId: event.externalEventId,
      externalProvider: provider,
      ...data,
    },
  });

  return { action: "created" as const };
}

export async function applyCalendarEvents(
  events: NormalizedCalendarEvent[],
  options: ApplyEventOptions,
) {
  const result = { created: 0, updated: 0, cancelled: 0, skipped: 0 };

  for (const event of events) {
    const { action } = await applyCalendarEvent(event, options);
    result[action === "skipped" ? "skipped" : action] += 1;
  }

  return result;
}
