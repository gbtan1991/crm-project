import { z } from "zod";

export const sequenceTypeSchema = z.enum(["INVOICE", "REVIEW"]);
export const sequenceDelayUnitSchema = z.enum(["MINUTES", "HOURS", "DAYS"]);

export const sequenceStepWriteSchema = z.object({
  id: z.string().uuid().optional(),
  subject: z.string().trim().min(1, "Betreff ist erforderlich.").max(500),
  bodyText: z.string().trim().min(1, "E-Mail-Text ist erforderlich.").max(20_000),
  bodyHtml: z.string().trim().max(20_000).optional().or(z.literal("")),
  delayAmount: z.coerce.number().int().min(0).max(365),
  delayUnit: sequenceDelayUnitSchema.default("DAYS"),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const sequenceWriteSchema = z.object({
  name: z.string().trim().min(1, "Sequenzname ist erforderlich.").max(100),
  type: sequenceTypeSchema.default("INVOICE"),
  isActive: z.boolean().default(true),
  autoStart: z.boolean().optional(),
  steps: z
    .array(sequenceStepWriteSchema)
    .min(1, "Fügen Sie mindestens einen E-Mail-Schritt hinzu."),
});

export const startInvoiceSequenceSchema = z.object({
  sequenceId: z.string().uuid().optional(),
});

export type SequenceWriteInput = z.infer<typeof sequenceWriteSchema>;
