import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  deleteFormForBusiness,
  getFormForBusiness,
  updateFormForBusiness,
} from "@/lib/forms";
import { formWriteSchema } from "@/lib/validation/form";

type RouteContext = {
  params: Promise<{ businessId: string; formId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { businessId, formId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const form = await getFormForBusiness(businessId, formId);
    if (!form) {
      return NextResponse.json({ error: "Formular nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ form });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/forms/:id][GET]", error);
    return NextResponse.json({ error: "Formular konnte nicht geladen werden." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { businessId, formId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = formWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 },
      );
    }

    const form = await updateFormForBusiness(businessId, formId, parsed.data);
    if (!form) {
      return NextResponse.json({ error: "Formular nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ form });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/forms/:id][PATCH]", error);
    return NextResponse.json({ error: "Formular konnte nicht aktualisiert werden." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { businessId, formId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const result = await deleteFormForBusiness(businessId, formId);
    if (!result) {
      return NextResponse.json({ error: "Formular nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/forms/:id][DELETE]", error);
    return NextResponse.json({ error: "Formular konnte nicht gelöscht werden." }, { status: 500 });
  }
}
