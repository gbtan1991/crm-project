import { CalendarProvider } from "@/lib/generated/prisma/client";
import { GoogleCalendarOAuth } from "@/lib/google-calendar/oauth";
import { OutlookCalendarOAuth } from "@/lib/outlook-calendar/oauth";
import { prisma } from "@/lib/prisma";

const WINDOWS_TO_IANA_TIMEZONES: Record<string, string> = {
  "India Standard Time": "Asia/Kolkata",
  "Pacific Standard Time": "America/Los_Angeles",
  "Mountain Standard Time": "America/Denver",
  "Central Standard Time": "America/Chicago",
  "Eastern Standard Time": "America/New_York",
  "GMT Standard Time": "Europe/London",
  "W. Europe Standard Time": "Europe/Berlin",
  "Central Europe Standard Time": "Europe/Budapest",
  "Romance Standard Time": "Europe/Paris",
  "South Africa Standard Time": "Africa/Johannesburg",
  "AUS Eastern Standard Time": "Australia/Sydney",
};

export function normalizeIanaTimeZone(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const mapped = WINDOWS_TO_IANA_TIMEZONES[value] ?? value;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: mapped });
    return mapped;
  } catch {
    return null;
  }
}

export async function syncBusinessTimeZoneFromCalendar(businessId: string) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { businessId },
    select: { provider: true, connectedAt: true },
  });

  if (!connection?.provider || !connection.connectedAt) {
    return null;
  }

  const providerTimeZone =
    connection.provider === CalendarProvider.GOOGLE
      ? await GoogleCalendarOAuth.getPrimaryCalendarTimeZone(businessId)
      : await OutlookCalendarOAuth.getMailboxTimeZone(businessId);

  const timeZone = normalizeIanaTimeZone(providerTimeZone);
  if (!timeZone) {
    return null;
  }

  await prisma.businessConfig.upsert({
    where: { businessId },
    update: { timezone: timeZone },
    create: { businessId, timezone: timeZone },
  });

  return timeZone;
}
