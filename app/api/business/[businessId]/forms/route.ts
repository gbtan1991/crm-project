import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { createFormForBusiness, listFormsForBusiness } from "@/lib/forms";
import { formWriteSchema } from "@/lib/validation/form";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const forms = await listFormsForBusiness(businessId);
    return NextResponse.json({ forms });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/forms][GET]", error);
    return NextResponse.json({ error: "Failed to load forms." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = formWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const form = await createFormForBusiness(businessId, parsed.data);
    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/forms][POST]", error);
    return NextResponse.json({ error: "Failed to create form." }, { status: 500 });
  }
}
