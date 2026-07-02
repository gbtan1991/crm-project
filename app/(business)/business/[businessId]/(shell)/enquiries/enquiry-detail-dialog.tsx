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
  CustomerCombobox,
  NO_CUSTOMER_VALUE,
} from "@/components/customer-combobox";
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
import type { CustomerOption } from "@/lib/customers";
import type { EnquiryListRow } from "@/lib/enquiries";

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
  enquiry,
  open,
  timeZone,
  onOpenChange,
  onUpdated,
}: {
  businessId: string;
  enquiry: EnquiryListRow | null;
  open: boolean;
  timeZone: string;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}) {
  const [knownCustomers, setKnownCustomers] = useState<CustomerOption[]>(
    enquiry?.customer ? [enquiry.customer] : [],
  );
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
        throw new Error(data.error ?? "Anfrage konnte nicht aktualisiert werden.");
      }

      toast.success("Anfrage aktualisiert.");
      onOpenChange(false);
      onUpdated?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Anfrage konnte nicht aktualisiert werden.",
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
        throw new Error(data.error ?? "Kunde konnte nicht erstellt werden.");
      }

      const customer = data.customer as CustomerOption;
      setKnownCustomers((current) => [customer, ...current]);
      setCustomerId(customer.id);
      setCustomerOpen(false);
      toast.success("Kunde erstellt.");
    } catch (error) {
      setCustomerError(
        error instanceof Error ? error.message : "Kunde konnte nicht erstellt werden.",
      );
    } finally {
      setCustomerSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Anfragedetails</DialogTitle>
          <DialogDescription>
            {enquiry ? enquiry.formName : "Eingereichte Anfrage"}
          </DialogDescription>
        </DialogHeader>

        {enquiry ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Eingegangen {formatEnquiryReceivedAt(enquiry.createdAt, timeZone)}
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
                <Label>Kunde</Label>
                <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <Plus className="size-4" />
                      Neuer Kunde
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <form
                      onSubmit={(event) => void handleCreateCustomer(event)}
                      className="space-y-4"
                    >
                      <DialogHeader>
                        <DialogTitle>Kunde aus Anfrage erstellen</DialogTitle>
                        <DialogDescription>
                          Prüfen Sie die Angaben, bevor Sie den verknüpften
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
                          Abbrechen
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
                              Wird gespeichert…
                            </>
                          ) : (
                            "Kunde erstellen"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <CustomerCombobox
                businessId={businessId}
                knownCustomers={knownCustomers}
                value={customerId}
                onValueChange={setCustomerId}
                placeholder="Kunde verknüpfen"
                allowEmpty
              />
              {enquiry.customer ? (
                <Button variant="link" className="h-auto p-0" asChild>
                  <Link href={businessCustomerPath(businessId, enquiry.customer.id)}>
                    Verknüpften Kunden anzeigen
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
            Schließen
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || !enquiry}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Wird gespeichert…
              </>
            ) : (
              "Änderungen speichern"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
