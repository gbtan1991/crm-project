import type { CalendarProvider } from "@/lib/generated/prisma/client";

export type NormalizedCalendarEvent = {
  externalEventId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location?: string;
  meetingUrl?: string;
  notes?: string;
  allDay: boolean;
  cancelled: boolean;
  attendeeEmail?: string;
  attendeeName?: string;
};

export type CalendarSyncResult = {
  created: number;
  updated: number;
  cancelled: number;
  skipped: number;
};

export type CalendarConnectionContext = {
  businessId: string;
  provider: CalendarProvider;
  calendarId: string;
  timezone: string;
  accountEmail?: string | null;
};
