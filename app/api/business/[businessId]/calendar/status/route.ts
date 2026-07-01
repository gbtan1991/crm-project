import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const connection = await prisma.calendarConnection.findUnique({
      where: { businessId },
      select: {
        provider: true,
        accountEmail: true,
        connectedAt: true,
        lastSyncedAt: true,
        initialSyncAt: true,
        webhookChannelId: true,
        graphSubscriptionId: true,
      },
    });

    const isConnected = Boolean(connection?.connectedAt && connection.provider);

    return NextResponse.json({
      isConnected,
      provider: connection?.provider ?? null,
      accountEmail: connection?.accountEmail ?? null,
      connectedAt: connection?.connectedAt ?? null,
      lastSyncedAt: connection?.lastSyncedAt ?? null,
      initialSyncAt: connection?.initialSyncAt ?? null,
      webhookActive: Boolean(
        connection?.webhookChannelId ?? connection?.graphSubscriptionId,
      ),
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/calendar/status][GET]", error);
    return NextResponse.json(
      { error: "Kalenderstatus konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}
