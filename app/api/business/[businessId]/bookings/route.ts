import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { createBookingForBusiness } from "@/lib/bookings";
import { bookingCreateSchema } from "@/lib/validation/booking";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = bookingCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 },
      );
    }

    const result = await createBookingForBusiness(businessId, parsed.data);

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 400 },
      );
    }

    return NextResponse.json({ booking: result.booking }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/bookings][POST]", error);
    return NextResponse.json(
      { error: "Termin konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
