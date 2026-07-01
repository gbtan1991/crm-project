"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import { SendInvoiceDialog } from "@/app/(business)/business/[businessId]/(shell)/finance/invoices/send-invoice-dialog";
import { downloadInvoicePdf } from "@/lib/invoice-pdf-download";
import type { InvoiceListRow } from "@/lib/invoices";

export function InvoiceRowActions({
  businessId,
  invoice,
}: {
  businessId: string;
  invoice: Pick<InvoiceListRow, "id" | "number" | "status">;
}) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isDraft = invoice.status === "DRAFT";

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadInvoicePdf(businessId, invoice.id, invoice.number);
      toast.success("Rechnungs-PDF heruntergeladen.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Rechnungs-PDF konnte nicht heruntergeladen werden.",
      );
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/business/${businessId}/invoices/${invoice.id}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Rechnung konnte nicht gelöscht werden.");
      }

      toast.success("Rechnung gelöscht.");
      setDeleteOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Rechnung konnte nicht gelöscht werden.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div
        className="flex shrink-0 items-center gap-1"
        onClick={(event) => event.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          title="PDF herunterladen"
          disabled={downloading}
          onClick={() => void handleDownload()}
        >
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
        </Button>
        {isDraft ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            title="Rechnung senden"
            onClick={() => setSendOpen(true)}
          >
            <Send className="size-4" />
          </Button>
        ) : null}
        {isDraft ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            title="Entwurf löschen"
            disabled={deleting}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>

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
            <AlertDialogTitle>Rechnungsentwurf löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dies löscht die Rechnung dauerhaft <strong>{invoice.number}</strong>.
              Dies kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
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
                  Wird gelöscht…
                </>
              ) : (
                "Rechnung löschen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
