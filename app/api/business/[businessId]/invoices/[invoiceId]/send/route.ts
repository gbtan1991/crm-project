import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { sendInvoiceForBusiness } from "@/lib/invoices";
import { getInvoiceEmailCompose } from "@/lib/messages/compose-invoice-email";
import { sendInvoiceEmailSchema } from "@/lib/validation/message";

type RouteContext = {
  params: Promise<{ businessId: string; invoiceId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { businessId, invoiceId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const result = await getInvoiceEmailCompose(businessId, invoiceId);

    if (!result) {
      return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
    }

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ compose: result.compose });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/invoices/:id/send][GET]", error);
    return NextResponse.json(
      { error: "Rechnungs-E-Mail konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { businessId, invoiceId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = sendInvoiceEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 },
      );
    }

    const result = await sendInvoiceForBusiness(
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

    return NextResponse.json({
      invoice: result.invoice,
      messageId: result.messageId,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/invoices/:id/send][POST]", error);
    return NextResponse.json(
      { error: "Rechnung konnte nicht gesendet werden." },
      { status: 500 },
    );
  }
}
