import { ReviewStatus } from "@/lib/generated/prisma/client";
import { sendReviewRequestEmailForBusiness } from "@/lib/messages/send-review-request-email";
import { prisma } from "@/lib/prisma";

export const REVIEW_SEND_MAX_FAILURES = 5;
const QUEUED_REVIEW_BATCH_LIMIT = 20;

export async function markReviewEmailSent(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { requestedAt: true },
  });

  if (!review) {
    return null;
  }

  return prisma.review.update({
    where: { id: reviewId },
    data: {
      status: ReviewStatus.REQUESTED,
      requestCount: { increment: 1 },
      requestedAt: review.requestedAt ?? new Date(),
      failureCount: 0,
    },
    select: { id: true, status: true, requestCount: true, failureCount: true },
  });
}

export async function recordReviewSendFailure(reviewId: string) {
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: {
      failureCount: { increment: 1 },
    },
    select: {
      id: true,
      failureCount: true,
      status: true,
    },
  });

  if (review.failureCount >= REVIEW_SEND_MAX_FAILURES) {
    await prisma.review.update({
      where: { id: reviewId },
      data: { status: ReviewStatus.FAILED },
    });
    return { exhausted: true as const, failureCount: review.failureCount };
  }

  if (review.status !== ReviewStatus.REQUESTED) {
    await prisma.review.update({
      where: { id: reviewId },
      data: { status: ReviewStatus.QUEUED },
    });
  }

  return { exhausted: false as const, failureCount: review.failureCount };
}

export async function resetReviewForManualRetry(
  reviewId: string,
  businessId: string,
) {
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      businessId,
      status: ReviewStatus.FAILED,
    },
    select: {
      id: true,
      pendingSubject: true,
      pendingBodyHtml: true,
    },
  });

  if (!review) {
    return { error: "Bewertung nicht gefunden oder nicht fehlgeschlagen." as const };
  }

  if (!review.pendingSubject?.trim() || !review.pendingBodyHtml?.trim()) {
    return {
      error: "Für diese Bewertung ist kein E-Mail-Inhalt zum erneuten Senden hinterlegt.",
    } as const;
  }

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: ReviewStatus.QUEUED,
      failureCount: 0,
    },
  });

  return {
    reviewId: review.id,
    subject: review.pendingSubject.trim(),
    bodyHtml: review.pendingBodyHtml.trim(),
  };
}

export async function sendQueuedDirectReview(
  businessId: string,
  reviewId: string,
  input: { subject: string; bodyHtml: string },
) {
  const sendResult = await sendReviewRequestEmailForBusiness(
    businessId,
    reviewId,
    input,
  );

  if (!sendResult) {
    await recordReviewSendFailure(reviewId);
    return { ok: false as const, error: "Bewertung nicht gefunden." };
  }

  if (!sendResult.ok) {
    const failure = await recordReviewSendFailure(reviewId);
    return {
      ok: false as const,
      error: sendResult.error,
      exhausted: failure.exhausted,
    };
  }

  await markReviewEmailSent(reviewId);
  return { ok: true as const, messageId: sendResult.messageId };
}

export async function processQueuedDirectReviewRequests() {
  const due = await prisma.review.findMany({
    where: {
      status: ReviewStatus.QUEUED,
      failureCount: { lt: REVIEW_SEND_MAX_FAILURES },
      pendingSubject: { not: null },
      pendingBodyHtml: { not: null },
      sequenceEnrollments: { none: {} },
    },
    orderBy: { updatedAt: "asc" },
    take: QUEUED_REVIEW_BATCH_LIMIT,
    select: {
      id: true,
      businessId: true,
      pendingSubject: true,
      pendingBodyHtml: true,
    },
  });

  let sent = 0;
  let failed = 0;
  let exhausted = 0;

  for (const review of due) {
    const subject = review.pendingSubject?.trim() ?? "";
    const bodyHtml = review.pendingBodyHtml?.trim() ?? "";

    if (!subject || !bodyHtml) {
      continue;
    }

    const result = await sendQueuedDirectReview(review.businessId, review.id, {
      subject,
      bodyHtml,
    });

    if (result.ok) {
      sent += 1;
    } else if ("exhausted" in result && result.exhausted) {
      exhausted += 1;
    } else {
      failed += 1;
    }
  }

  return {
    due: due.length,
    sent,
    failed,
    exhausted,
  };
}
