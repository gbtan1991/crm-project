import { z } from "zod";

const email = z
  .string()
  .trim()
  .email("Geben Sie eine gültige E-Mail-Adresse ein.")
  .transform((value) => value.toLowerCase());

export const requestPasswordResetOtpSchema = z.object({
  email,
});

export const verifyPasswordResetOtpSchema = z.object({
  email,
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Geben Sie den 6-stelligen Bestätigungscode ein."),
});

export const resetPasswordWithOtpSchema = z
  .object({
    email,
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Geben Sie den 6-stelligen Bestätigungscode ein."),
    newPassword: z
      .string()
      .min(8, "Neues Passwort muss mindestens 8 Zeichen lang sein."),
    confirmPassword: z.string().min(1, "Bestätigen Sie Ihr neues Passwort."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwörter stimmen nicht überein.",
    path: ["confirmPassword"],
  });

export type RequestPasswordResetOtpInput = z.infer<
  typeof requestPasswordResetOtpSchema
>;
export type VerifyPasswordResetOtpInput = z.infer<
  typeof verifyPasswordResetOtpSchema
>;
export type ResetPasswordWithOtpInput = z.infer<
  typeof resetPasswordWithOtpSchema
>;
