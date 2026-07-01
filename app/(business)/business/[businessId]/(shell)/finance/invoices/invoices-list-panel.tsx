import Link from "next/link";
import { ChevronRight, FileText, Plus } from "lucide-react";

import { InvoiceRowActions } from "@/app/(business)/business/[businessId]/(shell)/finance/invoices/invoice-row-actions";
import { InvoicesStatusFilter } from "@/app/(business)/business/[businessId]/(shell)/finance/invoices/invoices-status-filter";
import { TablePagination } from "@/app/(admin)/admin/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  businessInvoicePath,
  businessInvoiceTemplatesPath,
  businessInvoicesPath,
  businessNewInvoicePath,
} from "@/lib/business-paths";
import { formatCustomerName } from "@/lib/customer-display";
import {
  formatInvoiceDate,
  invoiceStatusBadgeVariant,
  invoiceStatusLabel,
} from "@/lib/invoice-display";
import { formatMoney } from "@/lib/invoice-money";
import type { InvoiceListRow } from "@/lib/invoices";

export function InvoicesListPanel({
  businessId,
  invoices,
  timeZone,
  hasTemplates,
  statusQuery,
}: {
  businessId: string;
  invoices: {
    total: number;
    page: number;
    totalPages: number;
    openTotal: number;
    rows: InvoiceListRow[];
  };
  timeZone: string;
  hasTemplates: boolean;
  statusQuery?: string;
}) {
  const basePath = businessInvoicesPath(businessId);

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            {invoices.total} Rechnung{invoices.total === 1 ? "" : "en"} gesamt
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <InvoicesStatusFilter businessId={businessId} />
          {hasTemplates ? (
            <Button asChild>
              <Link href={businessNewInvoicePath(businessId)}>
                <Plus className="size-4" />
                Neue Rechnung
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {invoices.openTotal > 0 ? (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Offener Betrag</p>
              <p className="font-heading text-2xl font-bold">
                {formatMoney(invoices.openTotal)}
              </p>
            </div>
            <FileText className="size-8 text-primary/70" />
          </CardContent>
        </Card>
      ) : null}

      {!hasTemplates ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="font-medium">Zuerst eine Vorlage erstellen</p>
            <p className="text-sm text-muted-foreground">
              Setzen Sie mindestens eine Rechnungsvorlage mit Ihren Leistungen und Standardwerten auf,
              bevor Sie Rechnungen erstellen.
            </p>
            <Button className="mt-2" asChild>
              <Link href={businessInvoiceTemplatesPath(businessId)}>
                Zu Vorlagen
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : invoices.total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="font-medium">Noch keine Rechnungen</p>
            <p className="text-sm text-muted-foreground">
              Pick a template, choose a customer, and adjust line items as needed.
            </p>
            <Button className="mt-2" asChild>
              <Link href={businessNewInvoicePath(businessId)}>Rechnung erstellen</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.rows.map((invoice) => (
            <Card key={invoice.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <Link
                  href={businessInvoicePath(businessId, invoice.id)}
                  className="flex min-w-0 flex-1 items-center gap-4"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent font-heading text-sm font-bold text-accent-foreground">
                    {invoice.number.slice(-2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{invoice.number}</span>
                      <Badge
                        variant={invoiceStatusBadgeVariant(invoice.displayStatus)}
                      >
                        {invoiceStatusLabel(invoice.displayStatus)}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{formatCustomerName(invoice.customer)}</span>
                      <span>
                        Issued {formatInvoiceDate(invoice.issueDate, timeZone)}
                      </span>
                      <span>
                        Due {formatInvoiceDate(invoice.dueDate, timeZone)}
                      </span>
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="font-semibold">
                      {formatMoney(invoice.total, invoice.currency)}
                    </p>
                    {invoice.title ? (
                      <p className="text-xs text-muted-foreground">{invoice.title}</p>
                    ) : null}
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>
                <InvoiceRowActions businessId={businessId} invoice={invoice} />
              </CardContent>
            </Card>
          ))}

          {invoices.totalPages > 1 ? (
            <TablePagination
              basePath={basePath}
              page={invoices.page}
              totalPages={invoices.totalPages}
              total={invoices.total}
              preserveQuery={{ status: statusQuery }}
            />
          ) : null}
        </div>
      )}
    </>
  );
}
