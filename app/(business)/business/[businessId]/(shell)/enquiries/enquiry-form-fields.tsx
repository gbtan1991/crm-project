"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormFieldRow } from "@/lib/forms";

const FIELD_LABEL_TRANSLATIONS: Record<string, string> = {
  Email: "E-Mail",
  Phone: "Telefon",
  Description: "Beschreibung",
};

const FIELD_LABELS_BY_KEY: Record<string, string> = {
  name: "Name",
  email: "E-Mail",
  phone: "Telefon",
  description: "Beschreibung",
};

const PLACEHOLDER_TRANSLATIONS: Record<string, string> = {
  "Your name": "Ihr Name",
  "Your Email": "Ihre E-Mail",
  "a brief description of enquiry": "Kurze Beschreibung der Anfrage",
};

const PLACEHOLDERS_BY_KEY: Record<string, string> = {
  name: "Ihr Name",
  email: "Ihre E-Mail",
  phone: "+49 ...",
  description: "Kurze Beschreibung der Anfrage",
};

function displayFieldLabel(field: FormFieldRow): string {
  return (
    FIELD_LABEL_TRANSLATIONS[field.label] ??
    FIELD_LABELS_BY_KEY[field.key] ??
    field.label
  );
}

function displayFieldPlaceholder(field: FormFieldRow): string | undefined {
  const placeholder = field.placeholder?.trim();
  if (placeholder) {
    return PLACEHOLDER_TRANSLATIONS[placeholder] ?? placeholder;
  }
  return PLACEHOLDERS_BY_KEY[field.key];
}

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
            {displayFieldLabel(field)}
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
              placeholder={displayFieldPlaceholder(field)}
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
              placeholder={displayFieldPlaceholder(field)}
              onChange={(event) => onChange(field.key, event.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
