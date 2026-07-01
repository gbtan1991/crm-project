"use client";

import { wrapEmailContentHtml } from "@/lib/email-html";
import { renderEmailTemplatePreview } from "@/lib/email-preview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function EmailPreviewDialog({
  open,
  onOpenChange,
  subject,
  bodyHtml,
  bodyText,
  sampleVariables,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  sampleVariables: Record<string, string>;
}) {
  const previewSubject = renderEmailTemplatePreview(subject, sampleVariables);
  const previewHtml = wrapEmailContentHtml(
    renderEmailTemplatePreview(bodyHtml, sampleVariables),
  );
  const previewText = renderEmailTemplatePreview(bodyText, sampleVariables);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>E-Mail-Vorschau</DialogTitle>
          <DialogDescription>
            Für Variablen werden Beispieldaten verwendet. Beim Versand werden echte Kundendaten
            verwendet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Subject
            </p>
            <p className="mt-1 text-sm">{previewSubject || "—"}</p>
          </div>

          <Tabs defaultValue="html">
            <TabsList>
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="text">Klartext</TabsTrigger>
            </TabsList>
            <TabsContent value="html" className="mt-3">
              <iframe
                title="Email HTML preview"
                srcDoc={previewHtml}
                className="h-[480px] w-full rounded-lg border bg-white"
                sandbox=""
              />
            </TabsContent>
            <TabsContent value="text" className="mt-3">
              <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/20 p-4 text-sm">
                {previewText || "—"}
              </pre>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
