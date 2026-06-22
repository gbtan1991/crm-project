import type { BookingStatus } from "@/lib/generated/prisma/client";

export type BookingDisplayStatus = BookingStatus;

export function effectiveBookingStatus(
  status: BookingStatus,
  endsAt: Date | string,
  ref = new Date(),
): BookingDisplayStatus {
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;

  if (
    status === "COMPLETED" ||
    status === "CANCELLED" ||
    status === "OVERDUE"
  ) {
    return status;
  }

  if (end < ref) {
    return "OVERDUE";
  }

  return status;
}

export function bookingStatusLabel(status: BookingDisplayStatus): string {
  switch (status) {
    case "SCHEDULED":
      return "Planned";
    case "CONFIRMED":
      return "Confirmed";
    case "COMPLETED":
      return "Completed";
    case "OVERDUE":
      return "Overdue";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

export function isBookingMuted(status: BookingStatus): boolean {
  return status === "COMPLETED" || status === "OVERDUE";
}

/** Past end time but still open (Planned/Confirmed) — prompt user to update status. */
export function bookingNeedsStatusUpdate(
  status: BookingStatus,
  endsAt: Date | string,
  ref = new Date(),
): boolean {
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  return (
    end < ref &&
    (status === "SCHEDULED" || status === "CONFIRMED")
  );
}

export function bookingDurationMinutes(startsAt: Date | string, endsAt: Date | string) {
  const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
}

export function formatBookingTime(
  value: Date | string,
  timeZone?: string,
): string {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

export function formatBookingDayHeading(
  dateKey: string,
  timeZone?: string,
): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  return date
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone,
    })
    .toUpperCase();
}

export function formatBookingDateKey(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone });
}

export const BOOKING_STATUS_OPTIONS: BookingStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
  "COMPLETED",
  "OVERDUE",
];
