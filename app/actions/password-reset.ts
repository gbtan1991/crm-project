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
    return { error: parsed.error.issues[0]?.message ?? "Ungültige E-Mail-Adresse." };
  }

  const result = await requestPasswordResetOtp(parsed.data.email);
  if (!result.ok) {
    return { error: result.error };
  }

  return {
    success:
      "Falls ein Konto mit dieser E-Mail existiert, wurde ein Bestätigungscode gesendet.",
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
    return { error: parsed.error.issues[0]?.message ?? "Ungültiger Bestätigungscode." };
  }

  const result = await verifyPasswordResetOtp(
    parsed.data.email,
    parsed.data.otp,
  );

  if (!result.ok) {
    return { error: result.error };
  }

  return { success: "Bestätigungscode akzeptiert." };
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
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
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
          "Passwort wurde aktualisiert, aber die automatische Anmeldung ist fehlgeschlagen. Bitte melden Sie sich manuell an.",
      };
    }
    throw error;
  }

  return {};
}
