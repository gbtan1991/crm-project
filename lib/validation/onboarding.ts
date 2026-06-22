import { z } from "zod";

export const CALENDAR_PROVIDERS = ["GOOGLE", "OUTLOOK"] as const;

export const onboardingCompanySchema = z.object({
  step: z.literal(1),
  name: z.string().trim().min(2, "Business name must be at least 2 characters."),
  contactPerson: z.string().trim().optional(),
  businessEmail: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "Enter a valid email address.",
    )
    .optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  city: z.string().trim().optional(),
  taxId: z.string().trim().optional(),
  billingAddress: z.string().trim().optional(),
  logoUrl: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().url().safeParse(value).success,
      "Enter a valid URL.",
    )
    .optional(),
});

export const onboardingWebsiteSchema = z.object({
  step: z.literal(2),
  domain: z.string().trim().optional(),
  hostingAccess: z.string().trim().optional(),
  hasWebsite: z.boolean(),
  hasGoogleAnalytics: z.boolean(),
  hasSearchConsole: z.boolean(),
});

export const onboardingCalendarSchema = z.object({
  step: z.literal(3),
  provider: z.enum(CALENDAR_PROVIDERS).optional(),
  complete: z.boolean().optional(),
});

export const onboardingPatchSchema = z.discriminatedUnion("step", [
  onboardingCompanySchema,
  onboardingWebsiteSchema,
  onboardingCalendarSchema,
]);

export type OnboardingPatchInput = z.infer<typeof onboardingPatchSchema>;
