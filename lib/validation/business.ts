import { z } from "zod";

// Kept in sync with the Prisma enums. Defined as plain literals so this module
// stays safe to import from client components (no generated-client import).
export const SUBSCRIPTION_PLANS = ["BASIC"] as const;
export const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAUSED", "CANCELED"] as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

const SUBSCRIPTION_PLAN_LABELS: Record<SubscriptionPlan, string> = {
  BASIC: "Basis",
};

const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: "Aktiv",
  PAUSED: "Pausiert",
  CANCELED: "Gekündigt",
};

export function subscriptionPlanLabel(plan: string): string {
  return SUBSCRIPTION_PLAN_LABELS[plan as SubscriptionPlan] ?? plan;
}

export function subscriptionStatusLabel(status: string): string {
  return SUBSCRIPTION_STATUS_LABELS[status as SubscriptionStatus] ?? status;
}

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
