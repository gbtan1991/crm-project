"use client";

import Link from "next/link";
import {
  CalendarDays,
  FileText,
  Inbox,
  Receipt,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  invoiceStatusBadgeVariant,
  invoiceStatusLabel,
  type InvoiceStatusValue,
} from "@/lib/invoice-display";
import type { CustomerTimelineEvent } from "@/lib/customer-activity";
import { cn } from "@/lib/utils";

const TYPE_META = {
  booking: { label: "Appointment", icon: CalendarDays },
  invoice: { label: "Invoice", icon: Receipt },
  inquiry: { label: "Inquiry", icon: Inbox },
  offer: { label: "Offer", icon: FileText },
  review: { label: "Review", icon: Star },
} as const;

function statusBadgeVariant(
  type: CustomerTimelineEvent["type"],
  status: string,
): "default" | "secondary" | "success" | "destructive" | "outline" {
  if (type === "invoice") {
    return invoiceStatusBadgeVariant(status as InvoiceStatusValue);
  }
  return "outline";
}

function statusLabel(type: CustomerTimelineEvent["type"], status: string): string {
  if (type === "invoice") {
    return invoiceStatusLabel(status as InvoiceStatusValue);
  }
  return status.replaceAll("_", " ");
}

function formatTimelineDate(
  value: string,
  timeZone?: string,
  includeTime = false,
): string {
  return new Date(value).toLocaleString(undefined, {
    timeZone,
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
  });
}

export function CustomerActivityTimeline({
  events,
  timeZone,
}: {
  events: CustomerTimelineEvent[];
  timeZone?: string;
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <p className="font-medium">No activity yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Appointments and invoices for this customer will appear here in
          chronological order.
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute top-2 bottom-2 left-[15px] w-px bg-border" />
      {events.map((event, index) => {
        const meta = TYPE_META[event.type];
        const Icon = meta.icon;
        const content = (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{event.title}</p>
              <Badge variant={statusBadgeVariant(event.type, event.status)}>
                {statusLabel(event.type, event.status)}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {meta.label} ·{" "}
              {formatTimelineDate(
                event.occurredAt,
                timeZone,
                event.type === "booking",
              )}
            </p>
            {event.subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{event.subtitle}</p>
            ) : null}
          </>
        );

        return (
          <div
            key={event.id}
            className={cn("relative flex gap-4 pb-6", index === 0 && "pt-0")}
          >
            <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-card">
              <Icon className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30">
              {event.href ? (
                <Link href={event.href} className="block">
                  {content}
                </Link>
              ) : (
                content
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
