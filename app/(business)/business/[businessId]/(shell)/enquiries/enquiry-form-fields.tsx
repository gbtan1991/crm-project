"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormFieldRow } from "@/lib/forms";

export function emptyEnquiryFormValues(
  fields: FormFieldRow[],
): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.key, ""]));
}

export function EnquiryFormFields({
  fields,
  values,
  onChange,
}: {
  fields: FormFieldRow[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={`enquiry-${field.key}`}>
            {field.label}
            {field.required ? (
              <span className="text-destructive"> *</span>
            ) : (
              <span className="text-muted-foreground"> (freiwillig)</span>
            )}
          </Label>
          {field.type === "TEXTAREA" ? (
            <Textarea
              id={`enquiry-${field.key}`}
              value={values[field.key] ?? ""}
              placeholder={field.placeholder ?? undefined}
              rows={4}
              onChange={(event) => onChange(field.key, event.target.value)}
            />
          ) : (
            <Input
              id={`enquiry-${field.key}`}
              type={
                field.type === "EMAIL"
                  ? "email"
                  : field.type === "NUMBER"
                    ? "number"
                    : field.type === "PHONE"
                      ? "tel"
                      : "text"
              }
              value={values[field.key] ?? ""}
              placeholder={field.placeholder ?? undefined}
              onChange={(event) => onChange(field.key, event.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
