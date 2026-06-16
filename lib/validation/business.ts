import { z } from "zod";

// Kept in sync with the Prisma enums. Defined as plain literals so this module
// stays safe to import from client components (no generated-client import).
export const SUBSCRIPTION_PLANS = ["BASIC"] as const;
export const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAUSED", "CANCELED"] as const;

export const createBusinessSchema = z.object({
  name: z.string().trim().min(2, "Business name must be at least 2 characters."),
  ownerName: z.string().trim().min(2, "Owner name must be at least 2 characters."),
  ownerEmail: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  ownerPassword: z
    .string()
    .min(8, "Password must be at least 8 characters."),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

export const updateBusinessSchema = z.object({
  name: z.string().trim().min(2, "Business name must be at least 2 characters."),
  ownerEmail: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  plan: z.enum(SUBSCRIPTION_PLANS),
  status: z.enum(SUBSCRIPTION_STATUSES),
});

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
