import { NextRequest, NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { sendQueuedDirectReview } from "@/lib/review-delivery";
import { createReview, getReviewForBusiness, listReviews } from "@/lib/reviews";
import { startReviewSequenceForBusiness } from "@/lib/sequences";
import { createReviewSchema, listReviewsSchema } from "@/lib/validation/review";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  try {
    const { businessId } = await params;
    await requireBusinessOwnerOrAdmin(businessId);

    const { searchParams } = new URL(_request.url);
    const parsed = listReviewsSchema.safeParse({
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "20",
      status: searchParams.get("status"),
      sort: searchParams.get("sort") ?? "newest",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Abfrageparameter." },
        { status: 400 },
      );
    }

    const result = await listReviews(businessId, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[business/reviews][GET]", error);
    return NextResponse.json(
      { error: "Bewertungen konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  try {
    const { businessId } = await params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => ({}));
    const parsed = createReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 },
      );
    }

    const result = await createReview(businessId, parsed.data);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (parsed.data.deliveryMode === "SEQUENCE") {
      const sequenceResult = await startReviewSequenceForBusiness(
        businessId,
        result.review.id,
      );

      if ("error" in sequenceResult) {
        return NextResponse.json(
          { error: sequenceResult.error, review: result.review },
          { status: 400 },
        );
      }

      const review = await getReviewForBusiness(businessId, result.review.id);
      return NextResponse.json(
        { review, enrollmentId: sequenceResult.enrollmentId },
        { status: 201 },
      );
    }

    const emailResult = await sendQueuedDirectReview(
      businessId,
      result.review.id,
      {
        subject: parsed.data.subject ?? "",
        bodyHtml: parsed.data.bodyHtml ?? "",
      },
    );

    const review = await getReviewForBusiness(businessId, result.review.id);
    if (!review) {
      return NextResponse.json({ error: "Bewertung nicht gefunden." }, { status: 404 });
    }

    if (!emailResult.ok) {
      return NextResponse.json(
        {
          review,
          warning: emailResult.error,
          queued: !("exhausted" in emailResult && emailResult.exhausted),
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      { review: await getReviewForBusiness(businessId, result.review.id), messageId: emailResult.messageId },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[business/reviews][POST]", error);
    return NextResponse.json(
      { error: "Bewertung konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
