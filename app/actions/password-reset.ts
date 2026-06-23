"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  verifyPasswordResetOtp,
} from "@/lib/password-reset";
import {
  requestPasswordResetOtpSchema,
  resetPasswordWithOtpSchema,
  verifyPasswordResetOtpSchema,
} from "@/lib/validation/password-reset";

export type PasswordResetActionState = {
  error?: string;
  success?: string;
};

export async function requestPasswordResetOtpAction(
  _previousState: PasswordResetActionState,
  formData: FormData,
): Promise<PasswordResetActionState> {
  const parsed = requestPasswordResetOtpSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  const result = await requestPasswordResetOtp(parsed.data.email);
  if (!result.ok) {
    return { error: result.error };
  }

  return {
    success:
      "If an account exists for that email, a verification code has been sent.",
  };
}

export async function verifyPasswordResetOtpAction(
  _previousState: PasswordResetActionState,
  formData: FormData,
): Promise<PasswordResetActionState> {
  const parsed = verifyPasswordResetOtpSchema.safeParse({
    email: formData.get("email"),
    otp: formData.get("otp"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid verification code." };
  }

  const result = await verifyPasswordResetOtp(
    parsed.data.email,
    parsed.data.otp,
  );

  if (!result.ok) {
    return { error: result.error };
  }

  return { success: "Verification code accepted." };
}

export async function resetPasswordWithOtpAction(
  _previousState: PasswordResetActionState,
  formData: FormData,
): Promise<PasswordResetActionState> {
  const parsed = resetPasswordWithOtpSchema.safeParse({
    email: formData.get("email"),
    otp: formData.get("otp"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const result = await resetPasswordWithOtp(
    parsed.data.email,
    parsed.data.otp,
    parsed.data.newPassword,
  );

  if (!result.ok) {
    return { error: result.error };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.newPassword,
      redirectTo: "/auth/redirect",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          "Password was updated, but automatic sign-in failed. Try logging in manually.",
      };
    }
    throw error;
  }

  return {};
}
