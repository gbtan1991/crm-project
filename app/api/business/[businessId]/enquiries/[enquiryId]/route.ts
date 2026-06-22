import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  deleteEnquiryForBusiness,
  getEnquiryForBusiness,
  updateEnquiryForBusiness,
} from "@/lib/enquiries";
import { enquiryUpdateSchema } from "@/lib/validation/form";

type RouteContext = {
  params: Promise<{ businessId: string; enquiryId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { businessId, enquiryId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const enquiry = await getEnquiryForBusiness(businessId, enquiryId);
    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
    }

    return NextResponse.json({ enquiry });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/enquiries/:id][GET]", error);
    return NextResponse.json(
      { error: "Failed to load enquiry." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { businessId, enquiryId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = enquiryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const enquiry = await updateEnquiryForBusiness(
      businessId,
      enquiryId,
      parsed.data,
    );

    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
    }

    if ("error" in enquiry) {
      return NextResponse.json({ error: enquiry.error }, { status: 400 });
    }

    return NextResponse.json({ enquiry });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/enquiries/:id][PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update enquiry." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { businessId, enquiryId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const result = await deleteEnquiryForBusiness(businessId, enquiryId);
    if (!result) {
      return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/enquiries/:id][DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete enquiry." },
      { status: 500 },
    );
  }
}
