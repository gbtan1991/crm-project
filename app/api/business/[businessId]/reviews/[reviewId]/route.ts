import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  resetReviewForManualRetry,
  sendQueuedDirectReview,
} from "@/lib/review-delivery";
import {
  declineReview,
  getReviewForBusiness,
  requestReviewUpdate,
} from "@/lib/reviews";
import {
  declineReviewSchema,
  requestReviewUpdateSchema,
  retryReviewSchema,
} from "@/lib/validation/review";

const patchSchema = z.discriminatedUnion("action", [
  declineReviewSchema,
  requestReviewUpdateSchema,
  retryReviewSchema,
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; reviewId: string }> },
) {
  try {
    const { businessId, reviewId } = await params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Aktion." },
        { status: 400 },
      );
    }

    if (parsed.data.action === "decline") {
      const review = await declineReview(reviewId, businessId);
      return NextResponse.json({ review });
    }

    if (parsed.data.action === "retry") {
      const resetResult = await resetReviewForManualRetry(reviewId, businessId);
      if ("error" in resetResult) {
        return NextResponse.json({ error: resetResult.error }, { status: 400 });
      }

      const emailResult = await sendQueuedDirectReview(businessId, reviewId, {
        subject: resetResult.subject,
        bodyHtml: resetResult.bodyHtml,
      });

      const updatedReview = await getReviewForBusiness(businessId, reviewId);
      if (!emailResult.ok) {
        return NextResponse.json(
          {
            review: updatedReview,
            warning: emailResult.error,
          },
          { status: 200 },
        );
      }

      return NextResponse.json({
        review: await getReviewForBusiness(businessId, reviewId),
        messageId: emailResult.messageId,
      });
    }

    const result = await requestReviewUpdate(reviewId, businessId, parsed.data);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const emailResult = await sendQueuedDirectReview(
      businessId,
      result.review.id,
      {
        subject: parsed.data.subject,
        bodyHtml: parsed.data.bodyHtml,
      },
    );

    const review = await getReviewForBusiness(businessId, result.review.id);
    if (!emailResult.ok) {
      return NextResponse.json(
        {
          review,
          warning: emailResult.error,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      review: await getReviewForBusiness(businessId, result.review.id),
      messageId: emailResult.messageId,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[business/reviews/reviewId][PATCH]", error);
    return NextResponse.json(
      { error: "Bewertung konnte nicht aktualisiert werden." },
      { status: 500 },
    );
  }
}
