import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { sendReviewRequestEmailForBusiness } from "@/lib/messages/send-review-request-email";
import { declineReview, requestReviewUpdate } from "@/lib/reviews";
import {
  declineReviewSchema,
  requestReviewUpdateSchema,
} from "@/lib/validation/review";

const patchSchema = z.discriminatedUnion("action", [
  declineReviewSchema,
  requestReviewUpdateSchema,
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
        { error: "Invalid action." },
        { status: 400 },
      );
    }

    if (parsed.data.action === "decline") {
      const review = await declineReview(reviewId, businessId);
      return NextResponse.json({ review });
    }

    const result = await requestReviewUpdate(reviewId, businessId, parsed.data);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const emailResult = await sendReviewRequestEmailForBusiness(
      businessId,
      result.review.id,
      {
        subject: parsed.data.subject,
        bodyText: parsed.data.bodyText,
      },
    );

    if (!emailResult) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    if (!emailResult.ok) {
      return NextResponse.json(
        { error: emailResult.error, review: result.review },
        { status: 400 },
      );
    }

    return NextResponse.json({
      review: result.review,
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
      { error: "Failed to update review." },
      { status: 500 },
    );
  }
}
