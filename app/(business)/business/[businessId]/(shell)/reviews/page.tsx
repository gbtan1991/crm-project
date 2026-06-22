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
  searchParams: Promise<{ page?: string; status?: string; sort?: string }>;
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
  });
  const query = parsed.success ? parsed.data : { page: 1, limit: 20, sort: "newest" as const };

  const [result, stats, customers, activeReviewSequence] = await Promise.all([
    listReviews(businessId, query),
    getReviewStats(businessId),
    listCustomerOptionsForBusiness(businessId),
    getActiveReviewSequenceForBusiness(businessId),
  ]);

  return (
    <div>
      <PageHeader
        title="Reviews"
        subtitle="Manage review requests and see what customers are saying."
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
      />
    </div>
  );
}
