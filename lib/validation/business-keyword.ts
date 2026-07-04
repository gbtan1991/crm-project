import { z } from "zod";

export const businessKeywordWriteSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(2, "Keyword muss mindestens 2 Zeichen haben.")
    .max(200, "Keyword darf maximal 200 Zeichen haben."),
  locationCode: z
    .number()
    .int("Standortcode muss eine ganze Zahl sein.")
    .positive("Standortcode ist ungültig."),
  locationName: z
    .string()
    .trim()
    .min(1, "Standortname ist erforderlich.")
    .max(200, "Standortname darf maximal 200 Zeichen haben."),
});

export type BusinessKeywordWriteInput = z.infer<typeof businessKeywordWriteSchema>;
