import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { businessGeneralSettingsSchema } from "@/lib/validation/business-settings";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = businessGeneralSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const [business, config] = await prisma.$transaction([
      prisma.business.update({
        where: { id: businessId },
        data: { name: parsed.data.name },
        select: { id: true, name: true },
      }),
      prisma.businessConfig.upsert({
        where: { businessId },
        update: { timezone: parsed.data.timezone },
        create: {
          businessId,
          timezone: parsed.data.timezone,
        },
        select: { timezone: true },
      }),
    ]);

    return NextResponse.json({
      name: business.name,
      timezone: config.timezone,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/settings/general][PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update business settings." },
      { status: 500 },
    );
  }
}
