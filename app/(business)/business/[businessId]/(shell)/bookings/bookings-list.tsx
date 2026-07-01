"use client";

import { useState } from "react";
import {
  Bell,
  BellOff,
  Building2,
  ExternalLink,
  Loader2,
  MapPin,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BOOKING_STATUS_OPTIONS,
  bookingDurationMinutes,
  bookingNeedsStatusUpdate,
  bookingStatusLabel,
  formatBookingDateKey,
  formatBookingDayHeading,
  formatBookingTime,
  isBookingMuted,
} from "@/lib/booking-display";
import type { BookingListRow } from "@/lib/bookings";
import { formatCustomerName } from "@/lib/customer-display";
import { cn } from "@/lib/utils";

export function BookingsList({
  businessId,
  bookings,
  timeZone,
  onOpenBooking,
  onUpdated,
}: {
  businessId: string;
  bookings: BookingListRow[];
  timeZone: string;
  onOpenBooking: (booking: BookingListRow) => void;
  onUpdated?: () => void;
}) {
  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Noch keine Termine. Verbinden Sie Ihren Kalender oder erstellen Sie einen neuen Termin.
        </CardContent>
      </Card>
    );
  }

  const groups = new Map<string, BookingListRow[]>();

  for (const booking of bookings) {
    const key = formatBookingDateKey(new Date(booking.startsAt), timeZone);
    const list = groups.get(key) ?? [];
    list.push(booking);
    groups.set(key, list);
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => b.localeCompare(a));

  for (const key of sortedKeys) {
    const list = groups.get(key) ?? [];
    list.sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    groups.set(key, list);
  }

  return (
    <div className="space-y-8">
      {sortedKeys.map((dateKey) => (
        <section key={dateKey}>
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">
            {formatBookingDayHeading(dateKey, timeZone)}
          </h2>
          <div className="space-y-3">
            {(groups.get(dateKey) ?? []).map((booking) => (
              <BookingCard
                key={booking.id}
                businessId={businessId}
                booking={booking}
                timeZone={timeZone}
                onOpen={() => onOpenBooking(booking)}
                onUpdated={onUpdated}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function BookingCard({
  businessId,
  booking,
  timeZone,
  onOpen,
  onUpdated,
}: {
  businessId: string;
  booking: BookingListRow;
  timeZone: string;
  onOpen: () => void;
  onUpdated?: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const muted = isBookingMuted(booking.status);
  const needsStatusUpdate = bookingNeedsStatusUpdate(
    booking.status,
    booking.endsAt,
  );
  const duration = bookingDurationMinutes(booking.startsAt, booking.endsAt);
  const customerName = booking.customer
    ? formatCustomerName(booking.customer)
    : null;

  async function patchBooking(body: Record<string, unknown>) {
    setUpdating(true);
    try {
      const response = await fetch(
        `/api/business/${businessId}/bookings/${booking.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Termin konnte nicht aktualisiert werden.");
      }

      onUpdated?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Termin konnte nicht aktualisiert werden.",
      );
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/business/${businessId}/bookings/${booking.id}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Termin konnte nicht gelöscht werden.");
      }

      toast.success("Termin gelöscht.");
      setDeleteOpen(false);
      onUpdated?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Termin konnte nicht gelöscht werden.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card
        className={cn(
          "cursor-pointer transition-shadow hover:shadow-md",
          muted && "bg-muted/20",
        )}
        onClick={onOpen}
      >
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start">
          <div
            className={cn(
              "w-20 shrink-0",
              muted ? "text-muted-foreground" : "text-foreground",
            )}
          >
            <p className="font-heading text-2xl font-bold leading-none">
              {formatBookingTime(booking.startsAt, timeZone)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{duration} min</p>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={cn(
                  "font-medium",
                  muted ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {booking.title}
              </p>
              {needsStatusUpdate ? (
                <Badge
                  variant="outline"
                  className="border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                >
                  Past meeting — update status
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {customerName ? (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="size-3.5 shrink-0" />
                  {customerName}
                </span>
              ) : null}
              {booking.location ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" />
                  {booking.location}
                </span>
              ) : null}
              {booking.meetingUrl ? (
                <a
                  href={booking.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Video className="size-3.5 shrink-0" />
                  Join meeting
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              ) : null}
            </div>

            {booking.notes ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {booking.notes}
              </p>
            ) : null}
          </div>

          <div
            className="flex shrink-0 items-center gap-2 self-start"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              title={booking.remindersEnabled ? "Erinnerungen ein" : "Erinnerungen aus"}
              disabled={updating}
              onClick={() =>
                void patchBooking({
                  remindersEnabled: !booking.remindersEnabled,
                })
              }
            >
              {booking.remindersEnabled ? (
                <Bell className="size-4" />
              ) : (
                <BellOff className="size-4 text-muted-foreground" />
              )}
            </Button>

            <Select
              value={booking.displayStatus}
              disabled={updating}
              onValueChange={(value) => void patchBooking({ status: value })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOKING_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {bookingStatusLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              title="Termin löschen"
              disabled={deleting}
              onClick={() => setDeleteOpen(true)}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Termin löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dies entfernt <strong>{booking.title}</strong> aus Ihrer Terminliste.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
