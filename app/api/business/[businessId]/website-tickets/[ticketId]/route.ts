import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  deleteWebsiteTicketForBusiness,
  updateWebsiteTicketForBusiness,
} from "@/lib/website-tickets";
import { websiteTicketWriteSchema } from "@/lib/validation/website-ticket";

type RouteContext = {
  params: Promise<{ businessId: string; ticketId: string }>;
};

function filesFromFormData(formData: FormData) {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function fieldsFromFormData(formData: FormData) {
  return {
    type: formData.get("type"),
    priority: formData.get("priority"),
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status") || undefined,
    adminNote: formData.get("adminNote") || undefined,
  };
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { businessId, ticketId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const formData = await request.formData();
    const parsed = websiteTicketWriteSchema.safeParse(fieldsFromFormData(formData));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const result = await updateWebsiteTicketForBusiness({
      businessId,
      ticketId,
      data: parsed.data,
      files: filesFromFormData(formData),
    });

    if (!result) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (!("ticket" in result)) {
      return NextResponse.json(
        { error: "Failed to update website ticket." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ticket: result.ticket });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/website-tickets/:id][PUT]", error);
    return NextResponse.json(
      { error: "Failed to update website ticket." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { businessId, ticketId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const result = await deleteWebsiteTicketForBusiness(businessId, ticketId);
    if (!result) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/website-tickets/:id][DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete website ticket." },
      { status: 500 },
    );
  }
}
