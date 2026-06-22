import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  createSequenceForBusiness,
  listSequencesForBusiness,
} from "@/lib/sequences";
import { sequenceWriteSchema } from "@/lib/validation/sequence";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const sequences = await listSequencesForBusiness(businessId);
    return NextResponse.json({ sequences });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/sequences][GET]", error);
    return NextResponse.json(
      { error: "Failed to load sequences." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = sequenceWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const sequence = await createSequenceForBusiness(businessId, parsed.data);
    if ("error" in sequence) {
      return NextResponse.json({ error: sequence.error }, { status: 400 });
    }

    return NextResponse.json({ sequence }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/sequences][POST]", error);
    return NextResponse.json(
      { error: "Failed to create sequence." },
      { status: 500 },
    );
  }
}
