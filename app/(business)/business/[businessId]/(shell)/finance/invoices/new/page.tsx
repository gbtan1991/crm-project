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
          title="Neue Rechnung"
          subtitle="Erstellen Sie mindestens eine Vorlage, bevor Sie Rechnungen erstellen."
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Vorlagen definieren Ihre Leistungen, MwSt. und Standard-Rechnungsdetails.
            </p>
            <Button asChild>
              <Link href={businessInvoiceTemplatesPath(businessId)}>
                Vorlage erstellen
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
          title="Neue Rechnung"
          subtitle="Fügen Sie zuerst einen Kunden hinzu, bevor Sie Rechnungen erstellen."
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Sie benötigen mindestens einen Kunden, um eine Rechnung zu erstellen.
            </p>
            <Button asChild>
              <Link href={`/business/${businessId}/customers`}>Zu Kunden</Link>
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
