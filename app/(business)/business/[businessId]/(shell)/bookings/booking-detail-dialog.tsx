"use client";

import { useState } from "react";
import { ExternalLink, Loader2, Trash2, Video } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  BOOKING_STATUS_OPTIONS,
  bookingNeedsStatusUpdate,
  bookingStatusLabel,
  formatBookingTime,
} from "@/lib/booking-display";
import type { BookingListRow } from "@/lib/bookings";
import { formatCustomerName } from "@/lib/customer-display";
import type { CustomerOption } from "@/lib/customers";
import { dateTimeLocalToUtcIso, toDateTimeLocalValue } from "@/lib/datetime";

const NO_CUSTOMER_VALUE = "no-customer";

export function BookingDetailDialog({
  businessId,
  booking,
  customers,
  open,
  timeZone,
  onOpenChange,
  onUpdated,
}: {
  businessId: string;
  booking: BookingListRow | null;
  customers: CustomerOption[];
  open: boolean;
  timeZone: string;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Appointment details</DialogTitle>
          <DialogDescription>
            {booking
              ? `${formatBookingTime(booking.startsAt, timeZone)} · ${booking.title}`
              : "Review and update this appointment."}
          </DialogDescription>
        </DialogHeader>

        {booking ? (
          <BookingDetailForm
            key={booking.id}
            businessId={businessId}
            booking={booking}
            customers={customers}
            timeZone={timeZone}
            onOpenChange={onOpenChange}
            onUpdated={onUpdated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function BookingDetailForm({
  businessId,
  booking,
  customers,
  timeZone,
  onOpenChange,
  onUpdated,
}: {
  businessId: string;
  booking: BookingListRow;
  customers: CustomerOption[];
  timeZone: string;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}) {
  const [title, setTitle] = useState(booking.title);
  const [startsAt, setStartsAt] = useState(
    toDateTimeLocalValue(booking.startsAt, timeZone),
  );
  const [endsAt, setEndsAt] = useState(
    toDateTimeLocalValue(booking.endsAt, timeZone),
  );
  const [customerId, setCustomerId] = useState(
    booking.customer?.id ?? NO_CUSTOMER_VALUE,
  );
  const [location, setLocation] = useState(booking.location ?? "");
  const [notes, setNotes] = useState(booking.notes ?? "");
  const [status, setStatus] =
    useState<BookingListRow["status"]>(booking.displayStatus);
  const [remindersEnabled, setRemindersEnabled] = useState(
    booking.remindersEnabled,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/business/${businessId}/bookings/${booking.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            startsAt: dateTimeLocalToUtcIso(startsAt, timeZone),
            endsAt: dateTimeLocalToUtcIso(endsAt, timeZone),
            location: location || null,
            notes: notes || null,
            status,
            remindersEnabled,
            customerId:
              customerId === NO_CUSTOMER_VALUE ? null : customerId,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update appointment.");
      }

      toast.success("Appointment updated.");
      onOpenChange(false);
      onUpdated?.();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Failed to update appointment.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!booking) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/business/${businessId}/bookings/${booking.id}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete appointment.");
      }

      toast.success("Appointment deleted.");
      setDeleteOpen(false);
      onOpenChange(false);
      onUpdated?.();
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete appointment.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <form onSubmit={(event) => void handleSave(event)} className="space-y-4">
        {bookingNeedsStatusUpdate(booking.status, booking.endsAt) ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            This meeting has ended. Mark it as <strong>Completed</strong> or{" "}
            <strong>Overdue</strong> so your records stay accurate.
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="detail-title">Title</Label>
          <Input
            id="detail-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="detail-start">Starts</Label>
            <Input
              id="detail-start"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-end">Ends</Label>
            <Input
              id="detail-end"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="detail-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as BookingListRow["status"])}
          >
            <SelectTrigger id="detail-status">
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="detail-customer">Customer</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger id="detail-customer">
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CUSTOMER_VALUE}>No customer</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {formatCustomerName(customer)} ({customer.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="detail-location">Location</Label>
          <Input
            id="detail-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </div>

        {booking.meetingUrl ? (
          <div className="space-y-2">
            <Label>Meeting link</Label>
            <Button type="button" variant="outline" asChild>
              <a href={booking.meetingUrl} target="_blank" rel="noreferrer">
                <Video className="size-4" />
                Join meeting
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="detail-notes">Notes</Label>
          <Textarea
            id="detail-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Reminders</p>
            <p className="text-xs text-muted-foreground">
              Send reminder notifications for this appointment.
            </p>
          </div>
          <Switch
            checked={remindersEnabled}
            onCheckedChange={setRemindersEnabled}
          />
        </div>

        {error ? (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={saving || deleting}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </DialogFooter>
      </form>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the appointment from your list. Calendar events are not
              deleted in Google or Outlook.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete appointment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
