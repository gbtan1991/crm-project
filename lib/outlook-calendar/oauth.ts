import { CalendarProvider } from "@/lib/generated/prisma/client";
import { env } from "@/env/server.mjs";
import { createCalendarOAuthState } from "@/lib/calendar/oauth-state";
import { encrypt, decrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

export class OutlookCalendarOAuth {
  private static readonly CLIENT_ID = env.AZURE_CLIENT_ID;
  private static readonly CLIENT_SECRET = env.AZURE_CLIENT_SECRET;
  private static readonly REDIRECT_URI = `${env.NEXT_PUBLIC_URL}/api/outlook-calendar/callback`;

  static getAuthUrl(businessId: string, redirectPath: string): string {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      scope: [
        "https://graph.microsoft.com/Calendars.ReadWrite",
        "https://graph.microsoft.com/Mail.Send",
        "https://graph.microsoft.com/User.Read",
        "https://graph.microsoft.com/OnlineMeetings.ReadWrite",
        "offline_access",
      ].join(" "),
      state: createCalendarOAuthState(businessId, redirectPath),
      response_type: "code",
      response_mode: "query",
      prompt: "consent",
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
  }

  static async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
  }> {
    const response = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          redirect_uri: this.REDIRECT_URI,
          grant_type: "authorization_code",
          code,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Outlook Calendar OAuth error: ${error.error_description ?? "Unknown error"}`,
      );
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
    };
  }

  static async validateToken(accessToken: string): Promise<{
    isValid: boolean;
    userId?: string;
    email?: string;
    name?: string;
  }> {
    try {
      const response = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return { isValid: false };
      const userData = await response.json();
      return {
        isValid: true,
        userId: userData.id,
        email: userData.mail ?? userData.userPrincipalName,
        name: userData.displayName,
      };
    } catch {
      return { isValid: false };
    }
  }

  static async storeConnection(
    businessId: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    userInfo: { userId: string; email: string; name: string },
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const secret = env.ENCRYPTION_SECRET;

    await prisma.calendarConnection.upsert({
      where: { businessId },
      update: {
        provider: CalendarProvider.OUTLOOK,
        accessToken: encrypt(accessToken, secret),
        refreshToken: encrypt(refreshToken, secret),
        tokenExpiresAt: expiresAt,
        accountEmail: userInfo.email,
        accountId: userInfo.userId,
        connectedAt: new Date(),
      },
      create: {
        businessId,
        provider: CalendarProvider.OUTLOOK,
        accessToken: encrypt(accessToken, secret),
        refreshToken: encrypt(refreshToken, secret),
        tokenExpiresAt: expiresAt,
        accountEmail: userInfo.email,
        accountId: userInfo.userId,
        connectedAt: new Date(),
      },
    });
  }

  static async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    const response = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Token refresh error: ${error.error_description ?? "Unknown error"}`,
      );
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in ?? 3600,
    };
  }

  static async getConnectionStatus(businessId: string) {
    const connection = await prisma.calendarConnection.findUnique({
      where: { businessId },
    });

    if (
      !connection ||
      connection.provider !== CalendarProvider.OUTLOOK ||
      !connection.connectedAt
    ) {
      return { isConnected: false as const };
    }

    return {
      isConnected: true as const,
      provider: connection.provider,
      accountEmail: connection.accountEmail,
      connectedAt: connection.connectedAt,
      tokenExpiresAt: connection.tokenExpiresAt,
    };
  }

  static async getValidAccessToken(businessId: string): Promise<string> {
    const connection = await prisma.calendarConnection.findUnique({
      where: { businessId },
    });

    if (!connection?.refreshToken || !connection.accessToken) {
      throw new Error("Outlook Calendar is not connected.");
    }

    const secret = env.ENCRYPTION_SECRET;
    const refreshToken = decrypt(connection.refreshToken, secret);
    const expiresAt = connection.tokenExpiresAt;
    const soon = new Date(Date.now() + 5 * 60 * 1000);

    if (!expiresAt || expiresAt < soon) {
      const refreshed = await this.refreshAccessToken(refreshToken);
      const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
      await prisma.calendarConnection.update({
        where: { businessId },
        data: {
          accessToken: encrypt(refreshed.accessToken, secret),
          tokenExpiresAt: newExpiresAt,
        },
      });
      return refreshed.accessToken;
    }

    return decrypt(connection.accessToken, secret);
  }

  static async getMailboxTimeZone(businessId: string): Promise<string | null> {
    const accessToken = await this.getValidAccessToken(businessId);
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/mailboxSettings",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { timeZone?: string };
    return data.timeZone ?? null;
  }
}
