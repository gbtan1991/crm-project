"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { InvoiceEmailCompose } from "@/lib/messages/compose-invoice-email";

export function SendInvoiceDialog({
  businessId,
  invoiceId,
  invoiceNumber,
  open,
  onOpenChange,
  onSent,
}: {
  businessId: string;
  invoiceId: string;
  invoiceNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{
    invoiceId: string;
    message: string;
  } | null>(null);
  const [loadedInvoiceId, setLoadedInvoiceId] = useState<string | null>(null);
  const [compose, setCompose] = useState<InvoiceEmailCompose | null>(null);
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const loading = open && loadedInvoiceId !== invoiceId;
  const currentLoadError =
    loadError?.invoiceId === invoiceId ? loadError.message : null;

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `/api/business/${businessId}/invoices/${invoiceId}/send`,
        );
        const data = await response.json().catch(() => ({}));

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load email.");
        }

        const nextCompose = data.compose as InvoiceEmailCompose;
        setCompose(nextCompose);
        setLoadedInvoiceId(invoiceId);
        setLoadError(null);
        setError(null);
        setSubject(nextCompose.subject);
        setBodyText(nextCompose.bodyText);
      } catch (loadError) {
        if (!cancelled) {
          setLoadedInvoiceId(invoiceId);
          setLoadError({
            invoiceId,
            message:
              loadError instanceof Error
                ? loadError.message
                : "Failed to load email.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessId, invoiceId, open]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSending(true);

    try {
      const response = await fetch(
        `/api/business/${businessId}/invoices/${invoiceId}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, bodyText }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to send invoice.");
      }

      toast.success("Invoice sent by email.");
      onOpenChange(false);
      onSent?.();
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : "Failed to send invoice.";
      setError(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Send invoice {invoiceNumber}</DialogTitle>
          <DialogDescription>
            Review and edit the email before sending it with the invoice PDF
            attached.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading email…
          </div>
        ) : currentLoadError && loadedInvoiceId === invoiceId ? (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {currentLoadError}
          </div>
        ) : compose ? (
          <form id="send-invoice-form" onSubmit={(event) => void handleSend(event)}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="send-from">From</Label>
                <Input id="send-from" value={compose.fromAddress} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="send-to">To</Label>
                <Input id="send-to" value={compose.toAddress} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="send-subject">Subject</Label>
                <Input
                  id="send-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="send-body">Message</Label>
                <Textarea
                  id="send-body"
                  value={bodyText}
                  onChange={(event) => setBodyText(event.target.value)}
                  rows={10}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Attachment</Label>
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {compose.attachment.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Invoice PDF
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a
                      href={compose.attachment.downloadPath}
                      download={compose.attachment.filename}
                    >
                      Preview
                    </a>
                  </Button>
                </div>
              </div>
              {error ? (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}
            </div>
          </form>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="send-invoice-form"
            disabled={loading || sending || !compose}
          >
            {sending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="size-4" />
                Send email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
