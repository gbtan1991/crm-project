import { ReviewStatus, type Prisma } from "@/lib/generated/prisma/client";
import { formatCustomerName } from "@/lib/customer-display";
import { getInclusiveDateRangeBounds } from "@/lib/date-range";
import { startOfDateInTimezone } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import type {
  CreateReviewInput,
  ListReviewsInput,
  RequestReviewUpdateInput,
  ReviewStatsPeriod,
  SubmitReviewInput,
} from "@/lib/validation/review";

export type { ReviewStatsPeriod };

type ReviewDateRange = { from: Date; to: Date };

type PaginatedResult<T> = { items: T; total: number; totalPages: number };

const reviewListSelect = {
  id: true,
  status: true,
  rating: true,
  content: true,
  requestedAt: true,
  requestReason: true,
  requestCount: true,
  failureCount: true,
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
  failureCount: number;
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
  failureCount: number;
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
    failureCount: review.failureCount,
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
    return { error: "Kunde nicht gefunden." as const };
  }

  if (input.bookingId) {
    const booking = await prisma.booking.findFirst({
      where: { id: input.bookingId, businessId, customerId: input.customerId },
      select: { id: true },
    });
    if (!booking) {
      return { error: "Termin für diesen Kunden nicht gefunden." as const };
    }
  }

  const review = await prisma.review.create({
    data: {
      businessId,
      customerId: input.customerId,
      bookingId: input.bookingId || null,
      status: ReviewStatus.QUEUED,
      requestReason: input.requestReason?.trim() || null,
      requestCount: 0,
      failureCount: 0,
      pendingSubject:
        input.deliveryMode === "DIRECT" ? input.subject?.trim() || null : null,
      pendingBodyHtml:
        input.deliveryMode === "DIRECT" ? input.bodyHtml?.trim() || null : null,
    },
    select: reviewListSelect,
  });

  return { review: serializeReview(review) };
}

export function getReviewStatsPeriodRange(
  period: ReviewStatsPeriod,
  timeZone: string,
  ref = new Date(),
): ReviewDateRange | null {
  if (period === "all" || period === "custom") {
    return null;
  }

  const ymd = ref.toLocaleDateString("en-CA", { timeZone });
  const [year, month] = ymd.split("-").map(Number);
  const nextMonth =
    month === 12
      ? { year: year + 1, month: 1 }
      : { year, month: month + 1 };
  const currentMonthStart = startOfDateInTimezone(timeZone, year, month, 1);
  const nextMonthStart = startOfDateInTimezone(
    timeZone,
    nextMonth.year,
    nextMonth.month,
    1,
  );

  if (period === "this_month") {
    return { from: currentMonthStart, to: nextMonthStart };
  }

  if (period === "last_month") {
    const previousMonth =
      month === 1
        ? { year: year - 1, month: 12 }
        : { year, month: month - 1 };
    return {
      from: startOfDateInTimezone(
        timeZone,
        previousMonth.year,
        previousMonth.month,
        1,
      ),
      to: currentMonthStart,
    };
  }

  const monthsBack = period === "last_3_months" ? 2 : 11;
  let fromYear = year;
  let fromMonth = month - monthsBack;
  while (fromMonth <= 0) {
    fromMonth += 12;
    fromYear -= 1;
  }

  return {
    from: startOfDateInTimezone(timeZone, fromYear, fromMonth, 1),
    to: nextMonthStart,
  };
}

function reviewActivityInRangeWhere(
  range: ReviewDateRange,
): Prisma.ReviewWhereInput {
  return {
    OR: [
      {
        status: ReviewStatus.RECEIVED,
        respondedAt: { gte: range.from, lt: range.to },
      },
      {
        status: ReviewStatus.DECLINED,
        respondedAt: { gte: range.from, lt: range.to },
      },
      {
        status: ReviewStatus.QUEUED,
        createdAt: { gte: range.from, lt: range.to },
      },
      {
        status: ReviewStatus.REQUESTED,
        requestedAt: { gte: range.from, lt: range.to },
      },
      {
        status: ReviewStatus.REQUESTED,
        requestedAt: null,
        createdAt: { gte: range.from, lt: range.to },
      },
    ],
  };
}

