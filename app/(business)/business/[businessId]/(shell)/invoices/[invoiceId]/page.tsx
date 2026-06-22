import { redirect } from "next/navigation";

import { businessInvoicePath } from "@/lib/business-paths";

type PageProps = {
  params: Promise<{ businessId: string; invoiceId: string }>;
};

export default async function LegacyInvoiceDetailRedirect({ params }: PageProps) {
  const { businessId, invoiceId } = await params;
  redirect(businessInvoicePath(businessId, invoiceId));
}
