import { z } from "zod";

const email = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());

export const requestPasswordResetOtpSchema = z.object({
  email,
});

export const verifyPasswordResetOtpSchema = z.object({
  email,
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit verification code."),
});

export const resetPasswordWithOtpSchema = z
  .object({
    email,
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter the 6-digit verification code."),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
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
