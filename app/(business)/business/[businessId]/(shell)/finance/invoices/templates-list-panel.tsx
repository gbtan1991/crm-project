"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileStack, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { InvoiceTemplateEditor } from "@/app/(business)/business/[businessId]/(shell)/finance/invoices/invoice-template-editor";
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
  businessInvoiceTemplateEditPath,
  businessInvoiceTemplatesPath,
} from "@/lib/business-paths";
import type { InvoiceTemplateRow } from "@/lib/invoice-templates";

export function TemplatesListPanel({
  businessId,
  templates,
  editingTemplateId,
}: {
  businessId: string;
  templates: InvoiceTemplateRow[];
  editingTemplateId?: string | "new";
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const editingTemplate =
    editingTemplateId && editingTemplateId !== "new"
      ? templates.find((template) => template.id === editingTemplateId) ?? null
      : null;

  if (editingTemplateId === "new" || editingTemplate) {
    return (
      <InvoiceTemplateEditor
        businessId={businessId}
        templateId={editingTemplate?.id}
        initialTemplate={
          editingTemplate ?? {
            name: "",
            defaultTitle: null,
            defaultNotes: null,
            dueDays: 30,
            vatRate: 8.1,
            currency: "CHF",
            services: [
              {
                name: "",
                description: "",
                defaultUnitPrice: null,
                defaultQuantity: 1,
              },
            ],
          }
        }
        onCancel={() => router.push(businessInvoiceTemplatesPath(businessId))}
        onSaved={() => router.push(businessInvoiceTemplatesPath(businessId))}
      />
    );
  }

  async function handleDelete() {
    if (!deletingId) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/business/${businessId}/invoice-templates/${deletingId}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Vorlage konnte nicht gelöscht werden.");
      }

      toast.success("Vorlage gelöscht.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Vorlage konnte nicht gelöscht werden.",
      );
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            {templates.length} template{templates.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button asChild>
          <Link href={businessInvoiceTemplateEditPath(businessId, "new")}>
            <Plus className="size-4" />
            Neue Vorlage
          </Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <FileStack className="size-8 text-muted-foreground" />
            <p className="font-medium">Noch keine Vorlagen</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Templates define your services, VAT rate, and default invoice details.
              Erstellen Sie eine Vorlage für jede Art von Auftrag, den Sie abrechnen.
            </p>
            <Button className="mt-2" asChild>
              <Link href={businessInvoiceTemplateEditPath(businessId, "new")}>
                Vorlage erstellen
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <Card key={template.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent font-heading text-sm font-bold text-accent-foreground">
                    {template.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{template.name}</p>
                      <Badge variant="secondary">
                        {template.serviceCount} service
                        {template.serviceCount === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="outline">
                        MwSt. {template.vatRate}% · {template.currency}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Due in {template.dueDays} days
                      {template.defaultTitle
                        ? ` · Default title: ${template.defaultTitle}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={businessInvoiceTemplateEditPath(
                        businessId,
                        template.id,
                      )}
                    >
                      <Pencil className="size-4" />
                      Bearbeiten
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeletingId(template.id);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vorlage löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Vorlagen, die von bestehenden Rechnungen verwendet werden, können nicht gelöscht werden. Diese Aktion
              kann nicht rückgängig gemacht werden.
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
                "Vorlage löschen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
