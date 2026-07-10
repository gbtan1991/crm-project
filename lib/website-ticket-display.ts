import type {
  WebsiteTicketPriority,
  WebsiteTicketStatus,
  WebsiteTicketType,
} from "@/lib/generated/prisma/client";

export const WEBSITE_TICKET_TYPE_LABELS: Record<WebsiteTicketType, string> = {
  UI_CHANGE: "UI-Änderung",
  BUG: "Fehler",
  CONTENT: "Inhalt",
  SEO: "SEO",
  OTHER: "Sonstiges",
};

export const WEBSITE_TICKET_PRIORITY_LABELS: Record<
  WebsiteTicketPriority,
  string
> = {
  LOW: "Niedrig",
  MEDIUM: "Mittel",
  HIGH: "Hoch",
};

export const WEBSITE_TICKET_STATUS_LABELS: Record<WebsiteTicketStatus, string> =
  {
    PENDING: "Ausstehend",
    IN_PROGRESS: "In Bearbeitung",
    NEEDS_INFO: "Informationen benötigt",
    DONE: "Erledigt",
    REJECTED: "Abgelehnt",
  };

export const WEBSITE_TICKET_STATUS_VARIANTS: Record<
  WebsiteTicketStatus,
  "default" | "secondary" | "destructive" | "outline" | "success"
> = {
  PENDING: "outline",
  IN_PROGRESS: "secondary",
  NEEDS_INFO: "secondary",
  DONE: "success",
  REJECTED: "destructive",
};

export const WEBSITE_TICKET_STATUS_OPTIONS = [
  "PENDING",
  "IN_PROGRESS",
  "NEEDS_INFO",
  "DONE",
  "REJECTED",
] as const satisfies readonly WebsiteTicketStatus[];

export function formatWebsiteTicketDate(value: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
