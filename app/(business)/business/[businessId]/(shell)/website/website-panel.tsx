"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ExternalLink,
  Globe,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { businessReviewsPath } from "@/lib/business-paths";
import { formatCustomerName } from "@/lib/customer-display";
import type { ReviewListRow } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import type {
  WebsiteOverview,
  WebsiteTicketRow,
} from "@/lib/website-tickets";

const META_PIXEL_SETUP_URL = "https://www.youtube.com/watch?v=h35eEoI4wm8";

type ReviewStats = {
  total: number;
  requested: number;
  received: number;
  declined: number;
  avgRating: number | null;
  latest: ReviewListRow | null;
};

type TicketType = WebsiteTicketRow["type"];
type TicketPriority = WebsiteTicketRow["priority"];
type TicketStatus = WebsiteTicketRow["status"];

const TYPE_LABELS: Record<TicketType, string> = {
  UI_CHANGE: "UI-Änderung",
  BUG: "Fehler",
  CONTENT: "Inhalt",
  SEO: "SEO",
  OTHER: "Sonstiges",
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Niedrig",
  MEDIUM: "Mittel",
  HIGH: "Hoch",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  PENDING: "Ausstehend",
  IN_PROGRESS: "In Bearbeitung",
  NEEDS_INFO: "Informationen benötigt",
  DONE: "Erledigt",
  REJECTED: "Abgelehnt",
};

const STATUS_VARIANTS: Record<
  TicketStatus,
  "default" | "secondary" | "destructive" | "outline" | "success"
> = {
  PENDING: "outline",
  IN_PROGRESS: "secondary",
  NEEDS_INFO: "secondary",
  DONE: "success",
  REJECTED: "destructive",
};

type TicketFormState = {
  type: TicketType;
  priority: TicketPriority;
  title: string;
  description: string;
  status?: TicketStatus;
  adminNote: string;
};

function initialForm(ticket?: WebsiteTicketRow): TicketFormState {
  return {
    type: ticket?.type ?? "UI_CHANGE",
    priority: ticket?.priority ?? "MEDIUM",
    title: ticket?.title ?? "",
    description: ticket?.description ?? "",
    status: ticket?.status,
    adminNote: ticket?.adminNote ?? "",
  };
}

