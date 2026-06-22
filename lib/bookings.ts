import { BookingSource, type BookingStatus } from "@/lib/generated/prisma/client";
import {
  effectiveBookingStatus,
  formatBookingDateKey,
} from "@/lib/booking-display";
import {
  CalendarNotConnectedError,
  createCalendarEvent,
  deleteCalendarEvent,
  getConnectedCalendarContext,
  updateCalendarEvent,
} from "@/lib/calendar/events";
import { prisma } from "@/lib/prisma";
import type {
  BookingCreateInput,
  BookingUpdateInput,
} from "@/lib/validation/booking";

export type BookingListRow = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  meetingUrl: string | null;
  notes: string | null;
  status: BookingStatus;
  displayStatus: BookingStatus;
  remindersEnabled: boolean;
  allDay: boolean;
  customer: {
    id: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
};

type BookingMutationError = {
  error: string;
  status?: number;
};

export type BookingStats = {
  today: number;
  thisWeek: number;
  nextWeek: number;
};

const bookingInclude = {
  customer: {
    select: {
      id: true,
      companyName: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

function serializeBooking(booking: {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  meetingUrl: string | null;
  notes: string | null;
  status: BookingStatus;
  remindersEnabled: boolean;
  allDay: boolean;
  customer: BookingListRow["customer"];
}): BookingListRow {
  return {
    id: booking.id,
    title: booking.title,
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    location: booking.location,
    meetingUrl: booking.meetingUrl,
    notes: booking.notes,
    status: booking.status,
    displayStatus: effectiveBookingStatus(booking.status, booking.endsAt),
    remindersEnabled: booking.remindersEnabled,
    allDay: booking.allDay,
    customer: booking.customer,
  };
}

function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function computeBookingStats(
  bookings: Array<{ startsAt: string }>,
  timeZone: string,
): BookingStats {
  const now = new Date();
  const todayStart = startOfDayInTimeZone(now, timeZone);
  const weekStart = addDays(todayStart, -((todayStart.getUTCDay() + 6) % 7));
  const weekEnd = addDays(weekStart, 7);
  const nextWeekEnd = addDays(weekEnd, 7);

  let today = 0;
  let thisWeek = 0;
  let nextWeek = 0;

  for (const booking of bookings) {
    const startsAt = new Date(booking.startsAt);
    const dateKey = formatBookingDateKey(startsAt, timeZone);
    const todayKey = formatBookingDateKey(now, timeZone);

    if (dateKey === todayKey) {
      today += 1;
    }

    if (startsAt >= weekStart && startsAt < weekEnd) {
      thisWeek += 1;
    } else if (startsAt >= weekEnd && startsAt < nextWeekEnd) {
      nextWeek += 1;
    }
  }

  return { today, thisWeek, nextWeek };
}

export async function listBookingsForBusiness(businessId: string) {
  const bookings = await prisma.booking.findMany({
    where: {
      businessId,
      status: { not: "CANCELLED" },
    },
    orderBy: { startsAt: "desc" },
    include: bookingInclude,
  });

  return bookings.map(serializeBooking);
}

export async function getBookingForBusiness(
  businessId: string,
  bookingId: string,
) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, businessId },
    include: bookingInclude,
  });

  return booking ? serializeBooking(booking) : null;
}

export async function createBookingForBusiness(
  businessId: string,
  input: BookingCreateInput,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, businessId },
    select: {
      id: true,
      companyName: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });
  if (!customer) {
    return { error: "Customer not found.", status: 400 } satisfies BookingMutationError;
  }

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  const now = new Date();

  let status: BookingStatus = "CONFIRMED";
  if (endsAt < now) {
    status = "OVERDUE";
  } else if (startsAt > now) {
    status = "SCHEDULED";
  }

  let calendarContext: Awaited<ReturnType<typeof getConnectedCalendarContext>>;
  try {
    calendarContext = await getConnectedCalendarContext(businessId);
  } catch (error) {
    if (error instanceof CalendarNotConnectedError) {
      return { error: error.message, status: 409 } satisfies BookingMutationError;
    }
    throw error;
  }

  let externalEventId: string | null = null;
  try {
    const calendarEvent = await createCalendarEvent(calendarContext, {
      title: input.title,
      startsAt,
      endsAt,
      location: input.location || null,
      notes: input.notes || null,
      customer,
    });
    externalEventId = calendarEvent.externalEventId;

    const booking = await prisma.booking.upsert({
      where: {
        businessId_externalProvider_externalEventId: {
          businessId,
          externalProvider: calendarContext.provider,
          externalEventId,
        },
      },
      update: {
        title: input.title,
        startsAt,
        endsAt,
        location: input.location || null,
        meetingUrl: calendarEvent.meetingUrl ?? null,
        notes: input.notes || null,
        customerId: customer.id,
        status,
        source: BookingSource.CALENDAR_IMPORT,
        externalProvider: calendarContext.provider,
        externalEventId,
      },
      create: {
        businessId,
        title: input.title,
        startsAt,
        endsAt,
        location: input.location || null,
        meetingUrl: calendarEvent.meetingUrl ?? null,
        notes: input.notes || null,
        customerId: customer.id,
        status,
        source: BookingSource.CALENDAR_IMPORT,
        externalProvider: calendarContext.provider,
        externalEventId,
      },
      include: bookingInclude,
    });

    return { booking: serializeBooking(booking) };
  } catch (error) {
    if (externalEventId) {
      await deleteCalendarEvent(calendarContext, externalEventId).catch(
        () => undefined,
      );
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to create calendar appointment.",
      status: 502,
    } satisfies BookingMutationError;
  }
}

