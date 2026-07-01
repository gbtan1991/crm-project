import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { buildInvoicePdfForBusiness } from "@/lib/invoice-email";

type RouteContext = {
  params: Promise<{ businessId: string; invoiceId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { businessId, invoiceId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const result = await buildInvoicePdfForBusiness(businessId, invoiceId);

    if (!result) {
      return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
    }

    return new NextResponse(Buffer.from(result.pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/invoices/:id/pdf][GET]", error);
    return NextResponse.json(
      { error: "Rechnungs-PDF konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
