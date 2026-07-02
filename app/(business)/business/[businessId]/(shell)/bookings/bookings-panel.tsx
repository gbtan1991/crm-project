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
import { EmailHtmlField } from "@/components/email-html-field";
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
import type { AppointmentReminderSettingsRow } from "@/lib/appointment-reminders";
import type { BookingListRow, BookingStats } from "@/lib/bookings";
import { appointmentReminderPreviewVariables } from "@/lib/email-preview";

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

function reminderOffsetUnitLabel(unit: ReminderOffsetDraft["unit"], amount: number) {
  switch (unit) {
    case "MINUTES":
      return amount === 1 ? "Minute" : "Minuten";
    case "HOURS":
      return amount === 1 ? "Stunde" : "Stunden";
    case "DAYS":
      return amount === 1 ? "Tag" : "Tage";
    default:
      return String(unit);
  }
}

function reminderOffsetDescription(offset: ReminderOffsetDraft) {
  const amount = Number(offset.amount);
  const safeAmount =
    Number.isFinite(amount) && amount > 0 ? amount : Number(offset.amount) || 0;
  const label = reminderOffsetUnitLabel(offset.unit, safeAmount || 1);

  return `Erinnerung ${safeAmount || offset.amount || "?"} ${label} vor Terminbeginn senden.`;
}

function AppointmentReminderSettingsDialog({
  businessId,
  businessName,
  open,
  settings,
  onOpenChange,
  onSaved,
}: {
  businessId: string;
  businessName: string;
  open: boolean;
  settings: AppointmentReminderSettingsRow;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [subject, setSubject] = useState(settings.subject);
  const [bodyHtml, setBodyHtml] = useState(settings.bodyHtml);
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
      !bodyHtml.trim() ||
      payloadOffsets.some(
        (offset) => !Number.isFinite(offset.amount) || offset.amount < 1,
      )
    ) {
      setError("Bitte Betreff, HTML-Text und gültige Erinnerungszeiten angeben.");
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
            bodyHtml,
            offsets: payloadOffsets,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Erinnerungseinstellungen konnten nicht gespeichert werden.");
      }

      toast.success("Erinnerungseinstellungen gespeichert.");
      onOpenChange(false);
      onSaved();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Erinnerungseinstellungen konnten nicht gespeichert werden.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Terminerinnerungen</DialogTitle>
          <DialogDescription>
            Erinnerungs-E-Mails vor Terminbeginn senden.
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
              <Label>Erinnerungen aktivieren</Label>
              <p className="text-sm text-muted-foreground">
                Reminders use the connected Google or Outlook mailbox.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment-reminder-subject">Betreff</Label>
            <Input
              id="appointment-reminder-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>

          <EmailHtmlField
            id="appointment-reminder-body-html"
            value={bodyHtml}
            onChange={setBodyHtml}
            sampleVariables={appointmentReminderPreviewVariables(businessName)}
            resetWhenOpen={open}
            helpText={
              <>
                Bearbeiten Sie das HTML direkt. Verwenden Sie Vorlagenvariablen in
                doppelten geschweiften Klammern.
              </>
            }
          />

          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            Variablen: {"{{customerName}}"}, {"{{businessName}}"},{" "}
            {"{{appointmentTitle}}"}, {"{{appointmentDate}}"},{" "}
            {"{{appointmentTime}}"}, {"{{meetingUrl}}"}, {"{{meetingLink}}"}.
            {" "}
            Verwenden Sie {"{{meetingLink}}"} im HTML für einen klickbaren Meeting-Link.
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Versandzeitpunkt</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setOffsets((current) => [...current, newOffsetDraft(current.length)])
                }
              >
                <Plus className="size-4" />
                Zeitpunkt hinzufügen
              </Button>
            </div>
            {offsets.map((offset) => (
              <Card key={offset.key}>
                <CardContent className="space-y-2 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <div className="space-y-2">
                      <Label>Anzahl</Label>
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
                      <Label>Einheit vor Termin</Label>
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
                          <SelectItem value="MINUTES">Minuten</SelectItem>
                          <SelectItem value="HOURS">Stunden</SelectItem>
                          <SelectItem value="DAYS">Tage</SelectItem>
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
                      Entfernen
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
            Abbrechen
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Wird gespeichert…
              </>
            ) : (
              "Erinnerungen speichern"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

export function BookingsPanel({
  businessId,
  businessName,
  bookings,
  calendarConnected,
  stats,
  timeZone,
  reminderSettings,
}: {
  businessId: string;
  businessName: string;
  bookings: BookingListRow[];
  calendarConnected: boolean;
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
          {stats.today} heute · {stats.thisWeek} diese Woche · {stats.nextWeek} nächste
          Woche · Zeiten in {timeZone}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings className="size-4" />
            Erinnerungseinstellungen
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={!calendarConnected}
            title={
              calendarConnected
                ? undefined
                : "Verbinden Sie Google oder Outlook Kalender, bevor Sie Termine erstellen."
            }
          >
            <Plus className="size-4" />
            Neuer Termin
          </Button>
        </div>
      </div>
      {!calendarConnected ? (
        <p className="mb-6 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Verbinden Sie Google oder Outlook Kalender, bevor Sie Termine erstellen. Neue
          Termine werden als Kalenderereignisse erstellt und nach MeisterFlow synchronisiert.
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
        open={createOpen}
        timeZone={timeZone}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
      />

      <AppointmentReminderSettingsDialog
        businessId={businessId}
        businessName={businessName}
        open={settingsOpen}
        settings={reminderSettings}
        onOpenChange={setSettingsOpen}
        onSaved={refresh}
      />
    </>
  );
}
