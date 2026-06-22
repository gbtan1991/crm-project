import { redirect } from "next/navigation";

import { OutlookCalendarOAuth } from "@/lib/outlook-calendar/oauth";
import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { parseCalendarOAuthState } from "@/lib/calendar/oauth-state";
import { setupCalendarSync } from "@/lib/calendar/sync";
import { businessOnboardingPath } from "@/lib/business-paths";

function onboardingRedirect(businessId: string, query: string): never {
  redirect(`${businessOnboardingPath(businessId)}?${query}`);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (!state) {
    redirect("/?error=outlook_calendar_auth_invalid");
  }

  const stateData = parseCalendarOAuthState(state);
  if (!stateData) {
    redirect("/?error=outlook_calendar_auth_invalid_state");
  }

  const { businessId, redirectPath } = stateData;
  const successPath = redirectPath;

  try {
    await requireBusinessOwnerOrAdmin(businessId);
  } catch (authError) {
    if (authError instanceof ApiAuthError) {
      redirect(`${successPath}?error=outlook_calendar_auth_forbidden`);
    }
    throw authError;
  }

  if (error) {
    onboardingRedirect(businessId, "error=outlook_calendar_auth_cancelled");
  }

  if (!code) {
    onboardingRedirect(businessId, "error=outlook_calendar_auth_invalid");
  }

  try {
    const tokenData = await OutlookCalendarOAuth.exchangeCodeForToken(code);
    const userInfo = await OutlookCalendarOAuth.validateToken(
      tokenData.accessToken,
    );

    if (!userInfo.isValid || !userInfo.userId) {
      onboardingRedirect(businessId, "error=outlook_calendar_auth_invalid_token");
    }

    const userId = userInfo.userId;

    await OutlookCalendarOAuth.storeConnection(
      businessId,
      tokenData.accessToken,
      tokenData.refreshToken,
      tokenData.expiresIn,
      {
        userId,
        email: userInfo.email ?? "Unknown",
        name: userInfo.name ?? "Outlook User",
      },
    );

    try {
      await setupCalendarSync(businessId);
    } catch (syncError) {
      console.error("[outlook-calendar/callback] initial sync failed", syncError);
    }

    redirect(`${successPath}?oauth_success=outlook`);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    console.error("[outlook-calendar/callback][GET]", err);
    onboardingRedirect(businessId, "error=outlook_calendar_auth_failed");
  }
}
