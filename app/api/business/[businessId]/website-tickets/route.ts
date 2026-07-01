import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  createWebsiteTicketForBusiness,
  listWebsiteTicketsForBusiness,
} from "@/lib/website-tickets";
import { websiteTicketWriteSchema } from "@/lib/validation/website-ticket";

type RouteContext = {
  params: Promise<{ businessId: string }>;
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
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const result = await listWebsiteTicketsForBusiness(businessId);
    if (!result) {
      return NextResponse.json({ error: "Unternehmen nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/website-tickets][GET]", error);
    return NextResponse.json(
      { error: "Website-Tickets konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const formData = await request.formData();
    const parsed = websiteTicketWriteSchema.safeParse(fieldsFromFormData(formData));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 },
      );
    }

    const result = await createWebsiteTicketForBusiness({
      businessId,
      data: parsed.data,
      files: filesFromFormData(formData),
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (!("ticket" in result)) {
      return NextResponse.json(
        { error: "Website-Ticket konnte nicht erstellt werden." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ticket: result.ticket }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/website-tickets][POST]", error);
    return NextResponse.json(
      { error: "Website-Ticket konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
