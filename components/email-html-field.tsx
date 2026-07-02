"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Eye, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { wrapEmailContentHtml } from "@/lib/email-html";
import { renderEmailTemplatePreview } from "@/lib/email-preview";

type EmailHtmlFieldProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  sampleVariables: Record<string, string>;
  rows?: number;
  helpText?: ReactNode;
  resetWhenOpen?: boolean;
};

export function EmailHtmlField({
  id,
  label = "HTML-Text",
  value,
  onChange,
  sampleVariables,
  rows = 12,
  helpText,
  resetWhenOpen,
}: EmailHtmlFieldProps) {
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (resetWhenOpen) {
      setEditing(false);
    }
  }, [resetWhenOpen]);

  const previewHtml = useMemo(
    () =>
      wrapEmailContentHtml(
        renderEmailTemplatePreview(value, sampleVariables),
      ),
    [sampleVariables, value],
  );

  const previewHeight = `${Math.max(rows * 24, 192)}px`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditing((current) => !current)}
        >
          {editing ? (
            <>
              <Eye className="size-4" />
              Vorschau
            </>
          ) : (
            <>
              <Pencil className="size-4" />
              Bearbeiten
            </>
          )}
        </Button>
      </div>

      {editing ? (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          className="font-mono text-xs"
        />
      ) : (
        <iframe
          title="E-Mail HTML-Vorschau"
          srcDoc={previewHtml}
          className="w-full rounded-lg border bg-white"
          style={{ height: previewHeight }}
          sandbox=""
        />
      )}

      {helpText ? (
        <div className="text-xs text-muted-foreground">{helpText}</div>
      ) : null}
    </div>
  );
}
