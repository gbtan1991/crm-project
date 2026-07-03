import { z } from "zod";

export const businessKeywordWriteSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(2, "Keyword muss mindestens 2 Zeichen haben.")
    .max(200, "Keyword darf maximal 200 Zeichen haben."),
  locationLabel: z
    .string()
    .trim()
    .max(100, "Standort darf maximal 100 Zeichen haben.")
    .optional()
    .or(z.literal("")),
});

export type BusinessKeywordWriteInput = z.infer<typeof businessKeywordWriteSchema>;
