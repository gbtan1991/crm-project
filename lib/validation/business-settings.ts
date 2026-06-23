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
      "Enter a valid Google review URL.",
    ),
});

export type GoogleReviewSettingsInput = z.infer<
  typeof googleReviewSettingsSchema
>;

export const businessGeneralSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Business name must be at least 2 characters."),
  timezone: z.string().trim().min(1, "Enter a timezone."),
});

export type BusinessGeneralSettingsInput = z.infer<
  typeof businessGeneralSettingsSchema
>;
