import { notFound } from "next/navigation";

import { PageHeader } from "@/app/(business)/business/page-header";
import { auth } from "@/auth";
import { getBusinessForViewer } from "@/lib/business-context";
import { listCustomerOptionsForBusiness } from "@/lib/customers";
import { getReviewStats, listReviews } from "@/lib/reviews";
import { getActiveReviewSequenceForBusiness } from "@/lib/sequences";
import { listReviewsSchema } from "@/lib/validation/review";

import { ReviewList } from "./review-list";

type PageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{
    page?: string;
    status?: string;
    sort?: string;
    period?: string;
  }>;
};

export default async function ReviewsPage({
  params,
  searchParams,
}: PageProps) {
  const { businessId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const business = await getBusinessForViewer(businessId, session.user);
  if (!business) {
    notFound();
  }

  const rawParams = await searchParams;
  const parsed = listReviewsSchema.safeParse({
    page: rawParams.page ?? "1",
    status: rawParams.status,
    sort: rawParams.sort ?? "newest",
    period: rawParams.period ?? "all",
  });
  const query = parsed.success
    ? parsed.data
    : { page: 1, limit: 20, sort: "newest" as const, period: "all" as const };
  const timeZone = business.config?.timezone ?? "UTC";

  const [result, stats, customers, activeReviewSequence] = await Promise.all([
    listReviews(businessId, query, timeZone),
    getReviewStats(businessId, { period: query.period, timeZone }),
    listCustomerOptionsForBusiness(businessId),
    getActiveReviewSequenceForBusiness(businessId),
  ]);

  return (
    <div>
      <PageHeader
        title="Bewertungen"
        subtitle="Verwalten Sie Bewertungsanfragen und sehen Sie, was Kunden sagen."
      />
      <ReviewList
        businessId={businessId}
        businessName={business.name}
        initialGoogleReviewUrl={business.config?.googleReviewUrl ?? null}
        customers={customers}
        activeReviewSequence={activeReviewSequence}
        stats={stats}
        reviews={result.items}
        total={result.total}
        totalPages={result.totalPages}
        currentPage={query.page}
        currentStatus={query.status ?? null}
        currentSort={query.sort}
        currentPeriod={query.period}
      />
    </div>
  );
}
