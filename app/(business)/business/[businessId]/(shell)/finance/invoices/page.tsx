import { notFound } from "next/navigation";
import { Suspense } from "react";

import { InvoicesListPanel } from "@/app/(business)/business/[businessId]/(shell)/finance/invoices/invoices-list-panel";
import { InvoicesTabNav } from "@/app/(business)/business/[businessId]/(shell)/finance/invoices/invoices-tab-nav";
import { TemplatesListPanel } from "@/app/(business)/business/[businessId]/(shell)/finance/invoices/templates-list-panel";
import { PageHeader } from "@/app/(business)/business/page-header";
import { auth } from "@/auth";
import { getBusinessForViewer } from "@/lib/business-context";
import { listInvoiceTemplatesForBusiness } from "@/lib/invoice-templates";
import {
  listInvoicesForBusiness,
  parseInvoicePageParam,
  parseInvoiceStatusParam,
} from "@/lib/invoices";

type PageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{
    page?: string;
    status?: string;
    tab?: string;
    edit?: string;
  }>;
};

export default async function InvoicesPage({ params, searchParams }: PageProps) {
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

  const tab = query.tab === "templates" ? "templates" : "invoices";
  const timeZone = business.config?.timezone ?? "UTC";

  const [templates, invoices] = await Promise.all([
    listInvoiceTemplatesForBusiness(businessId),
    tab === "invoices"
      ? listInvoicesForBusiness(businessId, {
          page: parseInvoicePageParam(query.page),
          status: parseInvoiceStatusParam(query.status),
        })
      : null,
  ]);

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={
          tab === "templates"
            ? "Manage reusable invoice templates"
            : "Create, send, and track customer invoices"
        }
      />

      <Suspense fallback={null}>
        <InvoicesTabNav businessId={businessId} />
      </Suspense>

      {tab === "templates" ? (
        <TemplatesListPanel
          businessId={businessId}
          templates={templates}
          editingTemplateId={query.edit}
        />
      ) : (
        <InvoicesListPanel
          businessId={businessId}
          invoices={
            invoices ?? {
              total: 0,
              page: 1,
              totalPages: 0,
              openTotal: 0,
              rows: [],
            }
          }
          timeZone={timeZone}
          hasTemplates={templates.length > 0}
          statusQuery={query.status}
        />
      )}
    </div>
  );
}