export function resolveReviewDateRange(
  input: Pick<ListReviewsInput, "period" | "from" | "to">,
  timeZone: string,
): ReviewDateRange | null {
  if (input.period === "custom" && input.from && input.to) {
    return getInclusiveDateRangeBounds(input.from, input.to, timeZone);
  }

  if (input.period === "all" || input.period === "custom") {
    return null;
  }

  return getReviewStatsPeriodRange(input.period, timeZone);
}

function buildReviewListWhere(
  businessId: string,
  input: ListReviewsInput,
  timeZone: string,
): Prisma.ReviewWhereInput {
  const range = resolveReviewDateRange(input, timeZone);

  return {
    businessId,
    ...(input.status ? { status: input.status as ReviewStatus } : {}),
    ...(range ? reviewActivityInRangeWhere(range) : {}),
  };
}

export async function listReviews(
  businessId: string,
  input: ListReviewsInput,
  timeZone = "UTC",
): Promise<PaginatedResult<ReviewListRow[]>> {
  const where = buildReviewListWhere(businessId, input, timeZone);

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
    throw new Error("Bewertung nicht gefunden.");
  }
  if (review.status !== ReviewStatus.REQUESTED) {
    throw new Error("Bewertung wurde bereits abgegeben.");
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
    throw new Error("Bewertung nicht gefunden oder bereits beantwortet.");
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
    return { error: "Bewertung nicht gefunden." as const };
  }
  if (existing.status !== ReviewStatus.RECEIVED) {
    return { error: "Nur erhaltene Bewertungen können für Aktualisierungen wieder geöffnet werden." as const };
  }

  const review = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: ReviewStatus.QUEUED,
      requestReason: input.requestReason?.trim() || null,
      pendingSubject: input.subject.trim(),
      pendingBodyHtml: input.bodyHtml.trim(),
      failureCount: 0,
    },
    select: reviewListSelect,
  });

  return { review: serializeReview(review) };
}

export async function getReviewStats(
  businessId: string,
  options?: {
    period?: ReviewStatsPeriod;
    from?: string;
    to?: string;
    timeZone?: string;
  },
) {
  const period = options?.period ?? "all";
  const timeZone = options?.timeZone ?? "UTC";
  const range = resolveReviewDateRange(
    { period, from: options?.from, to: options?.to },
    timeZone,
  );
  const periodWhere = range ? reviewActivityInRangeWhere(range) : {};

  const [total, requested, received, declined, latest] = await Promise.all([
    prisma.review.count({ where: { businessId, ...periodWhere } }),
    prisma.review.count({
      where: {
        businessId,
        status: ReviewStatus.REQUESTED,
        ...(range
          ? {
              OR: [
                {
                  requestedAt: { gte: range.from, lt: range.to },
                },
                {
                  requestedAt: null,
                  createdAt: { gte: range.from, lt: range.to },
                },
              ],
            }
          : {}),
      },
    }),
    prisma.review.count({
      where: {
        businessId,
        status: ReviewStatus.RECEIVED,
        ...(range
          ? { respondedAt: { gte: range.from, lt: range.to } }
          : {}),
      },
    }),
    prisma.review.count({
      where: {
        businessId,
        status: ReviewStatus.DECLINED,
        ...(range
          ? { respondedAt: { gte: range.from, lt: range.to } }
          : {}),
      },
    }),
    prisma.review.findFirst({
      where: {
        businessId,
        status: ReviewStatus.RECEIVED,
        ...(range
          ? { respondedAt: { gte: range.from, lt: range.to } }
          : {}),
      },
      orderBy: { respondedAt: "desc" },
      select: reviewListSelect,
    }),
  ]);

  const avgRatingResult = await prisma.review.aggregate({
    where: {
      businessId,
      status: ReviewStatus.RECEIVED,
      rating: { not: null },
      ...(range ? { respondedAt: { gte: range.from, lt: range.to } } : {}),
    },
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