export async function updateBookingForBusiness(
  businessId: string,
  bookingId: string,
  input: BookingUpdateInput,
) {
  const existing = await prisma.booking.findFirst({
    where: { id: bookingId, businessId },
    include: bookingInclude,
  });

  if (!existing) {
    return null;
  }

  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, businessId },
      select: {
        id: true,
        companyName: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    if (!customer) {
      return { error: "Customer not found.", status: 400 } satisfies BookingMutationError;
    }
  }

  const startsAt =
    input.startsAt !== undefined ? new Date(input.startsAt) : existing.startsAt;
  const endsAt =
    input.endsAt !== undefined ? new Date(input.endsAt) : existing.endsAt;

  if (endsAt <= startsAt) {
    return {
      error: "End time must be after start time.",
      status: 400,
    } satisfies BookingMutationError;
  }

  const customer =
    input.customerId === undefined
      ? existing.customer
      : input.customerId
        ? await prisma.customer.findFirst({
            where: { id: input.customerId, businessId },
            select: {
              id: true,
              companyName: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          })
        : null;

  let calendarContext: Awaited<ReturnType<typeof getConnectedCalendarContext>>;
  try {
    calendarContext = await getConnectedCalendarContext(businessId);
  } catch (error) {
    if (error instanceof CalendarNotConnectedError) {
      return { error: error.message, status: 409 } satisfies BookingMutationError;
    }
    throw error;
  }

  let externalEventId = existing.externalEventId;
  let meetingUrl = existing.meetingUrl;
  if (externalEventId) {
    const calendarEvent = await updateCalendarEvent(calendarContext, externalEventId, {
      title: input.title ?? existing.title,
      startsAt,
      endsAt,
      location:
        input.location !== undefined ? input.location : existing.location,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      customer,
    });
    meetingUrl = calendarEvent.meetingUrl ?? meetingUrl;
  } else {
    const calendarEvent = await createCalendarEvent(calendarContext, {
      title: input.title ?? existing.title,
      startsAt,
      endsAt,
      location:
        input.location !== undefined ? input.location : existing.location,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      customer,
    });
    externalEventId = calendarEvent.externalEventId;
    meetingUrl = calendarEvent.meetingUrl ?? meetingUrl;
  }

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.startsAt !== undefined ? { startsAt } : {}),
      ...(input.endsAt !== undefined ? { endsAt } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.remindersEnabled !== undefined
        ? { remindersEnabled: input.remindersEnabled }
        : {}),
      ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
      source: BookingSource.CALENDAR_IMPORT,
      externalProvider: calendarContext.provider,
      externalEventId,
      meetingUrl,
    },
    include: bookingInclude,
  });

  return serializeBooking(booking);
}

export async function deleteBookingForBusiness(
  businessId: string,
  bookingId: string,
) {
  const existing = await prisma.booking.findFirst({
    where: { id: bookingId, businessId },
    select: { id: true, externalEventId: true },
  });

  if (!existing) {
    return null;
  }

  if (existing.externalEventId) {
    let calendarContext: Awaited<ReturnType<typeof getConnectedCalendarContext>>;
    try {
      calendarContext = await getConnectedCalendarContext(businessId);
    } catch (error) {
      if (error instanceof CalendarNotConnectedError) {
        return { error: error.message, status: 409 } satisfies BookingMutationError;
      }
      throw error;
    }

    await deleteCalendarEvent(calendarContext, existing.externalEventId);
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  return { ok: true as const };
}
