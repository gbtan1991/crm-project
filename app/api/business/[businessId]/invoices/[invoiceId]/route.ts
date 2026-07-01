import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  getInvoiceForBusiness,
  updateInvoiceForBusiness,
} from "@/lib/invoices";
import { invoiceUpdateSchema } from "@/lib/validation/invoice";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ businessId: string; invoiceId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { businessId, invoiceId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const invoice = await getInvoiceForBusiness(businessId, invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/invoices/:id][GET]", error);
    return NextResponse.json(
      { error: "Rechnung konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { businessId, invoiceId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = invoiceUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 },
      );
    }

    const result = await updateInvoiceForBusiness(
      businessId,
      invoiceId,
      parsed.data,
    );

    if (!result) {
      return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
    }

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ invoice: result.invoice });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/invoices/:id][PATCH]", error);
    return NextResponse.json(
      { error: "Rechnung konnte nicht aktualisiert werden." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { businessId, invoiceId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const existing = await prisma.invoice.findFirst({
      where: { id: invoiceId, businessId },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
    }

    if (existing.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Nur Entwurfsrechnungen können gelöscht werden." },
        { status: 400 },
      );
    }

    await prisma.invoice.delete({ where: { id: invoiceId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/invoices/:id][DELETE]", error);
    return NextResponse.json(
      { error: "Rechnung konnte nicht gelöscht werden." },
      { status: 500 },
    );
  }
}
