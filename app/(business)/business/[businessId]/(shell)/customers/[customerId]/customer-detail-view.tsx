"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  StickyNote,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { CustomerActivityTimeline } from "@/app/(business)/business/[businessId]/(shell)/customers/customer-activity-timeline";
import {
  CustomerFormFields,
  type CustomerFormValues,
} from "@/app/(business)/business/[businessId]/(shell)/customers/customer-form-fields";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  businessCustomersPath,
  businessInvoicePath,
  businessNewInvoicePath,
} from "@/lib/business-paths";
import { buildCustomerTimeline } from "@/lib/customer-activity";
import {
  customerInitials,
  formatCustomerName,
  formatCustomerPersonName,
  formatCustomerSince,
} from "@/lib/customer-display";
import { formatMoney } from "@/lib/invoice-money";
import type { InvoiceStatusValue } from "@/lib/invoice-display";

type CustomerBooking = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

type CustomerInvoice = {
  id: string;
  number: string;
  title: string | null;
  displayStatus: InvoiceStatusValue;
  issueDate: string;
  dueDate: string;
  total: number;
  currency: string;
};

type CustomerDetailData = {
  id: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  status: string;
  source: string;
  notes: string | null;
  createdAt: string;
  bookings: CustomerBooking[];
  bookingCount: number;
  invoiceCount: number;
  invoices: CustomerInvoice[];
  salesVolume: number;
  paidInvoiceCount: number;
};

function toFormValues(customer: CustomerDetailData): CustomerFormValues {
  return {
    companyName: customer.companyName ?? "",
    firstName: customer.firstName ?? "",
    lastName: customer.lastName ?? "",
    email: customer.email,
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    postalCode: customer.postalCode ?? "",
    city: customer.city ?? "",
    status: customer.status as "ACTIVE" | "INACTIVE",
    notes: customer.notes ?? "",
  };
}

export function CustomerDetailView({
  businessId,
  customer,
  timeZone,
}: {
  businessId: string;
  customer: CustomerDetailData;
  timeZone: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState(() => toFormValues(customer));

  const displayName = formatCustomerName(customer);
  const contactName = formatCustomerPersonName(customer);

  const timelineEvents = useMemo(
    () =>
      buildCustomerTimeline({
        bookings: customer.bookings,
        invoices: customer.invoices.map((invoice) => ({
          ...invoice,
          href: businessInvoicePath(businessId, invoice.id),
        })),
      }),
    [businessId, customer.bookings, customer.invoices],
  );

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(
        `/api/business/${businessId}/customers/${customer.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Failed to update customer.");
        return;
      }

      toast.success("Customer updated.");
      setEditOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/business/${businessId}/customers/${customer.id}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete customer.");
        return;
      }

      toast.success("Customer deleted.");
      router.push(businessCustomersPath(businessId));
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={businessCustomersPath(businessId)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to customer overview
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={businessNewInvoicePath(businessId, customer.id)}>
              New invoice
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setValues(toFormValues(customer));
              setError(null);
              setEditOpen(true);
            }}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (customer.invoiceCount > 0) {
                toast.error(
                  "This customer has invoices and cannot be deleted. Set them inactive instead.",
                );
                return;
              }
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="mb-8 flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent font-heading text-lg font-extrabold text-accent-foreground">
          {customerInitials(customer)}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">
              {displayName}
            </h1>
            <Badge variant={customer.status === "ACTIVE" ? "success" : "outline"}>
              {customer.status === "ACTIVE" ? "Active" : "Inactive"}
            </Badge>
            {customer.source === "CALENDAR" ? (
              <Badge variant="secondary">From calendar</Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Customer since {formatCustomerSince(customer.createdAt, timeZone)}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-4 font-heading text-sm font-bold">
              Contact information
            </h2>
            <div className="space-y-3 text-sm">
              {contactName ? (
                <p className="font-medium text-foreground">{contactName}</p>
              ) : null}
              <p className="flex items-center gap-2.5 text-muted-foreground">
                <Mail className="size-4 text-primary" />
                {customer.email}
              </p>
              {customer.phone ? (
                <p className="flex items-center gap-2.5 text-muted-foreground">
                  <Phone className="size-4 text-primary" />
                  {customer.phone}
                </p>
              ) : null}
              {customer.address || customer.city ? (
                <p className="flex items-center gap-2.5 text-muted-foreground">
                  <MapPin className="size-4 shrink-0 text-primary" />
                  <span>
                    {[customer.address, customer.postalCode, customer.city]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </p>
              ) : null}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold">
              <StickyNote className="size-4 text-primary" />
              Notes
            </h2>
            {customer.notes ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {customer.notes}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold">
              <TrendingUp className="size-4 text-primary" />
              Sales volume
            </h2>
            <p className="font-heading text-2xl font-extrabold">
              {formatMoney(customer.salesVolume)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {customer.paidInvoiceCount} paid invoice
              {customer.paidInvoiceCount === 1 ? "" : "s"}
            </p>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="font-heading text-sm font-bold">Activity timeline</h2>
              <span className="text-xs text-muted-foreground">
                {timelineEvents.length} event{timelineEvents.length === 1 ? "" : "s"}
              </span>
            </div>
            <CustomerActivityTimeline events={timelineEvents} timeZone={timeZone} />
            <p className="mt-6 text-xs text-muted-foreground">
              Inquiries, offers, and reviews will appear here once those modules
              are added.
            </p>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={(e) => void handleUpdate(e)}>
            <DialogHeader>
              <DialogTitle>Edit customer</DialogTitle>
              <DialogDescription>
                Update contact details for {displayName}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {error ? (
                <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}
              <CustomerFormFields
                values={values}
                onChange={setValues}
                idPrefix="detail"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !values.email.trim()}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <strong>{displayName}</strong>
              {customer.bookingCount > 0 ? (
                <>
                  {" "}
                  and{" "}
                  <strong>
                    {customer.bookingCount} linked booking
                    {customer.bookingCount === 1 ? "" : "s"}
                  </strong>
                </>
              ) : null}
              {customer.invoiceCount > 0 ? (
                <>
                  {" "}
                  This customer also has{" "}
                  <strong>
                    {customer.invoiceCount} invoice
                    {customer.invoiceCount === 1 ? "" : "s"}
                  </strong>
                  , so deletion is blocked.
                </>
              ) : null}
              . Calendar events are not removed — only data in MeisterFlow. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting || customer.invoiceCount > 0}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete customer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
