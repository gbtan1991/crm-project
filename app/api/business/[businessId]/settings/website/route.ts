import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { websiteSettingsSchema } from "@/lib/validation/business-settings";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = websiteSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 },
      );
    }

    const config = await prisma.businessConfig.upsert({
      where: { businessId },
      update: {
        domain: parsed.data.domain || null,
        hostingAccess: parsed.data.hostingAccess || null,
        hasWebsite: parsed.data.hasWebsite,
        hasGoogleAnalytics: parsed.data.hasGoogleAnalytics,
        hasSearchConsole: parsed.data.hasSearchConsole,
      },
      create: {
        businessId,
        domain: parsed.data.domain || null,
        hostingAccess: parsed.data.hostingAccess || null,
        hasWebsite: parsed.data.hasWebsite,
        hasGoogleAnalytics: parsed.data.hasGoogleAnalytics,
        hasSearchConsole: parsed.data.hasSearchConsole,
      },
      select: {
        domain: true,
        hostingAccess: true,
        hasWebsite: true,
        hasGoogleAnalytics: true,
        hasSearchConsole: true,
      },
    });

    return NextResponse.json({
      domain: config.domain,
      hostingAccess: config.hostingAccess,
      hasWebsite: config.hasWebsite,
      hasGoogleAnalytics: config.hasGoogleAnalytics,
      hasSearchConsole: config.hasSearchConsole,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/settings/website][PATCH]", error);
    return NextResponse.json(
      { error: "Website-Einstellungen konnten nicht aktualisiert werden." },
      { status: 500 },
    );
  }
}
