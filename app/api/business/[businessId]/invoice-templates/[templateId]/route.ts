import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  deleteInvoiceTemplateForBusiness,
  getInvoiceTemplateForBusiness,
  updateInvoiceTemplateForBusiness,
} from "@/lib/invoice-templates";
import { invoiceTemplateWriteSchema } from "@/lib/validation/invoice";
import { Prisma } from "@/lib/generated/prisma/client";

type RouteContext = {
  params: Promise<{ businessId: string; templateId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { businessId, templateId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const template = await getInvoiceTemplateForBusiness(businessId, templateId);
    if (!template) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }

    if ("error" in template) {
      return NextResponse.json({ error: template.error }, { status: 400 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/invoice-templates/:id][GET]", error);
    return NextResponse.json(
      { error: "Failed to load invoice template." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { businessId, templateId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = invoiceTemplateWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const template = await updateInvoiceTemplateForBusiness(
      businessId,
      templateId,
      parsed.data,
    );

    if (!template) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A template with this name already exists." },
        { status: 409 },
      );
    }
    console.error("[business/invoice-templates/:id][PUT]", error);
    return NextResponse.json(
      { error: "Failed to update invoice template." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { businessId, templateId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const result = await deleteInvoiceTemplateForBusiness(businessId, templateId);

    if (!result) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/invoice-templates/:id][DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete invoice template." },
      { status: 500 },
    );
  }
}
