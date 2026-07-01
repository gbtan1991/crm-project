"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  buildInvoiceLineItemPayload,
  InvoiceLineItemsEditor,
  type InvoiceLineItemDraft,
  validateInvoiceLineItems,
} from "@/app/(business)/business/[businessId]/(shell)/finance/invoices/invoice-line-items-editor";
import { PageHeader } from "@/app/(business)/business/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  businessInvoicePath,
  businessInvoicesPath,
} from "@/lib/business-paths";
import { formatCustomerName } from "@/lib/customer-display";
import { dueDateFromIssue, toDateInputValue } from "@/lib/invoice-display";

type CustomerOption = {
  id: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

type InvoiceTemplateOption = {
  id: string;
  name: string;
  defaultTitle: string | null;
  defaultNotes: string | null;
  dueDays: number;
  vatRate: number;
  currency: string;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    defaultUnitPrice: number | null;
    defaultQuantity: number;
  }>;
};

function buildLinesFromTemplate(template: InvoiceTemplateOption): InvoiceLineItemDraft[] {
  return template.services.map((service) => ({
    key: service.id,
    templateServiceId: service.id,
    description: service.description
      ? `${service.name} — ${service.description}`
      : service.name,
    quantity: String(service.defaultQuantity),
    unitPrice:
      service.defaultUnitPrice == null ? "" : String(service.defaultUnitPrice),
  }));
}

function templateDefaults(template: InvoiceTemplateOption, issueDate: string) {
  return {
    title: template.defaultTitle ?? "",
    notes: template.defaultNotes ?? "",
    dueDate: dueDateFromIssue(issueDate, template.dueDays),
    lines: buildLinesFromTemplate(template),
  };
}

export function CreateInvoiceForm({
  businessId,
  customers,
  templates,
  initialCustomerId,
  initialTemplateId,
}: {
  businessId: string;
  customers: CustomerOption[];
  templates: InvoiceTemplateOption[];
  initialCustomerId?: string;
  initialTemplateId?: string;
}) {
  const router = useRouter();
  const defaultTemplate =
    templates.find((template) => template.id === initialTemplateId) ??
    templates[0];

  const [customerId, setCustomerId] = useState(
    initialCustomerId && customers.some((c) => c.id === initialCustomerId)
      ? initialCustomerId
      : customers[0]?.id ?? "",
  );
  const [templateId, setTemplateId] = useState(defaultTemplate.id);
  const [issueDate, setIssueDate] = useState(toDateInputValue(new Date()));

  const selectedTemplate =
    templates.find((template) => template.id === templateId) ?? defaultTemplate;

  const [title, setTitle] = useState(
    () => templateDefaults(selectedTemplate, issueDate).title,
  );
  const [dueDate, setDueDate] = useState(
    () => templateDefaults(selectedTemplate, issueDate).dueDate,
  );
  const [notes, setNotes] = useState(
    () => templateDefaults(selectedTemplate, issueDate).notes,
  );
  const [lines, setLines] = useState(
    () => templateDefaults(selectedTemplate, issueDate).lines,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyTemplate(template: InvoiceTemplateOption, nextIssueDate = issueDate) {
    const defaults = templateDefaults(template, nextIssueDate);
    setTitle(defaults.title);
    setNotes(defaults.notes);
    setDueDate(defaults.dueDate);
    setLines(defaults.lines);
  }

  function handleTemplateChange(nextTemplateId: string) {
    const template = templates.find((item) => item.id === nextTemplateId);
    if (!template) {
      return;
    }
    setTemplateId(nextTemplateId);
    applyTemplate(template);
  }

  function handleIssueDateChange(nextIssueDate: string) {
    setIssueDate(nextIssueDate);
    setDueDate(dueDateFromIssue(nextIssueDate, selectedTemplate.dueDays));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!customerId) {
      setError("Bitte wählen Sie einen Kunden aus.");
      return;
    }

    const lineError = validateInvoiceLineItems(lines);
    if (lineError) {
      setError(lineError);
      return;
    }

    const payloadLines = buildInvoiceLineItemPayload(lines);

    setSubmitting(true);

    try {
      const res = await fetch(`/api/business/${businessId}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          templateId: selectedTemplate.id,
          title,
          issueDate,
          dueDate,
          notes,
          lineItems: payloadLines,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Rechnung konnte nicht erstellt werden.");
      }

      toast.success("Rechnungsentwurf erstellt.");
      router.push(businessInvoicePath(businessId, data.invoice.id));
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Rechnung konnte nicht erstellt werden.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
      <PageHeader
        title="Neue Rechnung"
        subtitle="Wählen Sie eine Vorlage und einen Kunden, und passen Sie die Positionen bei Bedarf an."
      >
        <Button variant="outline" asChild>
          <Link href={businessInvoicesPath(businessId)}>
            <ArrowLeft className="size-4" />
            Zurück
          </Link>
        </Button>
      </PageHeader>

      {error ? (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rechnungsdetails</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="template">Vorlage</Label>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Vorlage wählen" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="customer">Kunde</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger id="customer">
                <SelectValue placeholder="Kunde wählen" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {formatCustomerName(customer)} ({customer.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Titel (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Aus Vorlage vorausgefüllt"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issueDate">Rechnungsdatum</Label>
            <Input
              id="issueDate"
              type="date"
              value={issueDate}
              onChange={(event) => handleIssueDateChange(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Fälligkeitsdatum</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notizen (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Positionen</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceLineItemsEditor
            lines={lines}
            onChange={setLines}
            currency={selectedTemplate.currency}
            vatRate={selectedTemplate.vatRate}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" asChild>
          <Link href={businessInvoicesPath(businessId)}>Abbrechen</Link>
        </Button>
        <Button type="submit" disabled={submitting || customers.length === 0}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Entwurf wird gespeichert…
            </>
          ) : (
            <>
              <Plus className="size-4" />
              Entwurf speichern
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
