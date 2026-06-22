import { ReviewStatus } from "@/lib/generated/prisma/client";
import { formatCustomerName } from "@/lib/customer-display";
import { prisma } from "@/lib/prisma";
import type {
  CreateReviewInput,
  ListReviewsInput,
  RequestReviewUpdateInput,
  SubmitReviewInput,
} from "@/lib/validation/review";

type PaginatedResult<T> = { items: T; total: number; totalPages: number };

const reviewListSelect = {
  id: true,
  status: true,
  rating: true,
  content: true,
  requestedAt: true,
  requestReason: true,
  requestCount: true,
  respondedAt: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      companyName: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  booking: {
    select: {
      id: true,
      title: true,
      startsAt: true,
    },
  },
} as const;

export type ReviewListRow = {
  id: string;
  status: ReviewStatus;
  rating: number | null;
  content: string | null;
  requestedAt: string | null;
  requestReason: string | null;
  requestCount: number;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  booking: {
    id: string;
    title: string;
    startsAt: string;
  } | null;
};

function serializeReview(review: {
  id: string;
  status: ReviewStatus;
  rating: number | null;
  content: string | null;
  requestedAt: Date | null;
  requestReason: string | null;
  requestCount: number;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  booking: {
    id: string;
    title: string;
    startsAt: Date;
  } | null;
}): ReviewListRow {
  return {
    id: review.id,
    status: review.status,
    rating: review.rating,
    content: review.content,
    requestedAt: review.requestedAt?.toISOString() ?? null,
    requestReason: review.requestReason,
    requestCount: review.requestCount,
    respondedAt: review.respondedAt?.toISOString() ?? null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    customer: review.customer,
    booking: review.booking
      ? {
          id: review.booking.id,
          title: review.booking.title,
          startsAt: review.booking.startsAt.toISOString(),
        }
      : null,
  };
}

export async function createReview(
  businessId: string,
  input: CreateReviewInput,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, businessId },
    select: { id: true },
  });
  if (!customer) {
    return { error: "Customer not found." as const };
  }

  if (input.bookingId) {
    const booking = await prisma.booking.findFirst({
      where: { id: input.bookingId, businessId, customerId: input.customerId },
      select: { id: true },
    });
    if (!booking) {
      return { error: "Booking not found for this customer." as const };
    }
  }

  const review = await prisma.review.create({
    data: {
      businessId,
      customerId: input.customerId,
      bookingId: input.bookingId || null,
      status: ReviewStatus.REQUESTED,
      requestedAt: new Date(),
      requestReason: input.requestReason?.trim() || null,
      requestCount: 1,
    },
    select: reviewListSelect,
  });

  return { review: serializeReview(review) };
}

export async function listReviews(
  businessId: string,
  input: ListReviewsInput,
): Promise<PaginatedResult<ReviewListRow[]>> {
  const where = {
    businessId,
    ...(input.status ? { status: input.status as ReviewStatus } : {}),
  };

  const orderBy =
    input.sort === "oldest"
      ? { createdAt: "asc" as const }
      : { createdAt: "desc" as const };

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      select: reviewListSelect,
      orderBy,
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    items: items.map(serializeReview),
    total,
    totalPages: Math.ceil(total / input.limit),
  };
}

export async function getReviewById(id: string) {
  return prisma.review.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      rating: true,
      content: true,
      requestedAt: true,
      requestReason: true,
      requestCount: true,
      respondedAt: true,
      createdAt: true,
      business: {
        select: {
          id: true,
          name: true,
          config: {
            select: {
              googleReviewUrl: true,
            },
          },
        },
      },
      customer: {
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      booking: {
        select: {
          id: true,
          title: true,
          startsAt: true,
        },
      },
    },
  });
}

export async function getReviewForBusiness(
  businessId: string,
  reviewId: string,
) {
  const review = await prisma.review.findFirst({
    where: { id: reviewId, businessId },
    select: reviewListSelect,
  });

  return review ? serializeReview(review) : null;
}

export async function submitReview(id: string, data: SubmitReviewInput) {
  const review = await prisma.review.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!review) {
    throw new Error("Review not found.");
  }
  if (review.status !== ReviewStatus.REQUESTED) {
    throw new Error("Review has already been submitted.");
  }

  return prisma.review.update({
    where: { id: review.id },
    data: {
      status: ReviewStatus.RECEIVED,
      rating: data.rating,
      content: data.content || null,
      respondedAt: new Date(),
    },
    select: {
      id: true,
      status: true,
      rating: true,
      content: true,
      respondedAt: true,
      business: { select: { name: true } },
    },
  });
}

export async function declineReview(reviewId: string, businessId: string) {
  const review = await prisma.review.findFirst({
    where: { id: reviewId, businessId, status: ReviewStatus.REQUESTED },
    select: { id: true },
  });

  if (!review) {
    throw new Error("Review not found or already responded to.");
  }

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: {
      status: ReviewStatus.DECLINED,
      respondedAt: new Date(),
    },
    select: reviewListSelect,
  });

  return serializeReview(updated);
}

export async function requestReviewUpdate(
  reviewId: string,
  businessId: string,
  input: RequestReviewUpdateInput,
) {
  const existing = await prisma.review.findFirst({
    where: { id: reviewId, businessId },
    select: { id: true, status: true, requestCount: true },
  });

  if (!existing) {
    return { error: "Review not found." as const };
  }
  if (existing.status !== ReviewStatus.RECEIVED) {
    return { error: "Only received reviews can be reopened for updates." as const };
  }

  const review = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: ReviewStatus.REQUESTED,
      requestedAt: new Date(),
      requestReason: input.requestReason?.trim() || null,
      requestCount: { increment: 1 },
    },
    select: reviewListSelect,
  });

  return { review: serializeReview(review) };
}

export async function getReviewStats(businessId: string) {
  const [total, requested, received, declined, latest] = await Promise.all([
    prisma.review.count({ where: { businessId } }),
    prisma.review.count({ where: { businessId, status: ReviewStatus.REQUESTED } }),
    prisma.review.count({ where: { businessId, status: ReviewStatus.RECEIVED } }),
    prisma.review.count({ where: { businessId, status: ReviewStatus.DECLINED } }),
    prisma.review.findFirst({
      where: { businessId, status: ReviewStatus.RECEIVED },
      orderBy: { respondedAt: "desc" },
      select: reviewListSelect,
    }),
  ]);

  const avgRatingResult = await prisma.review.aggregate({
    where: { businessId, status: ReviewStatus.RECEIVED, rating: { not: null } },
    _avg: { rating: true },
  });

  return {
    total,
    requested,
    received,
    declined,
    avgRating: avgRatingResult._avg.rating ?? null,
    latest: latest ? serializeReview(latest) : null,
  };
}

export async function getCustomerReviewsForTimeline(
  businessId: string,
  customerId: string,
) {
  return prisma.review.findMany({
    where: { businessId, customerId },
    select: {
      id: true,
      status: true,
      rating: true,
      content: true,
      createdAt: true,
      respondedAt: true,
      booking: {
        select: { title: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function customerNameForReview(review: ReviewListRow) {
  return formatCustomerName(review.customer);
}
