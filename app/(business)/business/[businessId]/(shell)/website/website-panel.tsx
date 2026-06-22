"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Globe,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
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
import type {
  WebsiteOverview,
  WebsiteTicketRow,
} from "@/lib/website-tickets";

type TicketType = WebsiteTicketRow["type"];
type TicketPriority = WebsiteTicketRow["priority"];
type TicketStatus = WebsiteTicketRow["status"];

const TYPE_LABELS: Record<TicketType, string> = {
  UI_CHANGE: "UI change",
  BUG: "Bug",
  CONTENT: "Content",
  SEO: "SEO",
  OTHER: "Other",
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  NEEDS_INFO: "Needs info",
  DONE: "Done",
  REJECTED: "Rejected",
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
      setError("Title is required.");
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
        throw new Error(data.error ?? "Failed to save ticket.");
      }

      toast.success(isEdit ? "Website ticket updated." : "Website ticket created.");
      onOpenChange(false);
      onSaved();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Failed to save ticket.";
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
            <DialogTitle>{isEdit ? "Edit website ticket" : "New website ticket"}</DialogTitle>
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
              <Label>Type</Label>
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
                  <SelectItem value="UI_CHANGE">UI change</SelectItem>
                  <SelectItem value="BUG">Bug</SelectItem>
                  <SelectItem value="CONTENT">Content</SelectItem>
                  <SelectItem value="SEO">SEO</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
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
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website-ticket-title">Title</Label>
            <Input
              id="website-ticket-title"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Update homepage hero text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website-ticket-description">Description</Label>
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
              placeholder="Describe the requested change or bug as clearly as possible."
            />
          </div>

          {role === "ADMIN" ? (
            <>
              <div className="space-y-2">
                <Label>Status (admin)</Label>
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
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                    <SelectItem value="NEEDS_INFO">Needs info</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website-ticket-admin-note">Admin note</Label>
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
                  placeholder="Internal notes for the business owner..."
                />
              </div>
            </>
          ) : null}

          {ticket?.attachments.length ? (
            <div className="space-y-2">
              <Label>Existing images</Label>
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
            <Label>Images (optional)</Label>
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
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save ticket"
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
}: {
  businessId: string;
  role?: string;
  overview: WebsiteOverview;
  tickets: WebsiteTicketRow[];
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
        throw new Error(data.error ?? "Failed to delete ticket.");
      }

      toast.success("Website ticket deleted.");
      refresh();
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete ticket.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
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
          New website ticket
        </Button>
      </div>

      <TabsContent value="overview" className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Website status</p>
              <p className="mt-2 font-heading text-2xl font-bold">
                {overview.domain ? "Online" : "Not set"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Pending tickets</p>
              <p className="mt-2 font-heading text-2xl font-bold">
                {statusCount(tickets, "PENDING")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">In progress</p>
              <p className="mt-2 font-heading text-2xl font-bold">
                {statusCount(tickets, "IN_PROGRESS")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="mt-2 font-heading text-2xl font-bold">
                {statusCount(tickets, "DONE")}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="size-4" />
                Website requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-muted-foreground">Website URL</span>
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
                  <span className="text-muted-foreground">Not provided</span>
                )}
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-muted-foreground">Has website</span>
                <RequirementStatus
                  active={overview.hasWebsite}
                  label={overview.hasWebsite ? "Yes" : "No"}
                />
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-muted-foreground">Hosting access</span>
                <RequirementStatus
                  active={overview.hostingAccessConfigured}
                  label={overview.hostingAccessConfigured ? "Provided" : "Missing"}
                />
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-muted-foreground">Google Analytics</span>
                <RequirementStatus
                  active={overview.hasGoogleAnalytics}
                  label={overview.hasGoogleAnalytics ? "Configured" : "Not configured"}
                />
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Search Console</span>
                <RequirementStatus
                  active={overview.hasSearchConsole}
                  label={overview.hasSearchConsole ? "Configured" : "Not configured"}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="size-4" />
                How tickets work
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Create a ticket for website changes, bugs, content updates, SEO
                work, or anything else the website team should review.
              </p>
              <p>
                You can edit or delete tickets while they are pending. Once an
                admin starts working on a ticket, it becomes view-only here.
              </p>
              <p>
                Image attachments are private and only visible to users who can
                access this business.
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
                {item === "ALL" ? "All" : STATUS_LABELS[item]}
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
                        Created {formatDate(ticket.createdAt)} · Updated{" "}
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
                            Edit
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
                            Delete
                          </Button>
                        </>
                      ) : (
                        <span className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                          Locked by status
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
