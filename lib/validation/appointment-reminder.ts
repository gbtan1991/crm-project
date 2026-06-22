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
  subject: z.string().trim().min(1, "Subject is required.").max(500),
  bodyText: z.string().trim().min(1, "Email body is required.").max(20_000),
  offsets: z
    .array(appointmentReminderOffsetSchema)
    .min(1, "Add at least one reminder time.")
    .max(5, "Use up to 5 reminder times."),
});

export type AppointmentReminderSettingsInput = z.infer<
  typeof appointmentReminderSettingsSchema
>;
