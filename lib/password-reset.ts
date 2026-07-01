import { randomInt } from "node:crypto";

import { compare, hash } from "bcryptjs";

import { CalendarProvider, Role } from "@/lib/generated/prisma/client";
import { GoogleCalendarOAuth } from "@/lib/google-calendar/oauth";
import { GmailSendError, sendGmailMessage } from "@/lib/google-mail/send";
import { OutlookCalendarOAuth } from "@/lib/outlook-calendar/oauth";
import { OutlookSendError, sendOutlookMessage } from "@/lib/outlook-mail/send";
import { prisma } from "@/lib/prisma";

const OTP_BCRYPT_COST = 10;
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function generateOtpCode() {
  return String(randomInt(100_000, 1_000_000));
}

async function hashOtp(code: string) {
  return hash(code, OTP_BCRYPT_COST);
}

async function findLatestActiveOtp(userId: string) {
  return prisma.passwordResetOtp.findFirst({
    where: {
      userId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function sendOtpEmail(input: {
  businessId: string;
  businessName: string;
  to: string;
  code: string;
}) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { businessId: input.businessId },
    select: {
      provider: true,
      accountEmail: true,
      connectedAt: true,
    },
  });

  if (!connection?.connectedAt || !connection.accountEmail) {
    return {
      ok: false as const,
      error:
        "Es ist kein verbundenes Google- oder Outlook-Postfach verfügbar, um den Bestätigungscode zu senden.",
    };
  }

  const subject = `${input.code} ist Ihr MeisterFlow-Bestätigungscode`;
  const bodyText = [
    `Guten Tag,`,
    ``,
    `Verwenden Sie diesen Bestätigungscode, um Ihr MeisterFlow-Passwort für ${input.businessName} zurückzusetzen:`,
    ``,
    input.code,
    ``,
    `Dieser Code läuft in 10 Minuten ab.`,
    ``,
    `Falls Sie dies nicht angefordert haben, können Sie diese E-Mail ignorieren.`,
  ].join("\n");

  try {
    if (connection.provider === CalendarProvider.GOOGLE) {
      await sendGmailMessage({
        accessToken: await GoogleCalendarOAuth.getValidAccessToken(input.businessId),
        from: connection.accountEmail,
        to: input.to,
        subject,
        bodyText,
      });
    } else if (connection.provider === CalendarProvider.OUTLOOK) {
      await sendOutlookMessage({
        accessToken: await OutlookCalendarOAuth.getValidAccessToken(input.businessId),
        to: input.to,
        subject,
        bodyText,
      });
    } else {
      return {
        ok: false as const,
        error: "Passwort-Zurücksetzen erfordert ein verbundenes Google- oder Outlook-Postfach.",
      };
    }

    return { ok: true as const };
  } catch (error) {
    const message =
      error instanceof GmailSendError || error instanceof OutlookSendError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Bestätigungscode konnte nicht gesendet werden.";

    return { ok: false as const, error: message };
  }
}

export async function requestPasswordResetOtp(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      businesses: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { id: true, name: true },
      },
    },
  });

  if (!user) {
    return { ok: true as const };
  }

  if (user.role === Role.ADMIN) {
    return {
      ok: false as const,
      error: "Admin-Passwort-Zurücksetzen ist hier nicht verfügbar. Wenden Sie sich an den Plattform-Support.",
    };
  }

  const business = user.businesses[0];
  if (!business) {
    return {
      ok: false as const,
      error: "Mit dieser E-Mail ist kein Unternehmenskonto verknüpft.",
    };
  }

  const code = generateOtpCode();
  const codeHash = await hashOtp(code);

  await prisma.$transaction([
    prisma.passwordResetOtp.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    }),
  ]);

  const sent = await sendOtpEmail({
    businessId: business.id,
    businessName: business.name,
    to: user.email,
    code,
  });

  if (!sent.ok) {
    return sent;
  }

  return { ok: true as const };
}

async function verifyOtpForUser(userId: string, otp: string) {
  const record = await findLatestActiveOtp(userId);
  if (!record) {
    return { ok: false as const, error: "Bestätigungscode abgelaufen oder ungültig." };
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    return {
      ok: false as const,
      error: "Zu viele ungültige Versuche. Fordern Sie einen neuen Bestätigungscode an.",
    };
  }

  const valid = await compare(otp, record.codeHash);
  if (!valid) {
    await prisma.passwordResetOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false as const, error: "Bestätigungscode ist falsch." };
  }

  return { ok: true as const, otpId: record.id };
}

export async function verifyPasswordResetOtp(email: string, otp: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return { ok: false as const, error: "Bestätigungscode abgelaufen oder ungültig." };
  }

  return verifyOtpForUser(user.id, otp);
}

export async function resetPasswordWithOtp(
  email: string,
  otp: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return { ok: false as const, error: "Bestätigungscode abgelaufen oder ungültig." };
  }

  const verification = await verifyOtpForUser(user.id, otp);
  if (!verification.ok) {
    return verification;
  }

  const nextPassword = await hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: nextPassword },
    }),
    prisma.passwordResetOtp.update({
      where: { id: verification.otpId },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true as const };
}
