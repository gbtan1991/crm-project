import { z } from "zod";

export const updateUserProfileSchema = z.object({
  name: z.string().trim().min(2, "Name muss mindestens 2 Zeichen lang sein."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Geben Sie Ihr aktuelles Passwort ein."),
    newPassword: z
      .string()
      .min(8, "Neues Passwort muss mindestens 8 Zeichen lang sein."),
    confirmPassword: z.string().min(1, "Bestätigen Sie Ihr neues Passwort."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwörter stimmen nicht überein.",
    path: ["confirmPassword"],
  });

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
