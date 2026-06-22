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
