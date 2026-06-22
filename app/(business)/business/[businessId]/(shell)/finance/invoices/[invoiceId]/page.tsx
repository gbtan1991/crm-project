import { notFound } from "next/navigation";

import { InvoiceDetailView } from "@/app/(business)/business/[businessId]/(shell)/finance/invoices/[invoiceId]/invoice-detail-view";
import { auth } from "@/auth";
import { getBusinessForViewer } from "@/lib/business-context";
import { getInvoiceForBusiness } from "@/lib/invoices";
import { getInvoiceSequenceState } from "@/lib/sequences";

type PageProps = {
  params: Promise<{ businessId: string; invoiceId: string }>;
};

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { businessId, invoiceId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const business = await getBusinessForViewer(businessId, session.user);
  if (!business) {
    notFound();
  }

  const [invoice, sequenceState] = await Promise.all([
    getInvoiceForBusiness(businessId, invoiceId),
    getInvoiceSequenceState(businessId, invoiceId),
  ]);
  if (!invoice) {
    notFound();
  }

  return (
    <InvoiceDetailView
      businessId={businessId}
      timeZone={business.config?.timezone ?? "UTC"}
      invoice={invoice}
      sequenceState={sequenceState}
    />
  );
}
