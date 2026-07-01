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
  timezone: z.string().trim().min(1, "Geben Sie eine Zeitzone ein."),
});

export type BusinessGeneralSettingsInput = z.infer<
  typeof businessGeneralSettingsSchema
>;
