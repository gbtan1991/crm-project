"use client";

import { useEffect, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { de } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateRangeLabel } from "@/lib/date-range";
import { cn } from "@/lib/utils";

type DateRangePickerProps = {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  numberOfMonths?: number;
  align?: "start" | "center" | "end";
  disabled?: (date: Date) => boolean;
  closeOnComplete?: boolean;
};

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Zeitraum wählen",
  className,
  numberOfMonths = 2,
  align = "start",
  disabled,
  closeOnComplete = false,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(value);

  useEffect(() => {
    if (!open) {
      setDraft(value);
    }
  }, [open, value]);

  function handleSelect(range: DateRange | undefined) {
    setDraft(range);
    onChange?.(range);

    if (closeOnComplete && range?.from && range?.to) {
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "justify-start font-normal",
            !value?.from && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4" />
          {formatDateRangeLabel(value, placeholder)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="range"
          defaultMonth={draft?.from ?? value?.from}
          selected={draft}
          onSelect={handleSelect}
          numberOfMonths={numberOfMonths}
          disabled={
            disabled ??
            ((date) => date > new Date() || date < new Date("1900-01-01"))
          }
          locale={de}
        />
      </PopoverContent>
    </Popover>
  );
}
