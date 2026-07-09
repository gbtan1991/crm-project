import { z } from "zod";

function isGoogleReviewUrl(value: string): boolean {
  if (value === "") {
    return true;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    if (url.protocol !== "https:") {
      return false;
    }

    return (
      hostname === "g.page" ||
      hostname === "maps.app.goo.gl" ||
      /^(.+\.)?google\.[a-z.]+$/i.test(hostname)
    );
  } catch {
    return false;
  }
}

export const googleReviewSettingsSchema = z.object({
  googleReviewUrl: z
    .string()
    .trim()
    .refine(
      isGoogleReviewUrl,
      "Geben Sie eine gültige Google-Bewertungs-URL ein.",
    ),
});

export type GoogleReviewSettingsInput = z.infer<
  typeof googleReviewSettingsSchema
>;

export const businessGeneralSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Firmenname muss mindestens 2 Zeichen lang sein."),
  businessEmail: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "Geben Sie eine gültige E-Mail-Adresse ein.",
    ),
  timezone: z.string().trim().min(1, "Geben Sie eine Zeitzone ein."),
});

export type BusinessGeneralSettingsInput = z.infer<
  typeof businessGeneralSettingsSchema
>;

export const websiteSettingsSchema = z.object({
  domain: z.string().trim().max(200, "Domain darf maximal 200 Zeichen haben."),
  hostingAccess: z
    .string()
    .trim()
    .max(200, "Hosting-Angabe darf maximal 200 Zeichen haben."),
  hasWebsite: z.boolean(),
  hasGoogleAnalytics: z.boolean(),
  hasSearchConsole: z.boolean(),
});

export type WebsiteSettingsInput = z.infer<typeof websiteSettingsSchema>;
