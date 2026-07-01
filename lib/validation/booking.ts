import { z } from "zod";

export const bookingStatusSchema = z.enum([
  "SCHEDULED",
  "CONFIRMED",
  "COMPLETED",
  "OVERDUE",
  "CANCELLED",
]);

export const bookingUpdateSchema = z
  .object({
    title: z.string().trim().min(1, "Titel ist erforderlich.").max(300).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    location: z.string().trim().max(500).optional().nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),
    status: bookingStatusSchema.optional(),
    remindersEnabled: z.boolean().optional(),
    customerId: z.string().uuid().optional().nullable(),
  })
  .refine(
    (value) => {
      if (!value.startsAt || !value.endsAt) {
        return true;
      }
      return new Date(value.endsAt) > new Date(value.startsAt);
    },
    {
      message: "Endzeit muss nach der Startzeit liegen.",
      path: ["endsAt"],
    },
  );

export const bookingCreateSchema = z
  .object({
    title: z.string().trim().min(1, "Titel ist erforderlich.").max(300),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    location: z.string().trim().max(500).optional().or(z.literal("")),
    notes: z.string().trim().max(5000).optional().or(z.literal("")),
    customerId: z.string().uuid("Wählen Sie einen Kunden aus, bevor Sie einen Termin erstellen."),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    message: "Endzeit muss nach der Startzeit liegen.",
    path: ["endsAt"],
  });

export type BookingUpdateInput = z.infer<typeof bookingUpdateSchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
