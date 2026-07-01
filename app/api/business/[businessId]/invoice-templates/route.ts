import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  createInvoiceTemplateForBusiness,
  listInvoiceTemplatesForBusiness,
} from "@/lib/invoice-templates";
import { invoiceTemplateWriteSchema } from "@/lib/validation/invoice";
import { Prisma } from "@/lib/generated/prisma/client";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const templates = await listInvoiceTemplatesForBusiness(businessId);

    return NextResponse.json({ templates });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/invoice-templates][GET]", error);
    return NextResponse.json(
      { error: "Rechnungsvorlagen konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = invoiceTemplateWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 },
      );
    }

    const template = await createInvoiceTemplateForBusiness(
      businessId,
      parsed.data,
    );

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Eine Vorlage mit diesem Namen existiert bereits." },
        { status: 409 },
      );
    }
    console.error("[business/invoice-templates][POST]", error);
    return NextResponse.json(
      { error: "Rechnungsvorlage konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
