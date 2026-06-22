import Link from "next/link";
import { notFound } from "next/navigation";

import { CreateInvoiceForm } from "@/app/(business)/business/[businessId]/(shell)/finance/invoices/create-invoice-form";
import { PageHeader } from "@/app/(business)/business/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/auth";
import { getBusinessForViewer } from "@/lib/business-context";
import { businessInvoiceTemplatesPath } from "@/lib/business-paths";
import { listCustomerOptionsForBusiness } from "@/lib/customers";
import { listInvoiceTemplatesForBusiness } from "@/lib/invoice-templates";

type PageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ customerId?: string; templateId?: string }>;
};

export default async function NewInvoicePage({ params, searchParams }: PageProps) {
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

  const [customers, templates] = await Promise.all([
    listCustomerOptionsForBusiness(businessId),
    listInvoiceTemplatesForBusiness(businessId),
  ]);

  if (templates.length === 0) {
    return (
      <div>
        <PageHeader
          title="New invoice"
          subtitle="Create at least one template before creating invoices."
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Templates define your services, VAT, and default invoice details.
            </p>
            <Button asChild>
              <Link href={businessInvoiceTemplatesPath(businessId)}>
                Create a template
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div>
        <PageHeader
          title="New invoice"
          subtitle="Add a customer before creating invoices."
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              You need at least one customer to create an invoice.
            </p>
            <Button asChild>
              <Link href={`/business/${businessId}/customers`}>Go to customers</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <CreateInvoiceForm
      businessId={businessId}
      customers={customers}
      templates={templates}
      initialCustomerId={query.customerId}
      initialTemplateId={query.templateId}
    />
  );
}
