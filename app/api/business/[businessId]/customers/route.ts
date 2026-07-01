import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  listCustomersForBusiness,
  parseCustomerPageParam,
  parseCustomerSearchParam,
} from "@/lib/customers";
import {
  customerWriteSchema,
  normalizeCustomerInput,
} from "@/lib/validation/customer";
import { CustomerSource, Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const { searchParams } = new URL(request.url);
    const page = parseCustomerPageParam(searchParams.get("page") ?? undefined);
    const q = parseCustomerSearchParam(searchParams.get("q") ?? undefined);

    const result = await listCustomersForBusiness(businessId, { page, q });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/customers][GET]", error);
    return NextResponse.json(
      { error: "Kunden konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = customerWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 },
      );
    }

    const data = normalizeCustomerInput(parsed.data);

    const customer = await prisma.customer.create({
      data: {
        businessId,
        ...data,
        source: CustomerSource.MANUAL,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
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
    console.error("[business/customers][POST]", error);
    return NextResponse.json(
      { error: "Kunde konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
