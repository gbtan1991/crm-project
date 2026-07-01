import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { getCustomerForBusiness } from "@/lib/customers";
import {
  customerWriteSchema,
  normalizeCustomerInput,
} from "@/lib/validation/customer";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ businessId: string; customerId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { businessId, customerId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const customer = await getCustomerForBusiness(businessId, customerId);
    if (!customer) {
      return NextResponse.json({ error: "Kunde nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/customers/[id]][GET]", error);
    return NextResponse.json(
      { error: "Kunde konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { businessId, customerId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const existing = await getCustomerForBusiness(businessId, customerId);
    if (!existing) {
      return NextResponse.json({ error: "Kunde nicht gefunden." }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = customerWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 },
      );
    }

    const data = normalizeCustomerInput(parsed.data);

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data,
    });

    return NextResponse.json({ customer });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ein Kunde mit dieser E-Mail existiert bereits." },
        { status: 409 },
      );
    }
    console.error("[business/customers/[id]][PATCH]", error);
    return NextResponse.json(
      { error: "Kunde konnte nicht aktualisiert werden." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { businessId, customerId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const existing = await getCustomerForBusiness(businessId, customerId);
    if (!existing) {
      return NextResponse.json({ error: "Kunde nicht gefunden." }, { status: 404 });
    }

    if (existing._count.invoices > 0) {
      return NextResponse.json(
        {
          error:
            "This customer has invoices and cannot be deleted. Set them inactive instead.",
        },
        { status: 409 },
      );
    }

    await prisma.customer.delete({
      where: { id: customerId },
    });

    return NextResponse.json({
      ok: true,
      deletedBookings: existing._count.bookings,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/customers/[id]][DELETE]", error);
    return NextResponse.json(
      { error: "Kunde konnte nicht gelöscht werden." },
      { status: 500 },
    );
  }
}
