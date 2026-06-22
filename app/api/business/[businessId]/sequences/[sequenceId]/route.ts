import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  deleteSequenceForBusiness,
  updateSequenceForBusiness,
} from "@/lib/sequences";
import { sequenceWriteSchema } from "@/lib/validation/sequence";

type RouteContext = {
  params: Promise<{ businessId: string; sequenceId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { businessId, sequenceId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = sequenceWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const sequence = await updateSequenceForBusiness(
      businessId,
      sequenceId,
      parsed.data,
    );
    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found." }, { status: 404 });
    }
    if ("error" in sequence) {
      return NextResponse.json({ error: sequence.error }, { status: 400 });
    }

    return NextResponse.json({ sequence });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/sequences/:id][PUT]", error);
    return NextResponse.json(
      { error: "Failed to update sequence." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { businessId, sequenceId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const result = await deleteSequenceForBusiness(businessId, sequenceId);
    if (!result) {
      return NextResponse.json({ error: "Sequence not found." }, { status: 404 });
    }
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/sequences/:id][DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete sequence." },
      { status: 500 },
    );
  }
}
