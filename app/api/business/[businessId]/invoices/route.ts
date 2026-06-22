import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  createInvoiceForBusiness,
  listInvoicesForBusiness,
  parseInvoicePageParam,
  parseInvoiceStatusParam,
} from "@/lib/invoices";
import { invoiceWriteSchema } from "@/lib/validation/invoice";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const { searchParams } = new URL(request.url);
    const page = parseInvoicePageParam(searchParams.get("page") ?? undefined);
    const status = parseInvoiceStatusParam(searchParams.get("status") ?? undefined);

    const result = await listInvoicesForBusiness(businessId, { page, status });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/invoices][GET]", error);
    return NextResponse.json(
      { error: "Failed to load invoices." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = invoiceWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const invoice = await createInvoiceForBusiness(businessId, parsed.data);
    if (!invoice) {
      return NextResponse.json(
        { error: "Customer or invoice template not found." },
        { status: 404 },
      );
    }

    if ("error" in invoice) {
      return NextResponse.json({ error: invoice.error }, { status: 400 });
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/invoices][POST]", error);
    return NextResponse.json(
      { error: "Failed to create invoice." },
      { status: 500 },
    );
  }
}
