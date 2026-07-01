import { z } from "zod";

export const reminderOffsetUnitSchema = z.enum(["MINUTES", "HOURS", "DAYS"]);

export const appointmentReminderOffsetSchema = z.object({
  id: z.string().uuid().optional(),
  amount: z.coerce.number().int().min(1).max(365),
  unit: reminderOffsetUnitSchema,
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const appointmentReminderSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  subject: z.string().trim().min(1, "Betreff ist erforderlich.").max(500),
  bodyText: z.string().trim().min(1, "E-Mail-Text ist erforderlich.").max(20_000),
  bodyHtml: z.string().trim().min(1, "HTML-Text ist erforderlich.").max(20_000),
  offsets: z
    .array(appointmentReminderOffsetSchema)
    .min(1, "Fügen Sie mindestens eine Erinnerungszeit hinzu.")
    .max(5, "Es sind maximal 5 Erinnerungszeiten möglich."),
});

export type AppointmentReminderSettingsInput = z.infer<
  typeof appointmentReminderSettingsSchema
>;
