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
import { listCustomerOptionsForBusiness } from "@/lib/customers";
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
          title="Enquiries"
          subtitle="Capture leads from your website with webhook forms"
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
  const [enquiries, forms, customers] = await Promise.all([
    listEnquiriesForBusiness(businessId, { status, limit: 100 }),
    listFormsForBusiness(businessId),
    listCustomerOptionsForBusiness(businessId),
  ]);

  const newCount = enquiries.filter((enquiry) => enquiry.status === "NEW").length;

  return (
    <div>
      <PageHeader
        title="Enquiries"
        subtitle={`${enquiries.length} total · ${newCount} new · ${forms.length} form${forms.length === 1 ? "" : "s"}`}
      >
        <EnquiriesStatusFilter businessId={businessId} current={status} />
        <AddEnquiryDialog businessId={businessId} forms={forms} />
      </PageHeader>
      <EnquiriesTabNav businessId={businessId} />
      <EnquiriesListPanel
        businessId={businessId}
        customers={customers}
        enquiries={enquiries}
        timeZone={business.config?.timezone ?? "UTC"}
      />
    </div>
  );
}
