import { notFound } from "next/navigation";

import { PageHeader } from "@/app/(business)/business/page-header";
import { WebsitePanel } from "@/app/(business)/business/[businessId]/(shell)/website/website-panel";
import { auth } from "@/auth";
import { getBusinessForViewer } from "@/lib/business-context";
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

  const result = await listWebsiteTicketsForBusiness(businessId);
  if (!result) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title="Website"
        subtitle="Review website requirements and request website changes."
      />
      <WebsitePanel
        businessId={businessId}
        role={session.user.role}
        overview={result.overview}
        tickets={result.tickets}
      />
    </div>
  );
}
