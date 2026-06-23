import { z } from "zod";

export const updateUserProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
