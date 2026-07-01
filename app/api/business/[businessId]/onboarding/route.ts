import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { getOnboardingState, patchOnboarding } from "@/lib/onboarding";
import { onboardingPatchSchema } from "@/lib/validation/onboarding";

export async function GET(
  _request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const state = await getOnboardingState(businessId);
    if (!state) {
      return NextResponse.json({ error: "Unternehmen nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json(state);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/onboarding][GET]", error);
    return NextResponse.json({ error: "Es ist ein Fehler aufgetreten." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ businessId: string }> },
) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = onboardingPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 },
      );
    }

    const result = await patchOnboarding(businessId, parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.state);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/onboarding][PATCH]", error);
    return NextResponse.json({ error: "Es ist ein Fehler aufgetreten." }, { status: 500 });
  }
}
