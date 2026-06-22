"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { businessEnquiryFormsPath } from "@/lib/business-paths";
import type { FormRow } from "@/lib/forms";
import {
  DEFAULT_FORM_FIELDS,
  FORM_FIELD_TYPES,
  type FormFieldWriteInput,
} from "@/lib/validation/form";

function emptyField(index: number): FormFieldWriteInput {
  return {
    key: `field_${index + 1}`,
    label: `Field ${index + 1}`,
    type: "TEXT",
    required: false,
    placeholder: "",
    sortOrder: index,
  };
}

export function FormEditor({
  businessId,
  form,
}: {
  businessId: string;
  form?: FormRow;
}) {
  const router = useRouter();
  const isEdit = Boolean(form);
  const [name, setName] = useState(form?.name ?? "");
  const [isActive, setIsActive] = useState(form?.isActive ?? true);
  const [fields, setFields] = useState<FormFieldWriteInput[]>(
    form?.fields.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type as FormFieldWriteInput["type"],
      required: field.required,
      placeholder: field.placeholder ?? "",
      sortOrder: field.sortOrder,
    })) ?? DEFAULT_FORM_FIELDS,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateField(index: number, patch: Partial<FormFieldWriteInput>) {
    setFields((current) =>
      current.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    );
  }

  function addField() {
    setFields((current) => [...current, emptyField(current.length)]);
  }

  function removeField(index: number) {
    setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const response = await fetch(
        isEdit
          ? `/api/business/${businessId}/forms/${form!.id}`
          : `/api/business/${businessId}/forms`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            isActive,
            fields: fields.map((field, index) => ({
              ...field,
              sortOrder: index,
            })),
          }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save form.");
      }

      toast.success(isEdit ? "Form updated." : "Form created.");
      router.push(businessEnquiryFormsPath(businessId));
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Failed to save form.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Form settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form-name">Form name</Label>
            <Input
              id="form-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                Inactive forms reject new webhook submissions.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Fields</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addField}>
            <Plus className="size-4" />
            Add field
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={`${field.key}-${index}`}
              className="grid gap-4 rounded-lg border border-border p-4 md:grid-cols-2"
            >
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={field.label}
                  onChange={(event) =>
                    updateField(index, { label: event.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Key</Label>
                <Input
                  value={field.key}
                  onChange={(event) =>
                    updateField(index, { key: event.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={field.type}
                  onValueChange={(value) =>
                    updateField(index, {
                      type: value as FormFieldWriteInput["type"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_FIELD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Placeholder</Label>
                <Input
                  value={field.placeholder ?? ""}
                  onChange={(event) =>
                    updateField(index, { placeholder: event.target.value })
                  }
                />
              </div>
              <div className="flex items-center justify-between md:col-span-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.required}
                    onCheckedChange={(checked) =>
                      updateField(index, { required: checked })
                    }
                  />
                  <span className="text-sm">Required</span>
                </div>
                {fields.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeField(index)}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={businessEnquiryFormsPath(businessId)}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : isEdit ? (
            "Save form"
          ) : (
            "Create form"
          )}
        </Button>
      </div>
    </form>
  );
}
