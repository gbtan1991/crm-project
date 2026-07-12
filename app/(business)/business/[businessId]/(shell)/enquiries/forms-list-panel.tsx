"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Code2,
  Copy,
  Eye,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { businessNewEnquiryFormPath } from "@/lib/business-paths";
import { formWebhookUrl } from "@/lib/form-webhook";
import type { FormFieldRow, FormRow } from "@/lib/forms";
import { FORM_FIELD_TYPE_LABELS } from "@/lib/validation/form";

function displayFieldLabel(field: FormFieldRow): string {
  const byKey: Record<string, string> = {
    name: "Name",
    email: "E-Mail",
    phone: "Telefon",
    description: "Beschreibung",
  };

  return byKey[field.key] ?? field.label;
}

function previewPlaceholder(field: FormFieldRow): string {
  if (field.placeholder?.trim()) {
    return field.placeholder.trim();
  }

  switch (field.type) {
    case "EMAIL":
      return "alex@example.com";
    case "PHONE":
      return "+49 30 123456";
    case "TEXTAREA":
      return "Ihre Nachricht …";
    case "NUMBER":
      return "1";
    case "JSON":
      return "Option A, Option B";
    default:
      return field.key === "name" ? "Alex Müller" : displayFieldLabel(field);
  }
}

function sampleValueForField(field: FormFieldRow) {
  switch (field.type) {
    case "EMAIL":
      return "alex@example.com";
    case "PHONE":
      return "+49 30 123456";
    case "NUMBER":
      return 1;
    case "TEXTAREA":
      return "Ich möchte einen Termin für nächste Woche buchen.";
    case "JSON":
      return [
        "Weniger als 50 Google-Bewertungen",
        "Zu wenige Anfragen",
      ];
    default:
      return field.key === "name" ? "Alex Müller" : field.label;
  }
}

function samplePayload(fields: FormFieldRow[]) {
  return fields.reduce<Record<string, unknown>>((payload, field) => {
    payload[field.key] = sampleValueForField(field);
    return payload;
  }, {});
}

function FormPreview({ fields }: { fields: FormFieldRow[] }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Formularvorschau
      </p>
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-sm">
                {displayFieldLabel(field)}
                {field.required ? (
                  <span className="text-destructive"> *</span>
                ) : (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    (freiwillig)
                  </span>
                )}
              </Label>
              <Badge variant="outline" className="text-[10px]">
                {FORM_FIELD_TYPE_LABELS[field.type as keyof typeof FORM_FIELD_TYPE_LABELS] ??
                  field.type}
              </Badge>
            </div>
            {field.type === "TEXTAREA" ? (
              <Textarea
                readOnly
                disabled
                value={previewPlaceholder(field)}
                rows={3}
                className="resize-none bg-background/80"
              />
            ) : field.type === "JSON" ? (
              <div className="flex flex-wrap gap-2 rounded-md border bg-background/80 px-3 py-2">
                {["Option A", "Option B"].map((option) => (
                  <Badge key={option} variant="secondary">
                    {option}
                  </Badge>
                ))}
              </div>
            ) : (
              <Input
                readOnly
                disabled
                value={previewPlaceholder(field)}
                type={
                  field.type === "EMAIL"
                    ? "email"
                    : field.type === "NUMBER"
                      ? "number"
                      : field.type === "PHONE"
                        ? "tel"
                        : "text"
                }
                className="bg-background/80"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WebhookCopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Webhook-URL kopiert.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("URL konnte nicht kopiert werden.");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      Webhook kopieren
    </Button>
  );
}

function FormCard({
  businessId,
  form,
  baseUrl,
  onDelete,
}: {
  businessId: string;
  form: FormRow;
  baseUrl: string;
  onDelete: () => void;
}) {
  const [showIntegration, setShowIntegration] = useState(false);
  const webhookUrl = formWebhookUrl(form.webhookToken, baseUrl);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{form.name}</h3>
              <Badge variant={form.isActive ? "default" : "secondary"}>
                {form.isActive ? "Aktiv" : "Inaktiv"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {form.fields.length} Feld
              {form.fields.length === 1 ? "" : "s"} · {form.enquiryCount}{" "}
              Anfrage{form.enquiryCount === 1 ? "" : "n"}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {showIntegration ? (
              <>
                <WebhookCopyButton url={webhookUrl} />
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`${businessNewEnquiryFormPath(businessId)}?edit=${form.id}`}
                  >
                    Bearbeiten
                  </Link>
                </Button>
              </>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        {showIntegration ? (
          <div className="space-y-4">
            <code className="block break-all rounded-md bg-muted px-3 py-2 text-xs">
              {webhookUrl}
            </code>
            <p className="text-xs text-muted-foreground">
              Senden Sie JSON per POST an diese URL. Es werden nur konfigurierte
              Felder akzeptiert.
            </p>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Beispiel-Anfragekörper
              </p>
              <pre className="overflow-x-auto text-xs">
                {JSON.stringify(samplePayload(form.fields), null, 2)}
              </pre>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowIntegration(false)}
            >
              <Eye className="size-4" />
              Vorschau
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <FormPreview fields={form.fields} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowIntegration(true)}
            >
              <Code2 className="size-4" />
              Integration anzeigen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FormsListPanel({
  businessId,
  forms,
  baseUrl,
}: {
  businessId: string;
  forms: FormRow[];
  baseUrl: string;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState<string | null>(null);

  async function handleDelete(formId: string) {
    setDeletingId(formId);
    try {
      const response = await fetch(
        `/api/business/${businessId}/forms/${formId}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Formular konnte nicht gelöscht werden.");
      }

      toast.success("Formular gelöscht.");
      setDeleteOpen(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Formular konnte nicht gelöscht werden.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button asChild>
          <Link href={businessNewEnquiryFormPath(businessId)}>
            <Plus className="size-4" />
            Neues Formular
          </Link>
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="font-medium">Noch keine Formulare</p>
            <p className="text-sm text-muted-foreground">
              Erstellen Sie ein Formular, um eine Webhook-URL für Anfragen von
              Ihrer Website zu erhalten.
            </p>
            <Button className="mt-2" asChild>
              <Link href={businessNewEnquiryFormPath(businessId)}>
                Formular erstellen
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => (
            <FormCard
              key={form.id}
              businessId={businessId}
              form={form}
              baseUrl={baseUrl}
              onDelete={() => setDeleteOpen(form.id)}
            />
          ))}
        </div>
      )}

      <AlertDialog
        open={deleteOpen != null}
        onOpenChange={(open) => !open && setDeleteOpen(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Formular löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dies löscht das Formular und alle damit erfassten Anfragen dauerhaft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId != null}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingId != null}
              onClick={(event) => {
                event.preventDefault();
                if (deleteOpen) {
                  void handleDelete(deleteOpen);
                }
              }}
            >
              {deletingId ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Wird gelöscht…
                </>
              ) : (
                "Formular löschen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
