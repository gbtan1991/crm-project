"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BookingDetailDialog } from "@/app/(business)/business/[businessId]/(shell)/bookings/booking-detail-dialog";
import { BookingsList } from "@/app/(business)/business/[businessId]/(shell)/bookings/bookings-list";
import { CreateBookingDialog } from "@/app/(business)/business/[businessId]/(shell)/bookings/create-booking-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { AppointmentReminderSettingsRow } from "@/lib/appointment-reminders";
import type { BookingListRow, BookingStats } from "@/lib/bookings";
import type { CustomerOption } from "@/lib/customers";

type ReminderOffsetDraft = {
  key: string;
  amount: string;
  unit: "MINUTES" | "HOURS" | "DAYS";
};

function newOffsetDraft(index = 0): ReminderOffsetDraft {
  return {
    key: `offset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    amount: index === 0 ? "1" : "24",
    unit: index === 0 ? "HOURS" : "HOURS",
  };
}

function reminderOffsetDescription(offset: ReminderOffsetDraft) {
  const amount = Number(offset.amount);
  const safeAmount =
    Number.isFinite(amount) && amount > 0 ? amount : Number(offset.amount) || 0;
  const unit = offset.unit.toLowerCase().replace(/s$/, "");
  const label = safeAmount === 1 ? unit : `${unit}s`;

  return `Send reminder ${safeAmount || offset.amount || "?"} ${label} before the appointment starts.`;
}

function AppointmentReminderSettingsDialog({
  businessId,
  open,
  settings,
  onOpenChange,
  onSaved,
}: {
  businessId: string;
  open: boolean;
  settings: AppointmentReminderSettingsRow;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [subject, setSubject] = useState(settings.subject);
  const [bodyText, setBodyText] = useState(settings.bodyText);
  const [offsets, setOffsets] = useState<ReminderOffsetDraft[]>(
    settings.offsets.map((offset) => ({
      key: offset.id,
      amount: String(offset.amount),
      unit: offset.unit,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateOffset(key: string, patch: Partial<ReminderOffsetDraft>) {
    setOffsets((current) =>
      current.map((offset) =>
        offset.key === key ? { ...offset, ...patch } : offset,
      ),
    );
  }

  async function handleSave() {
    setError(null);
    const payloadOffsets = offsets.map((offset, index) => ({
      amount: Number(offset.amount),
      unit: offset.unit,
      sortOrder: index,
    }));

    if (
      !subject.trim() ||
      !bodyText.trim() ||
      payloadOffsets.some(
        (offset) => !Number.isFinite(offset.amount) || offset.amount < 1,
      )
    ) {
      setError("Add a subject, body, and valid reminder times.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `/api/business/${businessId}/appointment-reminders`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled,
            subject,
            bodyText,
            offsets: payloadOffsets,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save reminder settings.");
      }

      toast.success("Appointment reminder settings saved.");
      onOpenChange(false);
      onSaved();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Failed to save reminder settings.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Appointment reminders</DialogTitle>
          <DialogDescription>
            Send reminder emails before appointment start times.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {error ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label>Enable reminders</Label>
              <p className="text-sm text-muted-foreground">
                Reminders use the connected Google or Outlook mailbox.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment-reminder-subject">Subject</Label>
            <Input
              id="appointment-reminder-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment-reminder-body">Body</Label>
            <Textarea
              id="appointment-reminder-body"
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              rows={9}
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            Variables: {"{{customerName}}"}, {"{{businessName}}"},{" "}
            {"{{appointmentTitle}}"}, {"{{appointmentDate}}"},{" "}
            {"{{appointmentTime}}"}, {"{{meetingUrl}}"}.
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>When to send</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setOffsets((current) => [...current, newOffsetDraft(current.length)])
                }
              >
                <Plus className="size-4" />
                Add time
              </Button>
            </div>
            {offsets.map((offset) => (
              <Card key={offset.key}>
                <CardContent className="space-y-2 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        min="1"
                        value={offset.amount}
                        onChange={(event) =>
                          updateOffset(offset.key, { amount: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit before appointment</Label>
                      <Select
                        value={offset.unit}
                        onValueChange={(value) =>
                          updateOffset(offset.key, {
                            unit: value as "MINUTES" | "HOURS" | "DAYS",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MINUTES">Minutes</SelectItem>
                          <SelectItem value="HOURS">Hours</SelectItem>
                          <SelectItem value="DAYS">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={offsets.length === 1}
                      onClick={() =>
                        setOffsets((current) =>
                          current.filter((item) => item.key !== offset.key),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reminderOffsetDescription(offset)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save reminders"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BookingsPanel({
  businessId,
  bookings,
  calendarConnected,
  customers,
  stats,
  timeZone,
  reminderSettings,
}: {
  businessId: string;
  bookings: BookingListRow[];
  calendarConnected: boolean;
  customers: CustomerOption[];
  stats: BookingStats;
  timeZone: string;
  reminderSettings: AppointmentReminderSettingsRow;
}) {
  const router = useRouter();
  const [selectedBooking, setSelectedBooking] = useState<BookingListRow | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  function openBooking(booking: BookingListRow) {
    setSelectedBooking(booking);
    setDetailOpen(true);
  }

  function refresh() {
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">
          {stats.today} today · {stats.thisWeek} this week · {stats.nextWeek} next
          week · Times shown in {timeZone}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings className="size-4" />
            Reminder settings
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={!calendarConnected}
            title={
              calendarConnected
                ? undefined
                : "Connect Google or Outlook Calendar before creating appointments."
            }
          >
            <Plus className="size-4" />
            New appointment
          </Button>
        </div>
      </div>
      {!calendarConnected ? (
        <p className="mb-6 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Connect Google or Outlook Calendar before creating appointments. New
          appointments are created as calendar events and synced back to
          MeisterFlow.
        </p>
      ) : null}

      <BookingsList
        businessId={businessId}
        bookings={bookings}
        timeZone={timeZone}
        onOpenBooking={openBooking}
        onUpdated={refresh}
      />

      <BookingDetailDialog
        businessId={businessId}
        booking={selectedBooking}
        customers={customers}
        open={detailOpen}
        timeZone={timeZone}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelectedBooking(null);
          }
        }}
        onUpdated={refresh}
      />

      <CreateBookingDialog
        businessId={businessId}
        calendarConnected={calendarConnected}
        customers={customers}
        open={createOpen}
        timeZone={timeZone}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
      />

      <AppointmentReminderSettingsDialog
        businessId={businessId}
        open={settingsOpen}
        settings={reminderSettings}
        onOpenChange={setSettingsOpen}
        onSaved={refresh}
      />
    </>
  );
}
