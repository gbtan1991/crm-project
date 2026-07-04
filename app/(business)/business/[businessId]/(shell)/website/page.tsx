import { notFound } from "next/navigation";

import { PageHeader } from "@/app/(business)/business/page-header";
import { WebsitePanel } from "@/app/(business)/business/[businessId]/(shell)/website/website-panel";
import { auth } from "@/auth";
import { getBusinessForViewer } from "@/lib/business-context";
import { getReviewStats } from "@/lib/reviews";
import { listWebsiteTicketsForBusiness } from "@/lib/website-tickets";

type PageProps = {
  params: Promise<{ businessId: string }>;
};

export default async function WebsitePage({ params }: PageProps) {
  const { businessId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const business = await getBusinessForViewer(businessId, session.user);
  if (!business) {
    notFound();
  }

  const timeZone = business.config?.timezone ?? "UTC";
  const [result, reviewStats] = await Promise.all([
    listWebsiteTicketsForBusiness(businessId),
    getReviewStats(businessId, { period: "all", timeZone }),
  ]);
  if (!result) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title="Webseite"
        subtitle="Website-Informationen verwalten und Änderungen anfragen."
      />
      <WebsitePanel
        businessId={businessId}
        role={session.user.role}
        overview={result.overview}
        tickets={result.tickets}
        reviewStats={reviewStats}
      />
    </div>
  );
}
