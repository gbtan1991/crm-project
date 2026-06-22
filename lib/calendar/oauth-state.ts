import { createHmac, timingSafeEqual } from "crypto";

import { env } from "@/env/server.mjs";

const STATE_MAX_AGE_MS = 30 * 60 * 1000;

type CalendarOAuthState = {
  businessId: string;
  redirectPath: string;
  issuedAt: number;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(payload).digest("base64url");
}

function safeRedirectPath(businessId: string, redirectPath: string): string {
  const businessPrefix = `/business/${businessId}`;
  return redirectPath.startsWith(businessPrefix)
    ? redirectPath
    : `${businessPrefix}/onboarding`;
}

export function createCalendarOAuthState(
  businessId: string,
  redirectPath: string,
): string {
  const payload = base64UrlEncode(
    JSON.stringify({
      businessId,
      redirectPath: safeRedirectPath(businessId, redirectPath),
      issuedAt: Date.now(),
    } satisfies CalendarOAuthState),
  );

  return `${payload}.${sign(payload)}`;
}

export function parseCalendarOAuthState(state: string): CalendarOAuthState | null {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as CalendarOAuthState;
    if (
      !parsed.businessId ||
      !parsed.redirectPath ||
      Date.now() - parsed.issuedAt > STATE_MAX_AGE_MS
    ) {
      return null;
    }

    return {
      ...parsed,
      redirectPath: safeRedirectPath(parsed.businessId, parsed.redirectPath),
    };
  } catch {
    return null;
  }
}
