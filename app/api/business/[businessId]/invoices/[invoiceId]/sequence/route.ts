import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { startInvoiceSequenceForBusiness } from "@/lib/sequences";
import { startInvoiceSequenceSchema } from "@/lib/validation/sequence";

type RouteContext = {
  params: Promise<{ businessId: string; invoiceId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { businessId, invoiceId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = startInvoiceSequenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 },
      );
    }

    const result = await startInvoiceSequenceForBusiness(
      businessId,
      invoiceId,
      parsed.data.sequenceId,
    );

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/invoices/:id/sequence][POST]", error);
    return NextResponse.json(
      { error: "Rechnungssequenz konnte nicht gestartet werden." },
      { status: 500 },
    );
  }
}
