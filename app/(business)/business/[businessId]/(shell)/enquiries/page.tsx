import { notFound } from "next/navigation";

import { AddEnquiryDialog } from "@/app/(business)/business/[businessId]/(shell)/enquiries/add-enquiry-dialog";
import { EnquiriesListPanel } from "@/app/(business)/business/[businessId]/(shell)/enquiries/enquiries-list-panel";
import { EnquiriesStatusFilter } from "@/app/(business)/business/[businessId]/(shell)/enquiries/enquiries-status-filter";
import { EnquiriesTabNav } from "@/app/(business)/business/[businessId]/(shell)/enquiries/enquiries-tab-nav";
import { FormsListPanel } from "@/app/(business)/business/[businessId]/(shell)/enquiries/forms-list-panel";
import { PageHeader } from "@/app/(business)/business/page-header";
import { auth } from "@/auth";
import { env } from "@/env/client.mjs";
import { getBusinessForViewer } from "@/lib/business-context";
import { listEnquiriesForBusiness } from "@/lib/enquiries";
import { listFormsForBusiness } from "@/lib/forms";
import type { EnquiryStatus } from "@/lib/generated/prisma/client";

type PageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ tab?: string; status?: string }>;
};

function parseStatus(value: string | undefined): EnquiryStatus | "ALL" {
  return value === "NEW" || value === "READ" || value === "ARCHIVED"
    ? value
    : "ALL";
}

export default async function EnquiriesPage({ params, searchParams }: PageProps) {
  const { businessId } = await params;
  const query = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const business = await getBusinessForViewer(businessId, session.user);
  if (!business) {
    notFound();
  }

  if (query.tab === "forms") {
    const forms = await listFormsForBusiness(businessId);

    return (
      <div>
        <PageHeader
          title="Anfragen"
          subtitle="Erfassen Sie Leads von Ihrer Website mit Webhook-Formularen"
        />
        <EnquiriesTabNav businessId={businessId} />
        <FormsListPanel
          businessId={businessId}
          forms={forms}
          baseUrl={env.NEXT_PUBLIC_URL}
        />
      </div>
    );
  }

  const status = parseStatus(query.status);
  const [enquiries, forms] = await Promise.all([
    listEnquiriesForBusiness(businessId, { status, limit: 100 }),
    listFormsForBusiness(businessId),
  ]);

  const newCount = enquiries.filter((enquiry) => enquiry.status === "NEW").length;

  return (
    <div>
      <PageHeader
        title="Anfragen"
        subtitle={`${enquiries.length} insgesamt · ${newCount} neu · ${forms.length} Formular${forms.length === 1 ? "" : "e"}`}
      >
        <EnquiriesStatusFilter businessId={businessId} current={status} />
        <AddEnquiryDialog businessId={businessId} forms={forms} />
      </PageHeader>
      <EnquiriesTabNav businessId={businessId} />
      <EnquiriesListPanel
        businessId={businessId}
        enquiries={enquiries}
        timeZone={business.config?.timezone ?? "UTC"}
      />
    </div>
  );
}
