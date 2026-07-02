"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmailHtmlField } from "@/components/email-html-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ActivityLogRow } from "@/lib/activity-logs";
import type { SequenceType } from "@/lib/generated/prisma/client";
import type { SequenceRow } from "@/lib/sequences";
import {
  invoiceSequencePreviewVariables,
  reviewSequencePreviewVariables,
} from "@/lib/email-preview";
import {
  defaultInvoiceSequenceStepHtml,
  defaultReviewSequenceStepHtml,
} from "@/lib/email-templates";

type StepDraft = {
  key: string;
  subject: string;
  bodyHtml: string;
  delayAmount: string;
  delayUnit: "MINUTES" | "HOURS" | "DAYS";
};

function defaultStep(index = 0, type: SequenceType = "INVOICE"): StepDraft {
  const isReview = type === "REVIEW";
  return {
    key: `step-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    subject: isReview
      ? index === 0
        ? "Wie war Ihre Erfahrung mit {{businessName}}?"
        : "Erinnerung: Teilen Sie Ihr Feedback zu {{businessName}}"
      : index === 0
        ? "Rechnung {{invoiceNumber}} von {{businessName}}"
        : "Erinnerung: Rechnung {{invoiceNumber}} ist noch offen",
    bodyHtml: isReview
      ? defaultReviewSequenceStepHtml(index)
      : defaultInvoiceSequenceStepHtml(index),
    delayAmount: index === 0 ? "0" : "3",
    delayUnit: index === 0 ? "MINUTES" : "DAYS",
  };
}

function sequenceToDraft(sequence?: SequenceRow) {
  return {
    name: sequence?.name ?? "",
    type: sequence?.type ?? "INVOICE",
    isActive: sequence?.isActive ?? true,
    steps:
      sequence?.steps.map((step, index) => ({
        key: step.id,
        subject: step.subject,
        bodyHtml:
          step.bodyHtml ??
          (sequence.type === "REVIEW"
            ? defaultReviewSequenceStepHtml(index)
            : defaultInvoiceSequenceStepHtml(index)),
        delayAmount: String(step.delayAmount),
        delayUnit: step.delayUnit,
      })) ?? [
        defaultStep(0, sequence?.type ?? "INVOICE"),
        defaultStep(1, sequence?.type ?? "INVOICE"),
      ],
  };
}

export function SequencesPanel({
  businessId,
  businessName,
  sequences,
  logs,
  logPage,
  logTotalPages,
}: {
  businessId: string;
  businessName: string;
  sequences: SequenceRow[];
  logs: ActivityLogRow[];
  logPage: number;
  logTotalPages: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState(logPage > 1 ? "logs" : "sequences");
  const [editing, setEditing] = useState<SequenceRow | null>(null);
  const [creating, setCreating] = useState(sequences.length === 0);
  const draftSource = editing ?? undefined;
  const initial = sequenceToDraft(draftSource);
  const [type, setType] = useState<SequenceType>(initial.type);
  const activeSequenceForType = sequences.find(
    (sequence) => sequence.isActive && sequence.type === type,
  );
  const typeUnavailable =
    creating &&
    (!editing || editing.type !== type) &&
    activeSequenceForType !== undefined;
  const [name, setName] = useState(initial.name);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [steps, setSteps] = useState<StepDraft[]>(initial.steps);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewVariables =
    type === "REVIEW"
      ? reviewSequencePreviewVariables(businessName)
      : invoiceSequencePreviewVariables(businessName);

  useEffect(() => {
    if (tab !== "logs" || logPage !== 1) {
      return;
    }

    const interval = setInterval(() => {
      router.refresh();
    }, 5_000);

    return () => clearInterval(interval);
  }, [tab, logPage, router]);

  function closeEditor() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  function openEditor(sequence?: SequenceRow) {
    const next = sequenceToDraft(sequence);
    setEditing(sequence ?? null);
    setCreating(true);
    setName(next.name);
    setType(next.type);
    setIsActive(
      sequence
        ? next.isActive
        : sequences.find((item) => item.isActive && item.type === next.type) ===
            undefined,
    );
    setSteps(next.steps);
    setError(null);
  }

  function updateStep(key: string, patch: Partial<StepDraft>) {
    setSteps((current) =>
      current.map((step) => (step.key === key ? { ...step, ...patch } : step)),
    );
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Sequenzname ist erforderlich.");
      return;
    }

    const payloadSteps = steps.map((step, index) => ({
      subject: step.subject,
      bodyHtml: step.bodyHtml,
      delayAmount: Number(step.delayAmount),
      delayUnit: step.delayUnit,
      sortOrder: index,
    }));

    if (
      payloadSteps.some(
        (step) =>
          !step.subject.trim() ||
          !step.bodyHtml.trim() ||
          !Number.isFinite(step.delayAmount) ||
          step.delayAmount < 0,
      )
    ) {
      setError("Jeder Schritt benötigt Betreff, HTML-Text und eine gültige Verzögerung.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editing
          ? `/api/business/${businessId}/sequences/${editing.id}`
          : `/api/business/${businessId}/sequences`,
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            type,
            isActive,
            steps: payloadSteps,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Sequenz konnte nicht gespeichert werden.");
      }

      toast.success(editing ? "Sequenz aktualisiert." : "Sequenz erstellt.");
      setCreating(false);
      setEditing(null);
      router.refresh();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Sequenz konnte nicht gespeichert werden.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sequenceId: string) {
    setDeletingId(sequenceId);
    try {
      const response = await fetch(
        `/api/business/${businessId}/sequences/${sequenceId}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Sequenz konnte nicht gelöscht werden.");
      }

      toast.success("Sequenz gelöscht.");
      router.refresh();
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Sequenz konnte nicht gelöscht werden.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <TabsList>
          <TabsTrigger value="sequences">Sequenzen</TabsTrigger>
          <TabsTrigger value="logs">Protokolle</TabsTrigger>
        </TabsList>
        {tab === "sequences" && !creating ? (
          <Button onClick={() => openEditor()}>
            <Plus className="size-4" />
            Neue Sequenz
          </Button>
        ) : null}
        {tab === "logs" ? (
          <Button variant="outline" onClick={() => router.refresh()}>
            <RefreshCw className="size-4" />
            Protokolle aktualisieren
          </Button>
        ) : null}
      </div>

      <TabsContent value="sequences" className="space-y-6">
        {creating ? (
        <form onSubmit={(event) => void handleSave(event)} className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={closeEditor}>
              <ArrowLeft className="size-4" />
              Zurück zu Sequenzen
            </Button>
            <h2 className="font-semibold">
              {editing ? `${editing.name} bearbeiten` : "Neue Sequenz"}
            </h2>
          </div>

          {error ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <Card>
            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sequence-name">Sequenzname</Label>
                <Input
                  id="sequence-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Rechnungs-Nachfasssequenz"
                />
              </div>
              <div className="space-y-2">
                <Label>Sequenztyp</Label>
                <Select
                  value={type}
                  disabled={Boolean(editing)}
                  onValueChange={(value) => {
                    const nextType = value as SequenceType;
                    setType(nextType);
                    setSteps([defaultStep(0, nextType), defaultStep(1, nextType)]);
                    setIsActive(
                      sequences.find(
                        (sequence) => sequence.isActive && sequence.type === nextType,
                      ) === undefined,
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVOICE">Rechnung</SelectItem>
                    <SelectItem value="REVIEW">Bewertung</SelectItem>
                  </SelectContent>
                </Select>
                {typeUnavailable ? (
                  <p className="text-xs text-muted-foreground">
                    Für den Typ {type.toLowerCase()} gibt es bereits eine aktive Sequenz:{" "}
                    {activeSequenceForType.name}. Sie können diese als inaktiv speichern
                    oder zuerst die aktive Sequenz deaktivieren.
                  </p>
                ) : null}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  disabled={typeUnavailable}
                  onChange={(event) => setIsActive(event.target.checked)}
                />
                Aktive Standardsequenz
              </label>
              <p className="text-sm text-muted-foreground">
                Aktiv bedeutet: Diese Sequenz startet automatisch für neue Rechnungsentwürfe oder Bewertungsanfragen und ist die Standardsequenz auf den zugehörigen Seiten.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <Card key={step.key}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">E-Mail-Schritt {index + 1}</h3>
                      <p className="text-xs text-muted-foreground">
                        Die Verzögerung wird ab Sequenzstart für Schritt 1 gezählt und
                        ab der vorherigen E-Mail für spätere Schritte.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={steps.length === 1}
                      onClick={() =>
                        setSteps((current) =>
                          current.filter((item) => item.key !== step.key),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                      Entfernen
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Warten</Label>
                      <Input
                        type="number"
                        min="0"
                        value={step.delayAmount}
                        onChange={(event) =>
                          updateStep(step.key, { delayAmount: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Einheit</Label>
                      <Select
                        value={step.delayUnit}
                        onValueChange={(value) =>
                          updateStep(step.key, {
                            delayUnit: value as "MINUTES" | "HOURS" | "DAYS",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MINUTES">Minuten</SelectItem>
                          <SelectItem value="HOURS">Stunden</SelectItem>
                          <SelectItem value="DAYS">Tage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <Label>Betreff</Label>
                      <Input
                        value={step.subject}
                        onChange={(event) =>
                          updateStep(step.key, { subject: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <EmailHtmlField
                        id={`sequence-step-html-${step.key}`}
                        value={step.bodyHtml}
                        onChange={(value) =>
                          updateStep(step.key, { bodyHtml: value })
                        }
                        sampleVariables={previewVariables}
                        helpText={
                          <>
                            Bearbeiten Sie das HTML direkt. Verwenden Sie
                            Vorlagenvariablen in doppelten geschweiften Klammern.
                          </>
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            {type === "REVIEW" ? (
              <>
                Variablen: {"{{customerName}}"}, {"{{businessName}}"},{" "}
                {"{{reviewLink}}"}, {"{{link}}"}.
              </>
            ) : (
              <>
                Variablen: {"{{customerName}}"}, {"{{businessName}}"},{" "}
                {"{{invoiceNumber}}"}, {"{{invoiceTitle}}"}, {"{{total}}"},{" "}
                {"{{dueDate}}"}, {"{{issueDate}}"}, {"{{invoiceStatus}}"}.
                {" "}
                Der HTML-Text wird mit angehängter Rechnungs-PDF versendet.
              </>
            )}
          </div>

          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSteps((current) => [...current, defaultStep(current.length, type)])}
            >
              <Plus className="size-4" />
              Schritt hinzufügen
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeEditor}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Wird gespeichert…
                  </>
                ) : (
                  "Sequenz speichern"
                )}
              </Button>
            </div>
          </div>
        </form>
        ) : null}

        {!creating ? (
        <div className="space-y-3">
          {sequences.length === 0 ? (
            <Card>
              <CardContent className="py-14 text-center text-muted-foreground">
                Noch keine Rechnungssequenzen. Erstellen Sie eine, um Rechnungsversand und Nachfassungen zu automatisieren.
              </CardContent>
            </Card>
          ) : (
            sequences.map((sequence) => (
              <Card key={sequence.id}>
                <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{sequence.name}</h3>
                      <Badge variant={sequence.isActive ? "default" : "secondary"}>
                        {sequence.isActive ? "Aktiv" : "Inaktiv"}
                      </Badge>
                      <Badge variant="outline">{sequence.type.toLowerCase()}</Badge>
                      <Badge variant="outline">{sequence.stepCount} Schritte</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sequence.activeEnrollmentCount} aktive Rechnungs-Einschreibungen
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEditor(sequence)}
                    >
                      <Pencil className="size-4" />
                      Bearbeiten
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === sequence.id}
                      onClick={() => void handleDelete(sequence.id)}
                    >
                      {deletingId === sequence.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      Löschen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        ) : null}
      </TabsContent>

      <TabsContent value="logs">
        <SequenceLogs
          logs={logs}
          page={logPage}
          totalPages={logTotalPages}
        />
      </TabsContent>
    </Tabs>
  );
}

function SequenceLogs({
  logs,
  page,
  totalPages,
}: {
  logs: ActivityLogRow[];
  page: number;
  totalPages: number;
}) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-14 text-center text-muted-foreground">
          Noch keine Sequenz-Protokolle. Protokolle erscheinen, wenn der Cron-Job prüft,
          Rechnungen einschreibt, E-Mails sendet oder Fehler auftreten.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="divide-y divide-border p-0">
        {logs.map((log) => (
          <div key={log.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    log.level === "ERROR"
                      ? "destructive"
                      : log.level === "WARNING"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {log.level.toLowerCase()}
                </Badge>
                <Badge variant="outline">{log.type.toLowerCase()}</Badge>
                {log.subType ? (
                  <Badge variant="outline">{log.subType.toLowerCase()}</Badge>
                ) : null}
              </div>
              <p className="text-sm font-medium">{log.message}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {log.invoiceId ? <span>Rechnung: {log.invoiceId.slice(0, 8)}</span> : null}
                {log.reviewId ? <span>Bewertung: {log.reviewId.slice(0, 8)}</span> : null}
                {log.messageId ? <span>Nachricht: {log.messageId.slice(0, 8)}</span> : null}
                {log.sequenceEnrollmentId ? (
                  <span>Einschreibung: {log.sequenceEnrollmentId.slice(0, 8)}</span>
                ) : null}
              </div>
            </div>
            <time className="text-xs text-muted-foreground">
              {new Date(log.createdAt).toLocaleString("de-CH")}
            </time>
          </div>
        ))}
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
          {page > 1 ? (
            <Link href={`?logPage=${page - 1}`}>Zurück</Link>
          ) : (
            <span>Zurück</span>
          )}
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          asChild={page < totalPages}
        >
          {page < totalPages ? (
            <Link href={`?logPage=${page + 1}`}>Weiter</Link>
          ) : (
            <span>Weiter</span>
          )}
        </Button>
      </div>
    </div>
  );
}
