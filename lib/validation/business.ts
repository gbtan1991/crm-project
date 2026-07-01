import { z } from "zod";

// Kept in sync with the Prisma enums. Defined as plain literals so this module
// stays safe to import from client components (no generated-client import).
export const SUBSCRIPTION_PLANS = ["BASIC"] as const;
export const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAUSED", "CANCELED"] as const;

export const createBusinessSchema = z.object({
  name: z.string().trim().min(2, "Firmenname muss mindestens 2 Zeichen lang sein."),
  ownerName: z.string().trim().min(2, "Name des Inhabers muss mindestens 2 Zeichen lang sein."),
  ownerEmail: z
    .string()
    .trim()
    .email("Geben Sie eine gültige E-Mail-Adresse ein.")
    .transform((value) => value.toLowerCase()),
  ownerPassword: z
    .string()
    .min(8, "Passwort muss mindestens 8 Zeichen lang sein."),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

export const updateBusinessSchema = z.object({
  name: z.string().trim().min(2, "Firmenname muss mindestens 2 Zeichen lang sein."),
  ownerEmail: z
    .string()
    .trim()
    .email("Geben Sie eine gültige E-Mail-Adresse ein.")
    .transform((value) => value.toLowerCase()),
  plan: z.enum(SUBSCRIPTION_PLANS),
  status: z.enum(SUBSCRIPTION_STATUSES),
});

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
