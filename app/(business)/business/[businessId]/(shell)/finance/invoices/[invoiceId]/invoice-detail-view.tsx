"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Loader2,
  Mail,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  buildInvoiceLineItemPayload,
  InvoiceLineItemsEditor,
  invoiceLineItemsToDraft,
  validateInvoiceLineItems,
  type InvoiceLineItemDraft,
} from "@/app/(business)/business/[businessId]/(shell)/finance/invoices/invoice-line-items-editor";
import { SendInvoiceDialog } from "@/app/(business)/business/[businessId]/(shell)/finance/invoices/send-invoice-dialog";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  businessCustomerPath,
  businessInvoicesPath,
} from "@/lib/business-paths";
import { formatCustomerName } from "@/lib/customer-display";
import {
  formatInvoiceDate,
  invoiceStatusBadgeVariant,
  invoiceStatusLabel,
  toDateInputValue,
  type InvoiceStatusValue,
} from "@/lib/invoice-display";
import { downloadInvoicePdf } from "@/lib/invoice-pdf-download";
import { formatMoney } from "@/lib/invoice-money";
import type { InvoiceSequenceState } from "@/lib/sequences";

type InvoiceDetailData = {
  id: string;
  number: string;
  title: string | null;
  status: string;
  displayStatus: InvoiceStatusValue;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  vatAmount: number;
  total: number;
  vatRate: number;
  currency: string;
  notes: string | null;
  sentAt: string | null;
  paidAt: string | null;
  customer: {
    id: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  lineItems: Array<{
    id: string;
    templateServiceId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

function toEditState(invoice: InvoiceDetailData) {
  return {
    title: invoice.title ?? "",
    issueDate: toDateInputValue(invoice.issueDate),
    dueDate: toDateInputValue(invoice.dueDate),
    notes: invoice.notes ?? "",
    lines: invoiceLineItemsToDraft(invoice.lineItems),
  };
}

export function InvoiceDetailView({
  businessId,
  invoice,
  timeZone,
  sequenceState,
}: {
  businessId: string;
  invoice: InvoiceDetailData;
  timeZone: string;
  sequenceState: InvoiceSequenceState;
}) {
  const router = useRouter();
  const isDraft = invoice.status === "DRAFT";
  const isOpen = invoice.status === "OPEN";
  const isPaid = invoice.status === "PAID";
  const isCancelled = invoice.status === "CANCELLED";

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(() => toEditState(invoice).title);
  const [issueDate, setIssueDate] = useState(() => toEditState(invoice).issueDate);
  const [dueDate, setDueDate] = useState(() => toEditState(invoice).dueDate);
  const [notes, setNotes] = useState(() => toEditState(invoice).notes);
  const [lines, setLines] = useState<InvoiceLineItemDraft[]>(
    () => toEditState(invoice).lines,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusChanging, setStatusChanging] = useState<string | null>(null);
  const [startingSequence, setStartingSequence] = useState(false);

  function resetEditState() {
    const state = toEditState(invoice);
    setTitle(state.title);
    setIssueDate(state.issueDate);
    setDueDate(state.dueDate);
    setNotes(state.notes);
    setLines(state.lines);
    setError(null);
  }

  function startEditing() {
    resetEditState();
    setEditing(true);
  }

  function cancelEditing() {
    resetEditState();
    setEditing(false);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const lineError = validateInvoiceLineItems(lines);
    if (lineError) {
      setError(lineError);
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(
        `/api/business/${businessId}/invoices/${invoice.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            issueDate,
            dueDate,
            notes,
            lineItems: buildInvoiceLineItemPayload(lines),
          }),
        },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update invoice.");
      }

      toast.success("Invoice updated.");
      setEditing(false);
      router.refresh();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Failed to update invoice.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      await downloadInvoicePdf(businessId, invoice.id, invoice.number);
      toast.success("Invoice PDF downloaded.");
    } catch (downloadError) {
      toast.error(
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to download invoice PDF.",
      );
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/business/${businessId}/invoices/${invoice.id}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete invoice.");
      }

      toast.success("Invoice deleted.");
      router.push(businessInvoicesPath(businessId));
      router.refresh();
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete invoice.",
      );
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function handleStatusChange(status: "OPEN" | "PAID" | "CANCELLED") {
    setStatusChanging(status);
    try {
      const res = await fetch(
        `/api/business/${businessId}/invoices/${invoice.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update invoice status.");
      }

      toast.success("Invoice status updated.");
      router.refresh();
    } catch (statusError) {
      toast.error(
        statusError instanceof Error
          ? statusError.message
          : "Failed to update invoice status.",
      );
    } finally {
      setStatusChanging(null);
    }
  }

  async function handleStartSequence() {
    if (!sequenceState.activeSequence) {
      toast.error("Create an active invoice sequence first.");
      return;
    }

    setStartingSequence(true);
    try {
      const res = await fetch(
        `/api/business/${businessId}/invoices/${invoice.id}/sequence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start sequence.");
      }

      toast.success("Invoice sequence started.");
      router.refresh();
    } catch (startError) {
      toast.error(
        startError instanceof Error
          ? startError.message
          : "Failed to start sequence.",
      );
    } finally {
      setStartingSequence(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <Button variant="ghost" size="sm" className="mb-3 -ml-2" asChild>
            <Link href={businessInvoicesPath(businessId)}>
              <ArrowLeft className="size-4" />
              Back to invoices
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-3xl font-extrabold tracking-tight">
              {invoice.number}
            </h1>
            <Badge variant={invoiceStatusBadgeVariant(invoice.displayStatus)}>
              {invoiceStatusLabel(invoice.displayStatus)}
            </Badge>
          </div>
          {!editing && invoice.title ? (
            <p className="mt-1 text-muted-foreground">{invoice.title}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {!editing ? (
            <Button
              variant="outline"
              onClick={() => void handleDownloadPdf()}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Downloading…
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  Download PDF
                </>
              )}
            </Button>
          ) : null}
          {isDraft && !editing ? (
            <>
              <Button variant="outline" onClick={startEditing}>
                <Pencil className="size-4" />
                Edit draft
              </Button>
              <Button onClick={() => setSendOpen(true)}>
                <Send className="size-4" />
                Send invoice
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(true)}
                disabled={deleting}
              >
                <Trash2 className="size-4" />
                Delete draft
              </Button>
            </>
          ) : null}
          {!isDraft && !editing ? (
            <>
              {isOpen ? (
                <Button
                  variant="outline"
                  onClick={() => void handleStatusChange("PAID")}
                  disabled={statusChanging != null}
                >
                  {statusChanging === "PAID" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Mark paid
                </Button>
              ) : null}
              {isPaid || isCancelled ? (
                <Button
                  variant="outline"
                  onClick={() => void handleStatusChange("OPEN")}
                  disabled={statusChanging != null}
                >
                  {statusChanging === "OPEN" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Reopen
                </Button>
              ) : null}
              {!isCancelled ? (
                <Button
                  variant="outline"
                  onClick={() => void handleStatusChange("CANCELLED")}
                  disabled={statusChanging != null}
                >
                  {statusChanging === "CANCELLED" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Cancel invoice
                </Button>
              ) : null}
            </>
          ) : null}
          {isDraft && editing ? (
            <>
              <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" form="edit-invoice-form" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <form
        id="edit-invoice-form"
        onSubmit={(event) => void handleSave(event)}
        className="grid gap-6 lg:grid-cols-3"
      >
        <div className="space-y-6 lg:col-span-2">
          {editing ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Invoice details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="edit-title">Title (optional)</Label>
                    <Input
                      id="edit-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-issue-date">Issue date</Label>
                    <Input
                      id="edit-issue-date"
                      type="date"
                      value={issueDate}
                      onChange={(event) => setIssueDate(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-due-date">Due date</Label>
                    <Input
                      id="edit-due-date"
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="edit-notes">Notes (optional)</Label>
                    <Textarea
                      id="edit-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Line items</CardTitle>
                </CardHeader>
                <CardContent>
                  <InvoiceLineItemsEditor
                    lines={lines}
                    onChange={setLines}
                    currency={invoice.currency}
                    vatRate={invoice.vatRate}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Line items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatMoney(item.unitPrice, invoice.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMoney(item.lineTotal, invoice.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link
                href={businessCustomerPath(businessId, invoice.customer.id)}
                className="font-medium hover:underline"
              >
                {formatCustomerName(invoice.customer)}
              </Link>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4" />
                {invoice.customer.email}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue date</span>
                <span>
                  {editing
                    ? issueDate
                    : formatInvoiceDate(invoice.issueDate, timeZone)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due date</span>
                <span>
                  {editing
                    ? dueDate
                    : formatInvoiceDate(invoice.dueDate, timeZone)}
                </span>
              </div>
              {invoice.sentAt ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sent</span>
                  <span>{formatInvoiceDate(invoice.sentAt, timeZone)}</span>
                </div>
              ) : null}
              {invoice.paidAt ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span>{formatInvoiceDate(invoice.paidAt, timeZone)}</span>
                </div>
              ) : null}
              {!editing ? (
                <>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatMoney(invoice.subtotal, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      VAT ({invoice.vatRate}%)
                    </span>
                    <span>{formatMoney(invoice.vatAmount, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                    <span>Total</span>
                    <span>{formatMoney(invoice.total, invoice.currency)}</span>
                  </div>
                </>
              ) : (
                <p className="border-t border-border pt-2 text-xs text-muted-foreground">
                  Totals update from line items while editing.
                </p>
              )}
            </CardContent>
          </Card>

          {!editing ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sequence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {sequenceState.enrollment ? (
                  <div className="space-y-2">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Sequence</span>
                      <span className="text-right font-medium">
                        {sequenceState.enrollment.sequence.name}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="outline">
                        {sequenceState.enrollment.status.toLowerCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Next step</span>
                      <span className="text-right">
                        {sequenceState.enrollment.nextRunAt
                          ? formatInvoiceDate(
                              sequenceState.enrollment.nextRunAt,
                              timeZone,
                            )
                          : "No pending step"}
                      </span>
                    </div>
                    {sequenceState.enrollment.lastError ? (
                      <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                        {sequenceState.enrollment.lastError}
                      </p>
                    ) : null}
                  </div>
                ) : isDraft || isOpen ? (
                  <div className="space-y-3">
                    {sequenceState.activeSequence ? (
                      <>
                        <div className="rounded-lg border border-border p-3">
                          <p className="font-medium">
                            {sequenceState.activeSequence.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Active default invoice sequence ·{" "}
                            {sequenceState.activeSequence.stepCount} steps
                          </p>
                        </div>
                        <Button
                          type="button"
                          className="w-full"
                          onClick={() => void handleStartSequence()}
                          disabled={startingSequence}
                        >
                          {startingSequence ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Send className="size-4" />
                          )}
                          Start sequence
                        </Button>
                      </>
                    ) : (
                      <p className="text-muted-foreground">
                        Create an active invoice sequence before starting one on
                        this invoice.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Sequences can only be started on draft or open invoices.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}

          {!editing && invoice.notes ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {invoice.notes}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </form>

      <SendInvoiceDialog
        businessId={businessId}
        invoiceId={invoice.id}
        invoiceNumber={invoice.number}
        open={sendOpen}
        onOpenChange={setSendOpen}
        onSent={() => router.refresh()}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete draft invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes invoice <strong>{invoice.number}</strong>.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
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
                "Delete invoice"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
