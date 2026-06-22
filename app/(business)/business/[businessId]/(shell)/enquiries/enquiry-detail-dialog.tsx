"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  CustomerFormFields,
  emptyCustomerForm,
  type CustomerFormValues,
} from "@/app/(business)/business/[businessId]/(shell)/customers/customer-form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  enquiryDisplayValue,
  enquiryStatusLabel,
  formatEnquiryReceivedAt,
} from "@/lib/enquiry-display";
import { businessCustomerPath } from "@/lib/business-paths";
import { formatCustomerName } from "@/lib/customer-display";
import type { CustomerOption } from "@/lib/customers";
import type { EnquiryListRow } from "@/lib/enquiries";

const NO_CUSTOMER_VALUE = "no-customer";

function enquiryString(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function customerValuesFromEnquiry(enquiry: EnquiryListRow): CustomerFormValues {
  const name = enquiryString(enquiry.data, [
    "name",
    "full_name",
    "customer_name",
  ]);
  const [firstName = "", ...lastNameParts] = name.split(/\s+/).filter(Boolean);

  return {
    ...emptyCustomerForm,
    companyName: enquiryString(enquiry.data, ["company", "company_name"]),
    firstName,
    lastName: lastNameParts.join(" "),
    email: enquiryString(enquiry.data, ["email", "e_mail", "mail"]),
    phone: enquiryString(enquiry.data, ["phone", "telefon", "tel"]),
    notes: enquiry.excerpt ?? "",
  };
}

export function EnquiryDetailDialog({
  businessId,
  customers,
  enquiry,
  open,
  timeZone,
  onOpenChange,
  onUpdated,
}: {
  businessId: string;
  customers: CustomerOption[];
  enquiry: EnquiryListRow | null;
  open: boolean;
  timeZone: string;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}) {
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [status, setStatus] = useState<EnquiryListRow["status"]>(
    enquiry?.status ?? "NEW",
  );
  const [customerId, setCustomerId] = useState(
    enquiry?.customer?.id ?? NO_CUSTOMER_VALUE,
  );
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerValues, setCustomerValues] = useState<CustomerFormValues>(
    enquiry ? customerValuesFromEnquiry(enquiry) : emptyCustomerForm,
  );
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [customerSubmitting, setCustomerSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!enquiry) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `/api/business/${businessId}/enquiries/${enquiry.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            customerId: customerId === NO_CUSTOMER_VALUE ? null : customerId,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update enquiry.");
      }

      toast.success("Enquiry updated.");
      onOpenChange(false);
      onUpdated?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update enquiry.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCustomer(event: FormEvent) {
    event.preventDefault();
    setCustomerError(null);
    setCustomerSubmitting(true);

    try {
      const response = await fetch(`/api/business/${businessId}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerValues),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create customer.");
      }

      const customer = data.customer as CustomerOption;
      setLocalCustomers((current) => [customer, ...current]);
      setCustomerId(customer.id);
      setCustomerOpen(false);
      toast.success("Customer created.");
    } catch (error) {
      setCustomerError(
        error instanceof Error ? error.message : "Failed to create customer.",
      );
    } finally {
      setCustomerSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enquiry details</DialogTitle>
          <DialogDescription>
            {enquiry ? enquiry.formName : "Submitted enquiry"}
          </DialogDescription>
        </DialogHeader>

        {enquiry ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Received {formatEnquiryReceivedAt(enquiry.createdAt, timeZone)}
            </p>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as EnquiryListRow["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["NEW", "READ", "ARCHIVED"] as const).map((option) => (
                    <SelectItem key={option} value={option}>
                      {enquiryStatusLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Customer</Label>
                <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <Plus className="size-4" />
                      New customer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <form
                      onSubmit={(event) => void handleCreateCustomer(event)}
                      className="space-y-4"
                    >
                      <DialogHeader>
                        <DialogTitle>Create customer from enquiry</DialogTitle>
                        <DialogDescription>
                          Review the details before creating the linked
                          customer.
                        </DialogDescription>
                      </DialogHeader>
                      {customerError ? (
                        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                          {customerError}
                        </div>
                      ) : null}
                      <CustomerFormFields
                        values={customerValues}
                        onChange={setCustomerValues}
                        idPrefix="enquiry-customer"
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCustomerOpen(false)}
                          disabled={customerSubmitting}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={
                            customerSubmitting || !customerValues.email.trim()
                          }
                        >
                          {customerSubmitting ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            "Create customer"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Link customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CUSTOMER_VALUE}>No customer</SelectItem>
                  {localCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {formatCustomerName(customer)} ({customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {enquiry.customer ? (
                <Button variant="link" className="h-auto p-0" asChild>
                  <Link href={businessCustomerPath(businessId, enquiry.customer.id)}>
                    View linked customer
                  </Link>
                </Button>
              ) : null}
            </div>

            <div className="space-y-3 rounded-lg border border-border p-4">
              {Object.entries(enquiry.data).map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {key}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {enquiryDisplayValue(value)}
                  </p>
                </div>
              ))}
            </div>

            <Badge variant="outline">{enquiry.formName}</Badge>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || !enquiry}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
