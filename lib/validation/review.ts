import { z } from "zod";

export const REVIEW_STATUSES = ["REQUESTED", "RECEIVED", "DECLINED"] as const;
export const REVIEW_DELIVERY_MODES = ["DIRECT", "SEQUENCE"] as const;

export const createReviewSchema = z
  .object({
    bookingId: z.string().uuid().optional().nullable(),
    customerId: z.string().uuid("Ungültige Kunden-ID."),
    deliveryMode: z.enum(REVIEW_DELIVERY_MODES).default("DIRECT"),
    subject: z.string().trim().max(500).optional().or(z.literal("")),
    bodyText: z.string().trim().max(20_000).optional().or(z.literal("")),
    bodyHtml: z.string().trim().max(20_000).optional().or(z.literal("")),
    requestReason: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .refine(
    (input) =>
      input.deliveryMode === "SEQUENCE" ||
      (Boolean(input.subject?.trim()) && Boolean(input.bodyText?.trim())),
    {
      message: "Betreff und Nachricht sind für direkte Bewertungsanfragen erforderlich.",
      path: ["subject"],
    },
  );

export const requestReviewUpdateSchema = z.object({
  action: z.literal("requestUpdate"),
  subject: z.string().trim().min(1, "Betreff ist erforderlich.").max(500),
  bodyText: z.string().trim().min(1, "Nachricht ist erforderlich.").max(20_000),
  bodyHtml: z.string().trim().max(20_000).optional().or(z.literal("")),
  requestReason: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const declineReviewSchema = z.object({
  action: z.literal("decline"),
});

export const submitReviewSchema = z.object({
  rating: z
    .number({ message: "Bewertung ist erforderlich." })
    .int()
    .min(1, "Bewertung muss mindestens 1 Stern sein.")
    .max(5, "Bewertung darf höchstens 5 Sterne sein."),
  content: z
    .string()
    .trim()
    .max(1000, "Bewertung darf höchstens 1000 Zeichen lang sein.")
    .optional()
    .or(z.literal("")),
});

const REVIEW_SORT_OPTIONS = ["newest", "oldest"] as const;

export const REVIEW_STATS_PERIODS = [
  "all",
  "this_month",
  "last_month",
  "last_3_months",
  "last_12_months",
] as const;

export const listReviewsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(REVIEW_STATUSES).optional(),
  sort: z.enum(REVIEW_SORT_OPTIONS).default("newest"),
  period: z.enum(REVIEW_STATS_PERIODS).default("all"),
});

export type ListReviewsInput = z.infer<typeof listReviewsSchema>;
export type ReviewStatsPeriod = (typeof REVIEW_STATS_PERIODS)[number];
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type RequestReviewUpdateInput = z.infer<typeof requestReviewUpdateSchema>;
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
