import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight, Mail, MapPin, Phone, Users } from "lucide-react";

import { AddCustomerDialog } from "@/app/(business)/business/[businessId]/(shell)/customers/add-customer-dialog";
import { CustomersSearch } from "@/app/(business)/business/[businessId]/(shell)/customers/customers-search";
import { ImportCustomersButton } from "@/app/(business)/business/[businessId]/(shell)/customers/import-customers-button";
import { TablePagination } from "@/app/(admin)/admin/table-pagination";
import { PageHeader } from "@/app/(business)/business/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/auth";
import { getBusinessForViewer } from "@/lib/business-context";
import { businessCustomerPath, businessCustomersPath } from "@/lib/business-paths";
import {
  customerInitials,
  formatCustomerName,
} from "@/lib/customer-display";
import {
  listCustomersForBusiness,
  parseCustomerPageParam,
  parseCustomerSearchParam,
} from "@/lib/customers";

type PageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function CustomersPage({ params, searchParams }: PageProps) {
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

  const customers = await listCustomersForBusiness(businessId, {
    page: parseCustomerPageParam(query.page),
    q: parseCustomerSearchParam(query.q),
  });

  const basePath = businessCustomersPath(businessId);

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${customers.total} customer${customers.total === 1 ? "" : "s"} in total`}
      >
        <Suspense fallback={null}>
          <CustomersSearch businessId={businessId} />
        </Suspense>
        <ImportCustomersButton businessId={businessId} />
        <AddCustomerDialog businessId={businessId} />
      </PageHeader>

      {customers.total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Users className="size-8 text-muted-foreground" />
            <p className="font-medium">No customers yet</p>
            <p className="text-sm text-muted-foreground">
              Add a customer manually or connect your calendar to import them
              from bookings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {customers.rows.map((customer) => (
            <Link
              key={customer.id}
              href={businessCustomerPath(businessId, customer.id)}
              className="block"
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent font-heading text-sm font-bold text-accent-foreground">
                    {customerInitials(customer)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-semibold text-foreground">
                        {formatCustomerName(customer)}
                      </span>
                      <Badge
                        variant={
                          customer.status === "ACTIVE" ? "success" : "outline"
                        }
                      >
                        {customer.status === "ACTIVE" ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Mail className="size-3.5" />
                        {customer.email}
                      </span>
                      {customer.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="size-3.5" />
                          {customer.phone}
                        </span>
                      ) : null}
                      {customer.city ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-3.5" />
                          {[customer.postalCode, customer.city]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}

          {customers.totalPages > 1 ? (
            <TablePagination
              basePath={basePath}
              page={customers.page}
              totalPages={customers.totalPages}
              total={customers.total}
              preserveQuery={{ q: query.q }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
