import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  createEnquiryForBusiness,
  listEnquiriesForBusiness,
} from "@/lib/enquiries";
import { enquiryCreateSchema } from "@/lib/validation/form";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const enquiries = await listEnquiriesForBusiness(businessId, {
      status:
        status === "NEW" || status === "READ" || status === "ARCHIVED"
          ? status
          : "ALL",
      limit: 100,
    });

    return NextResponse.json({ enquiries });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/enquiries][GET]", error);
    return NextResponse.json(
      { error: "Anfragen konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = enquiryCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 },
      );
    }

    const result = await createEnquiryForBusiness(
      businessId,
      parsed.data.formId,
      parsed.data.data,
    );

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ enquiry: result.enquiry }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/enquiries][POST]", error);
    return NextResponse.json(
      { error: "Anfrage konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
