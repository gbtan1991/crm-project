import { z } from "zod";

export const businessKeywordImportRowSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(2, "Keyword muss mindestens 2 Zeichen haben.")
    .max(200, "Keyword darf maximal 200 Zeichen haben."),
  locationCode: z.number().int().positive("Standort ist erforderlich."),
  locationName: z.string().trim().min(1, "Standort ist erforderlich."),
});

export const businessKeywordImportSchema = z.object({
  keywords: z
    .array(businessKeywordImportRowSchema)
    .min(1, "Mindestens ein Keyword ist erforderlich.")
    .max(500, "Maximal 500 Keywords pro Import."),
});

export type BusinessKeywordImportRowInput = z.infer<
  typeof businessKeywordImportRowSchema
>;
