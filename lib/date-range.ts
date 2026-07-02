import { addDays, format, parse, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";

import { startOfDateInTimezone } from "@/lib/datetime";

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string) {
  return ISO_DATE_PATTERN.test(value);
}

export function ymdToDateRange(from?: string, to?: string): DateRange | undefined {
  if (!from || !isIsoDate(from)) {
    return undefined;
  }

  return {
    from: parse(from, "yyyy-MM-dd", new Date()),
    to: to && isIsoDate(to) ? parse(to, "yyyy-MM-dd", new Date()) : undefined,
  };
}

export function dateRangeToYmd(range: DateRange | undefined) {
  if (!range?.from) {
    return { from: undefined, to: undefined };
  }

  return {
    from: format(range.from, "yyyy-MM-dd"),
    to: range.to ? format(range.to, "yyyy-MM-dd") : undefined,
  };
}

export function formatDateRangeLabel(
  range: DateRange | undefined,
  placeholder = "Zeitraum wählen",
) {
  if (!range?.from) {
    return placeholder;
  }

  const formatter = new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  if (range.to) {
    return `${formatter.format(range.from)} – ${formatter.format(range.to)}`;
  }

  return formatter.format(range.from);
}

export function getInclusiveDateRangeBounds(
  fromYmd: string,
  toYmd: string,
  timeZone: string,
) {
  const [fromYear, fromMonth, fromDay] = fromYmd.split("-").map(Number);
  const from = startOfDateInTimezone(timeZone, fromYear, fromMonth, fromDay);

  const endExclusiveYmd = format(
    addDays(parseISO(toYmd), 1),
    "yyyy-MM-dd",
  );
  const [toYear, toMonth, toDay] = endExclusiveYmd.split("-").map(Number);
  const to = startOfDateInTimezone(timeZone, toYear, toMonth, toDay);

  return { from, to };
}
