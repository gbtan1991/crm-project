import { NextRequest, NextResponse } from "next/server";

import { getReviewById, submitReview } from "@/lib/reviews";
import { submitReviewSchema } from "@/lib/validation/review";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const review = await getReviewById(id);

    if (!review) {
      return NextResponse.json(
        { error: "Bewertung nicht gefunden." },
        { status: 404 },
      );
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error("[review/id][GET]", error);
    return NextResponse.json(
      { error: "Bewertung konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = submitReviewSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Ungültige Eingabe." },
        { status: 400 },
      );
    }

    const review = await submitReview(id, parsed.data);
    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[review/id][POST]", error);
    return NextResponse.json(
      { error: "Bewertung konnte nicht gesendet werden." },
      { status: 500 },
    );
  }
}
