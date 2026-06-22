import { z } from "zod";

export const REVIEW_STATUSES = ["REQUESTED", "RECEIVED", "DECLINED"] as const;
export const REVIEW_DELIVERY_MODES = ["DIRECT", "SEQUENCE"] as const;

export const createReviewSchema = z
  .object({
    bookingId: z.string().uuid().optional().nullable(),
    customerId: z.string().uuid("Invalid customer ID."),
    deliveryMode: z.enum(REVIEW_DELIVERY_MODES).default("DIRECT"),
    subject: z.string().trim().max(500).optional().or(z.literal("")),
    bodyText: z.string().trim().max(20_000).optional().or(z.literal("")),
    requestReason: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .refine(
    (input) =>
      input.deliveryMode === "SEQUENCE" ||
      (Boolean(input.subject?.trim()) && Boolean(input.bodyText?.trim())),
    {
      message: "Subject and message are required for direct review requests.",
      path: ["subject"],
    },
  );

export const requestReviewUpdateSchema = z.object({
  action: z.literal("requestUpdate"),
  subject: z.string().trim().min(1, "Subject is required.").max(500),
  bodyText: z.string().trim().min(1, "Message is required.").max(20_000),
  requestReason: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const declineReviewSchema = z.object({
  action: z.literal("decline"),
});

export const submitReviewSchema = z.object({
  rating: z
    .number({ message: "Rating is required." })
    .int()
    .min(1, "Rating must be at least 1 star.")
    .max(5, "Rating must be at most 5 stars."),
  content: z
    .string()
    .trim()
    .max(1000, "Review must be under 1000 characters.")
    .optional()
    .or(z.literal("")),
});

const REVIEW_SORT_OPTIONS = ["newest", "oldest"] as const;

export const listReviewsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(REVIEW_STATUSES).optional(),
  sort: z.enum(REVIEW_SORT_OPTIONS).default("newest"),
});

export type ListReviewsInput = z.infer<typeof listReviewsSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type RequestReviewUpdateInput = z.infer<typeof requestReviewUpdateSchema>;
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
