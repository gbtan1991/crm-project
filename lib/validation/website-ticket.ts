import { z } from "zod";

export const WEBSITE_TICKET_TYPES = [
  "UI_CHANGE",
  "BUG",
  "CONTENT",
  "SEO",
  "OTHER",
] as const;

export const WEBSITE_TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

export const WEBSITE_TICKET_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "NEEDS_INFO",
  "DONE",
  "REJECTED",
] as const;

export const websiteTicketWriteSchema = z.object({
  type: z.enum(WEBSITE_TICKET_TYPES).default("UI_CHANGE"),
  priority: z.enum(WEBSITE_TICKET_PRIORITIES).default("MEDIUM"),
  title: z.string().trim().min(1, "Titel ist erforderlich.").max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  status: z.enum(WEBSITE_TICKET_STATUSES).optional(),
  adminNote: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type WebsiteTicketWriteInput = z.infer<typeof websiteTicketWriteSchema>;
