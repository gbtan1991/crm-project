import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  deleteBookingForBusiness,
  getBookingForBusiness,
  updateBookingForBusiness,
} from "@/lib/bookings";
import { bookingUpdateSchema } from "@/lib/validation/booking";

type RouteContext = {
  params: Promise<{ businessId: string; bookingId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { businessId, bookingId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const booking = await getBookingForBusiness(businessId, bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/bookings/:id][GET]", error);
    return NextResponse.json(
      { error: "Failed to load appointment." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { businessId, bookingId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = bookingUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const booking = await updateBookingForBusiness(
      businessId,
      bookingId,
      parsed.data,
    );

    if (!booking) {
      return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    }

    if ("error" in booking) {
      return NextResponse.json(
        { error: booking.error },
        { status: booking.status ?? 400 },
      );
    }

    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/bookings/:id][PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update appointment." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { businessId, bookingId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const result = await deleteBookingForBusiness(businessId, bookingId);
    if (!result) {
      return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    }

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/bookings/:id][DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete appointment." },
      { status: 500 },
    );
  }
}
