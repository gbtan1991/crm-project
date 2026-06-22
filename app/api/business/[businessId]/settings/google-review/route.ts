import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { googleReviewSettingsSchema } from "@/lib/validation/business-settings";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = googleReviewSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const config = await prisma.businessConfig.upsert({
      where: { businessId },
      update: {
        googleReviewUrl: parsed.data.googleReviewUrl || null,
      },
      create: {
        businessId,
        googleReviewUrl: parsed.data.googleReviewUrl || null,
      },
      select: { googleReviewUrl: true },
    });

    return NextResponse.json({ googleReviewUrl: config.googleReviewUrl });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/settings/google-review][PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update Google review settings." },
      { status: 500 },
    );
  }
}
