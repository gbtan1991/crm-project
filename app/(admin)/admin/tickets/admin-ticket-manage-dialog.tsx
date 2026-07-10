"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { businessWebsitePath } from "@/lib/business-paths";
import {
  formatWebsiteTicketDate,
  WEBSITE_TICKET_PRIORITY_LABELS,
  WEBSITE_TICKET_STATUS_LABELS,
  WEBSITE_TICKET_STATUS_OPTIONS,
  WEBSITE_TICKET_STATUS_VARIANTS,
  WEBSITE_TICKET_TYPE_LABELS,
} from "@/lib/website-ticket-display";
import type { AdminWebsiteTicketRow } from "@/lib/website-tickets";

function AdminTicketManageForm({
  ticket,
  onOpenChange,
  onSaved,
}: {
  ticket: AdminWebsiteTicketRow;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(ticket.status);
  const [adminNote, setAdminNote] = useState(ticket.adminNote ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("type", ticket.type);
      formData.set("priority", ticket.priority);
      formData.set("title", ticket.title);
      formData.set("description", ticket.description ?? "");
      formData.set("status", status);
      formData.set("adminNote", adminNote);

      const response = await fetch(
        `/api/business/${ticket.businessId}/website-tickets/${ticket.id}`,
        {
          method: "PUT",
          body: formData,
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Ticket konnte nicht aktualisiert werden.");
      }

      toast.success("Ticket aktualisiert.");
      onOpenChange(false);
      onSaved();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Ticket konnte nicht aktualisiert werden.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{ticket.title}</DialogTitle>
        <DialogDescription>
          {ticket.businessName} · Erstellt{" "}
          {formatWebsiteTicketDate(ticket.createdAt)}
        </DialogDescription>
      </DialogHeader>

      {error ? (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {WEBSITE_TICKET_TYPE_LABELS[ticket.type]}
        </Badge>
        <Badge variant="secondary">
          {WEBSITE_TICKET_PRIORITY_LABELS[ticket.priority]}
        </Badge>
        <Badge variant={WEBSITE_TICKET_STATUS_VARIANTS[ticket.status]}>
          {WEBSITE_TICKET_STATUS_LABELS[ticket.status]}
        </Badge>
      </div>

      {ticket.description ? (
        <div className="space-y-2">
          <Label>Beschreibung</Label>
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
            {ticket.description}
          </p>
        </div>
      ) : null}

      {ticket.attachments.length > 0 ? (
        <div className="space-y-2">
          <Label>Anhänge</Label>
          <div className="flex flex-wrap gap-3">
            {ticket.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 rounded-lg border p-2 text-sm hover:bg-muted"
              >
                <img
                  src={attachment.url}
                  alt={attachment.fileName}
                  className="size-12 rounded-md object-cover"
                />
                <span className="max-w-40 truncate">{attachment.fileName}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={status}
          onValueChange={(value) =>
            setStatus(value as AdminWebsiteTicketRow["status"])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEBSITE_TICKET_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {WEBSITE_TICKET_STATUS_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-ticket-note">Admin-Notiz</Label>
        <Textarea
          id="admin-ticket-note"
          value={adminNote}
          onChange={(event) => setAdminNote(event.target.value)}
          rows={4}
          placeholder="Interne Notizen für den Unternehmensinhaber …"
        />
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        <Button type="button" variant="outline" asChild>
          <Link href={businessWebsitePath(ticket.businessId)}>
            <ExternalLink className="size-4" />
            Website-Bereich öffnen
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Abbrechen
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Wird gespeichert…
              </>
            ) : (
              "Änderungen speichern"
            )}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

export function AdminTicketManageDialog({
  ticket,
  open,
  onOpenChange,
  onSaved,
}: {
  ticket: AdminWebsiteTicketRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  if (!ticket) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <AdminTicketManageForm
          key={ticket.id}
          ticket={ticket}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  );
}
