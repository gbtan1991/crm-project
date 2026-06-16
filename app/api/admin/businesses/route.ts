import { NextResponse } from "next/server";

import { ApiAuthError, requireAdmin } from "@/lib/auth/guards";
import { createBusiness, listBusinessesForAdmin } from "@/lib/businesses";
import { createBusinessSchema } from "@/lib/validation/business";

export async function GET() {
  try {
    await requireAdmin();
    const businesses = await listBusinessesForAdmin();
    return NextResponse.json({ businesses });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/businesses][GET]", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => null);
    const parsed = createBusinessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const result = await createBusiness(parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json(
      { businessId: result.businessId },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/businesses][POST]", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
