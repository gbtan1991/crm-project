"use client";

import { useState } from "react";
import { Clock, FileText, Loader2, Trash2, UserRound } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ENQUIRY_STATUS_OPTIONS,
  enquiryStatusLabel,
  formatEnquiryReceivedAt,
} from "@/lib/enquiry-display";
import type { EnquiryListRow } from "@/lib/enquiries";
import { formatCustomerName } from "@/lib/customer-display";
import { cn } from "@/lib/utils";

export function EnquiryCard({
  businessId,
  enquiry,
  timeZone,
  onOpen,
  onUpdated,
}: {
  businessId: string;
  enquiry: EnquiryListRow;
  timeZone: string;
  onOpen: () => void;
  onUpdated?: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isNew = enquiry.status === "NEW";
  const isArchived = enquiry.status === "ARCHIVED";

  async function patchEnquiry(body: Record<string, unknown>) {
    setUpdating(true);
    try {
      const response = await fetch(
        `/api/business/${businessId}/enquiries/${enquiry.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Anfrage konnte nicht aktualisiert werden.");
      }

      onUpdated?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Anfrage konnte nicht aktualisiert werden.",
      );
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/business/${businessId}/enquiries/${enquiry.id}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Anfrage konnte nicht gelöscht werden.");
      }

      toast.success("Anfrage gelöscht.");
      setDeleteOpen(false);
      onUpdated?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Anfrage konnte nicht gelöscht werden.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card
        className={cn(
          "cursor-pointer transition-shadow hover:shadow-md",
          isNew && "border-primary/40 bg-primary/[0.03]",
          isArchived && "bg-muted/20",
        )}
        onClick={onOpen}
      >
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
          <div
            className={cn(
              "mt-1 hidden size-2 shrink-0 rounded-full sm:block",
              isNew ? "bg-primary" : "bg-transparent",
            )}
          />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={cn(
                  "font-semibold leading-snug",
                  isArchived && "text-muted-foreground",
                )}
              >
                {enquiry.title}
              </p>
              <Badge variant="outline" className="font-normal">
                <FileText className="mr-1 size-3" />
                {enquiry.formName}
              </Badge>
            </div>

            {enquiry.excerpt ? (
              <p
                className={cn(
                  "line-clamp-2 text-sm text-muted-foreground",
                  isArchived && "opacity-80",
                )}
              >
                {enquiry.excerpt}
              </p>
            ) : null}

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5 shrink-0" />
              Eingegangen {formatEnquiryReceivedAt(enquiry.createdAt, timeZone)}
            </p>
            {enquiry.customer ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserRound className="size-3.5 shrink-0" />
                Linked to {formatCustomerName(enquiry.customer)}
              </p>
            ) : null}
          </div>

          <div
            className="flex shrink-0 items-center gap-2 self-start"
            onClick={(event) => event.stopPropagation()}
          >
            <Select
              value={enquiry.status}
              disabled={updating}
              onValueChange={(value) => void patchEnquiry({ status: value })}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENQUIRY_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {enquiryStatusLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              title="Anfrage löschen"
              disabled={deleting}
              onClick={() => setDeleteOpen(true)}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anfrage löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dies entfernt die Anfrage dauerhaft aus{" "}
              <strong>{enquiry.formName}</strong>
              {enquiry.title ? (
                <>
                  {" "}
                  submitted by <strong>{enquiry.title}</strong>
                </>
              ) : null}
              . Dies kann nicht rückgängig gemacht werden.
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
              Anfrage löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