function normalizeWebsiteUrl(domain: string | null) {
  if (!domain) return null;
  return domain.startsWith("http://") || domain.startsWith("https://")
    ? domain
    : `https://${domain}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusCount(tickets: WebsiteTicketRow[], status: TicketStatus) {
  return tickets.filter((ticket) => ticket.status === status).length;
}

function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const className = size === "md" ? "size-5" : "size-3.5";
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            className,
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-none text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

function RequirementStatus({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span className={active ? "text-emerald-600" : "text-muted-foreground"}>
      <span
        className={
          active
            ? "mr-2 inline-block size-2 rounded-full bg-emerald-500"
            : "mr-2 inline-block size-2 rounded-full bg-muted-foreground/40"
        }
      />
      {label}
    </span>
  );
}

function SelectedImagePreview({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return (
    <img
      src={url}
      alt={file.name}
      className="size-16 rounded-md border object-cover"
    />
  );
}

function WebsiteTicketDialog({
  businessId,
  role,
  ticket,
  open,
  onOpenChange,
  onSaved,
}: {
  businessId: string;
  role?: string;
  ticket?: WebsiteTicketRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(ticket);
  const [form, setForm] = useState<TicketFormState>(() => initialForm(ticket ?? undefined));
  const [images, setImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError("Titel ist erforderlich.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("type", form.type);
      formData.set("priority", form.priority);
      formData.set("title", form.title);
      formData.set("description", form.description);
      if (role === "ADMIN") {
        if (form.status) formData.set("status", form.status);
        if (form.adminNote) formData.set("adminNote", form.adminNote);
      }
      for (const file of images) {
        formData.append("images", file);
      }

      const response = await fetch(
        ticket
          ? `/api/business/${businessId}/website-tickets/${ticket.id}`
          : `/api/business/${businessId}/website-tickets`,
        {
          method: ticket ? "PUT" : "POST",
          body: formData,
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Ticket konnte nicht gespeichert werden.");
      }

      toast.success(isEdit ? "Website-Ticket aktualisiert." : "Website-Ticket erstellt.");
      onOpenChange(false);
      onSaved();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Ticket konnte nicht gespeichert werden.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Website-Ticket bearbeiten" : "Neues Website-Ticket"}</DialogTitle>
            <DialogDescription>
              Describe a website change, bug, or content request for the MeisterFlow team.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    type: value as TicketType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UI_CHANGE">UI-Änderung</SelectItem>
                  <SelectItem value="BUG">Fehler</SelectItem>
                  <SelectItem value="CONTENT">Inhalt</SelectItem>
                  <SelectItem value="SEO">SEO</SelectItem>
                  <SelectItem value="OTHER">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priorität</Label>
              <Select
                value={form.priority}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    priority: value as TicketPriority,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Niedrig</SelectItem>
                  <SelectItem value="MEDIUM">Mittel</SelectItem>
                  <SelectItem value="HIGH">Hoch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website-ticket-title">Titel</Label>
            <Input
              id="website-ticket-title"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="z. B. Startseiten-Headline aktualisieren"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website-ticket-description">Beschreibung</Label>
            <Textarea
              id="website-ticket-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={6}
              placeholder="Beschreiben Sie die gewünschte Änderung oder den Fehler so klar wie möglich."
            />
          </div>

          {role === "ADMIN" ? (
            <>
              <div className="space-y-2">
                <Label>Status (Admin)</Label>
                <Select
                  value={form.status ?? ticket?.status ?? "PENDING"}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value as TicketStatus,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Ausstehend</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Bearbeitung</SelectItem>
                    <SelectItem value="NEEDS_INFO">Informationen benötigt</SelectItem>
                    <SelectItem value="DONE">Erledigt</SelectItem>
                    <SelectItem value="REJECTED">Abgelehnt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website-ticket-admin-note">Admin-Notiz</Label>
                <Textarea
                  id="website-ticket-admin-note"
                  value={form.adminNote}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      adminNote: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Interne Notizen für den Unternehmensinhaber …"
                />
              </div>
            </>
          ) : null}

          {ticket?.attachments.length ? (
            <div className="space-y-2">
              <Label>Vorhandene Bilder</Label>
              <div className="flex flex-wrap gap-3">
                {ticket.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={attachment.url}
                      alt={attachment.fileName}
                      className="size-16 rounded-md border object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Bilder (optional)</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground hover:bg-muted/40">
              <Upload className="size-4" />
              Upload screenshots or images
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []);
                  setImages(selected);
                }}
              />
            </label>
            {images.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {images.map((file) => (
                  <div key={`${file.name}-${file.lastModified}`} className="relative">
                    <SelectedImagePreview file={file} />
                    <button
                      type="button"
                      className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow"
                      onClick={() =>
                        setImages((current) => current.filter((item) => item !== file))
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <DialogFooter>
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
                "Ticket speichern"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WebsitePanel({
  businessId,
  role,
  overview,
  tickets,
  reviewStats,
}: {
  businessId: string;
  role?: string;
  overview: WebsiteOverview;
  tickets: WebsiteTicketRow[];
  reviewStats: ReviewStats;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<TicketStatus | "ALL">("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<WebsiteTicketRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const websiteUrl = normalizeWebsiteUrl(overview.domain);

  const filteredTickets = useMemo(() => {
    return filter === "ALL"
      ? tickets
      : tickets.filter((ticket) => ticket.status === filter);
  }, [filter, tickets]);

  function refresh() {
    router.refresh();
  }

  function openCreate() {
    setEditingTicket(null);
    setDialogOpen(true);
  }

  function openEdit(ticket: WebsiteTicketRow) {
    setEditingTicket(ticket);
    setDialogOpen(true);
  }

  async function handleDelete(ticket: WebsiteTicketRow) {
    setDeletingId(ticket.id);
    try {
      const response = await fetch(
        `/api/business/${businessId}/website-tickets/${ticket.id}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Ticket konnte nicht gelöscht werden.");
      }

      toast.success("Website-Ticket gelöscht.");
      refresh();
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Ticket konnte nicht gelöscht werden.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="tickets">
            Tickets
            {statusCount(tickets, "PENDING") > 0 ? (
              <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                {statusCount(tickets, "PENDING")}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Neues Website-Ticket
        </Button>
      </div>

      <TabsContent value="overview" className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Website-Status</p>
              <p className="mt-2 font-heading text-2xl font-bold">
                {overview.domain ? "Online" : "Nicht gesetzt"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Ausstehende Tickets</p>
              <p className="mt-2 font-heading text-2xl font-bold">
                {statusCount(tickets, "PENDING")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">In Bearbeitung</p>
              <p className="mt-2 font-heading text-2xl font-bold">
                {statusCount(tickets, "IN_PROGRESS")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Abgeschlossen</p>
              <p className="mt-2 font-heading text-2xl font-bold">
                {statusCount(tickets, "DONE")}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Bewertungen</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href={businessReviewsPath(businessId)}>Alle Bewertungen anzeigen</Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Durchschnittsbewertung</p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="font-heading text-2xl font-bold">
                    {reviewStats.avgRating ? reviewStats.avgRating.toFixed(1) : "—"}
                  </p>
                  {reviewStats.avgRating ? (
                    <StarRating rating={Math.round(reviewStats.avgRating)} size="md" />
                  ) : null}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Erhaltene Bewertungen</p>
                <p className="mt-2 font-heading text-2xl font-bold">
                  {reviewStats.received}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reviewStats.requested} requested · {reviewStats.declined} declined
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Neueste Bewertung</p>
                {reviewStats.latest ? (
                  <div className="mt-2 space-y-1">
                    {reviewStats.latest.rating ? (
                      <StarRating rating={reviewStats.latest.rating} />
                    ) : null}
                    <p className="line-clamp-2 text-sm">
                      {reviewStats.latest.content ||
                        formatCustomerName(reviewStats.latest.customer)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No reviews received yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="size-4" />
                Website-Anforderungen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-muted-foreground">Website-URL</span>
                {websiteUrl ? (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    {overview.domain}
                    <ExternalLink className="size-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">Nicht angegeben</span>
                )}
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-muted-foreground">Meta Pixel</span>
                <a
                  href={META_PIXEL_SETUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  Setup guide
                  <ExternalLink className="size-3" />
                </a>
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-muted-foreground">Website vorhanden</span>
                <RequirementStatus
                  active={overview.hasWebsite}
                  label={overview.hasWebsite ? "Ja" : "Nein"}
                />
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-muted-foreground">Hosting-Zugang</span>
                <RequirementStatus
                  active={overview.hostingAccessConfigured}
                  label={overview.hostingAccessConfigured ? "Vorhanden" : "Fehlt"}
                />
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-muted-foreground">Google Analytics</span>
                <RequirementStatus
                  active={overview.hasGoogleAnalytics}
                  label={overview.hasGoogleAnalytics ? "Konfiguriert" : "Nicht konfiguriert"}
                />
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Search Console</span>
                <RequirementStatus
                  active={overview.hasSearchConsole}
                  label={overview.hasSearchConsole ? "Konfiguriert" : "Nicht konfiguriert"}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="size-4" />
                So funktionieren Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Erstellen Sie ein Ticket für Website-Änderungen, Fehler, Inhaltsupdates, SEO-
                Arbeiten oder alles, was das Website-Team prüfen soll.
              </p>
              <p>
                Sie können Tickets bearbeiten oder löschen, solange sie ausstehend sind. Sobald ein
                Admin daran arbeitet, ist es hier nur noch lesbar.
              </p>
              <p>
                Bildanhänge sind privat und nur für Benutzer sichtbar, die auf dieses
                Unternehmen zugreifen können.
              </p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="tickets" className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {(["ALL", "PENDING", "IN_PROGRESS", "NEEDS_INFO", "DONE", "REJECTED"] as const).map(
            (item) => (
              <Button
                key={item}
                size="sm"
                variant={filter === item ? "default" : "outline"}
                onClick={() => setFilter(item)}
              >
                {item === "ALL" ? "Alle" : STATUS_LABELS[item]}
                {item !== "ALL" ? (
                  <span className="ml-1 opacity-70">{statusCount(tickets, item)}</span>
                ) : null}
              </Button>
            ),
          )}
        </div>

        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center text-muted-foreground">
              No website tickets in this view.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{ticket.title}</h3>
                        <Badge variant="outline">{TYPE_LABELS[ticket.type]}</Badge>
                        <Badge variant={STATUS_VARIANTS[ticket.status]}>
                          {STATUS_LABELS[ticket.status]}
                        </Badge>
                        <Badge
                          variant={
                            ticket.priority === "HIGH"
                              ? "destructive"
                              : ticket.priority === "MEDIUM"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {PRIORITY_LABELS[ticket.priority]}
                        </Badge>
                      </div>
                      {ticket.description ? (
                        <p className="text-sm text-muted-foreground">
                          {ticket.description}
                        </p>
                      ) : null}
                      {role === "ADMIN" && ticket.adminNote ? (
                        <p className="text-xs text-muted-foreground/60 italic">
                          Admin note: {ticket.adminNote}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        Erstellt {formatDate(ticket.createdAt)} · Aktualisiert{" "}
                        {formatDate(ticket.updatedAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {ticket.canEdit ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(ticket)}
                          >
                            <Pencil className="size-4" />
                            Bearbeiten
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === ticket.id}
                            onClick={() => void handleDelete(ticket)}
                          >
                            {deletingId === ticket.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                            Löschen
                          </Button>
                        </>
                      ) : (
                        <span className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                          Durch Status gesperrt
                        </span>
                      )}
                    </div>
                  </div>

                  {ticket.attachments.length > 0 ? (
                    <div className="flex flex-wrap gap-3 border-t pt-4">
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
                          <span className="max-w-40 truncate">
                            {attachment.fileName}
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
                      <ImageIcon className="size-4" />
                      No images attached.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <WebsiteTicketDialog
        key={editingTicket?.id ?? "new-ticket"}
        businessId={businessId}
        role={role}
        ticket={editingTicket}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={refresh}
      />
    </Tabs>
  );
}
