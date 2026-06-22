import { notFound } from "next/navigation";

import { CustomerDetailView } from "@/app/(business)/business/[businessId]/(shell)/customers/[customerId]/customer-detail-view";
import { auth } from "@/auth";
import { getBusinessForViewer } from "@/lib/business-context";
import { getCustomerSalesStats } from "@/lib/customer-sales";
import { getCustomerForBusiness } from "@/lib/customers";
import { listInvoicesForCustomer } from "@/lib/invoices";

type PageProps = {
  params: Promise<{ businessId: string; customerId: string }>;
};

export default async function CustomerDetailPage({ params }: PageProps) {
  const { businessId, customerId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const business = await getBusinessForViewer(businessId, session.user);
  if (!business) {
    notFound();
  }

  const [customer, invoices, salesStats] = await Promise.all([
    getCustomerForBusiness(businessId, customerId),
    listInvoicesForCustomer(businessId, customerId),
    getCustomerSalesStats(businessId, customerId),
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <CustomerDetailView
      businessId={businessId}
      timeZone={business.config?.timezone ?? "UTC"}
      customer={{
        id: customer.id,
        companyName: customer.companyName,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        postalCode: customer.postalCode,
        city: customer.city,
        status: customer.status,
        source: customer.source,
        notes: customer.notes,
        createdAt: customer.createdAt.toISOString(),
        bookingCount: customer._count.bookings,
        invoiceCount: customer._count.invoices,
        salesVolume: salesStats.paidTotal,
        paidInvoiceCount: salesStats.paidInvoiceCount,
        bookings: customer.bookings.map((booking) => ({
          id: booking.id,
          title: booking.title,
          startsAt: booking.startsAt.toISOString(),
          endsAt: booking.endsAt.toISOString(),
          status: booking.status,
        })),
        invoices: invoices.map((invoice) => ({
          id: invoice.id,
          number: invoice.number,
          title: invoice.title,
          displayStatus: invoice.displayStatus,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          total: invoice.total,
          currency: invoice.currency,
        })),
      }}
    />
  );
}
