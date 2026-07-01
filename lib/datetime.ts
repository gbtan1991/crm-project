/** UTC instant for midnight at the start of a calendar day in an IANA timezone. */
export function startOfDateInTimezone(
  timeZone: string,
  year: number,
  month: number,
  day: number,
): Date {
  const ymd = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  for (let utcHour = -14; utcHour <= 14; utcHour++) {
    const candidate = new Date(Date.UTC(year, month - 1, day, utcHour, 0, 0));
    const localDate = candidate.toLocaleDateString("en-CA", { timeZone });
    const localTime = candidate.toLocaleTimeString("en-GB", {
      timeZone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
    if (localDate === ymd && localTime === "00:00") {
      return candidate;
    }
  }

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

/** UTC instant for midnight at the start of today in an IANA timezone. */
export function startOfTodayInTimezone(
  timeZone: string,
  ref: Date = new Date(),
): Date {
  const ymd = ref.toLocaleDateString("en-CA", { timeZone });
  const [year, month, day] = ymd.split("-").map(Number);
  return startOfDateInTimezone(timeZone, year, month, day);
}

export function addYears(date: Date, years: number): Date {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}

export function toRfc3339(date: Date): string {
  return date.toISOString();
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function wallClockUtcMs(parts: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
}

export function toDateTimeLocalValue(
  value: Date | string,
  timeZone?: string,
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (timeZone) {
    const parts = zonedParts(date, timeZone);
    return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function dateTimeLocalToUtcIso(value: string, timeZone: string): string {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const desiredWallClockMs = wallClockUtcMs({ year, month, day, hour, minute });

  let guess = new Date(desiredWallClockMs);
  for (let index = 0; index < 4; index += 1) {
    const actualWallClockMs = wallClockUtcMs(zonedParts(guess, timeZone));
    guess = new Date(guess.getTime() - (actualWallClockMs - desiredWallClockMs));
  }

  return guess.toISOString();
}
