"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import type { ActivityLogRow } from "@/lib/activity-logs";
import type { SequenceType } from "@/lib/generated/prisma/client";
import type { SequenceRow } from "@/lib/sequences";

type StepDraft = {
  key: string;
  subject: string;
  bodyText: string;
  delayAmount: string;
  delayUnit: "MINUTES" | "HOURS" | "DAYS";
};

function defaultStep(index = 0, type: SequenceType = "INVOICE"): StepDraft {
  const isReview = type === "REVIEW";
  return {
    key: `step-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    subject: isReview
      ? index === 0
        ? "How was your experience with {{businessName}}?"
        : "Reminder: share your feedback with {{businessName}}"
      : index === 0
        ? "Invoice {{invoiceNumber}} from {{businessName}}"
        : "Reminder: invoice {{invoiceNumber}} is still open",
    bodyText: isReview
      ? [
          "Hello {{customerName}},",
          "",
          "We would love to hear about your experience with {{businessName}}.",
          "",
          "Please leave your review here: {{reviewLink}}",
          "",
          "Thank you.",
        ].join("\n")
      : [
          "Hello {{customerName}},",
          "",
          index === 0
            ? "Please find your invoice attached."
            : "This is a friendly reminder that invoice {{invoiceNumber}} is still open.",
          "",
          "Amount: {{total}}",
          "Due date: {{dueDate}}",
          "",
          "Thank you.",
        ].join("\n"),
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
      sequence?.steps.map((step) => ({
        key: step.id,
        subject: step.subject,
        bodyText: step.bodyText,
        delayAmount: String(step.delayAmount),
        delayUnit: step.delayUnit,
      })) ?? [defaultStep(0, sequence?.type ?? "INVOICE"), defaultStep(1, sequence?.type ?? "INVOICE")],
  };
}

export function SequencesPanel({
  businessId,
  sequences,
  logs,
  logPage,
  logTotalPages,
}: {
  businessId: string;
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

  useEffect(() => {
    if (tab !== "logs" || logPage !== 1) {
      return;
    }

    const interval = setInterval(() => {
      router.refresh();
    }, 5_000);

    return () => clearInterval(interval);
  }, [tab, logPage, router]);

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
      setError("Sequence name is required.");
      return;
    }

    const payloadSteps = steps.map((step, index) => ({
      subject: step.subject,
      bodyText: step.bodyText,
      delayAmount: Number(step.delayAmount),
      delayUnit: step.delayUnit,
      sortOrder: index,
    }));

    if (
      payloadSteps.some(
        (step) =>
          !step.subject.trim() ||
          !step.bodyText.trim() ||
          !Number.isFinite(step.delayAmount) ||
          step.delayAmount < 0,
      )
    ) {
      setError("Each step needs a subject, body, and valid delay.");
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
        throw new Error(data.error ?? "Failed to save sequence.");
      }

      toast.success(editing ? "Sequence updated." : "Sequence created.");
      setCreating(false);
      setEditing(null);
      router.refresh();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Failed to save sequence.";
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
        throw new Error(data.error ?? "Failed to delete sequence.");
      }

      toast.success("Sequence deleted.");
      router.refresh();
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete sequence.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <TabsList>
          <TabsTrigger value="sequences">Sequences</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        {tab === "sequences" && !creating ? (
          <Button onClick={() => openEditor()}>
            <Plus className="size-4" />
            New sequence
          </Button>
        ) : null}
        {tab === "logs" ? (
          <Button variant="outline" onClick={() => router.refresh()}>
            <RefreshCw className="size-4" />
            Refresh logs
          </Button>
        ) : null}
      </div>

      <TabsContent value="sequences" className="space-y-6">
        {creating ? (
        <form onSubmit={(event) => void handleSave(event)} className="space-y-5">
          {error ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <Card>
            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sequence-name">Sequence name</Label>
                <Input
                  id="sequence-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Invoice follow-up sequence"
                />
              </div>
              <div className="space-y-2">
                <Label>Sequence type</Label>
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
                    <SelectItem value="INVOICE">Invoice</SelectItem>
                    <SelectItem value="REVIEW">Review</SelectItem>
                  </SelectContent>
                </Select>
                {typeUnavailable ? (
                  <p className="text-xs text-muted-foreground">
                    {type.toLowerCase()} type already has an active sequence:{" "}
                    {activeSequenceForType.name}. You can save this as inactive,
                    or disable the active sequence first.
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
                Active default sequence
              </label>
              <p className="text-sm text-muted-foreground">
                Active means this invoice sequence starts automatically for new
                draft invoices or review requests and is the default sequence on
                related pages.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <Card key={step.key}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Email step {index + 1}</h3>
                      <p className="text-xs text-muted-foreground">
                        Delay is counted from sequence start for step 1, and
                        from the previous email for later steps.
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
                      Remove
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Wait</Label>
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
                      <Label>Unit</Label>
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
                          <SelectItem value="MINUTES">Minutes</SelectItem>
                          <SelectItem value="HOURS">Hours</SelectItem>
                          <SelectItem value="DAYS">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <Label>Subject</Label>
                      <Input
                        value={step.subject}
                        onChange={(event) =>
                          updateStep(step.key, { subject: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <Label>Body</Label>
                      <Textarea
                        value={step.bodyText}
                        rows={8}
                        onChange={(event) =>
                          updateStep(step.key, { bodyText: event.target.value })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            Variables: {"{{customerName}}"}, {"{{invoiceNumber}}"},{" "}
            {"{{invoiceTitle}}"}, {"{{total}}"}, {"{{dueDate}}"},{" "}
            {"{{issueDate}}"}.
          </div>

          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSteps((current) => [...current, defaultStep(current.length, type)])}
            >
              <Plus className="size-4" />
              Add step
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save sequence"
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
                No invoice sequences yet. Create one to automate invoice sending
                and follow-ups.
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
                        {sequence.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">{sequence.type.toLowerCase()}</Badge>
                      <Badge variant="outline">{sequence.stepCount} steps</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sequence.activeEnrollmentCount} active invoice enrollments
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
                      Edit
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
                      Delete
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
          No sequence logs yet. Logs will appear when the cron job checks,
          enrolls invoices, sends emails, or encounters errors.
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
                {log.invoiceId ? <span>Invoice: {log.invoiceId.slice(0, 8)}</span> : null}
                {log.reviewId ? <span>Review: {log.reviewId.slice(0, 8)}</span> : null}
                {log.messageId ? <span>Message: {log.messageId.slice(0, 8)}</span> : null}
                {log.sequenceEnrollmentId ? (
                  <span>Enrollment: {log.sequenceEnrollmentId.slice(0, 8)}</span>
                ) : null}
              </div>
            </div>
            <time className="text-xs text-muted-foreground">
              {new Date(log.createdAt).toLocaleString("en-US")}
            </time>
          </div>
        ))}
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
          {page > 1 ? (
            <Link href={`?logPage=${page - 1}`}>Previous</Link>
          ) : (
            <span>Previous</span>
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
            <Link href={`?logPage=${page + 1}`}>Next</Link>
          ) : (
            <span>Next</span>
          )}
        </Button>
      </div>
    </div>
  );
}
