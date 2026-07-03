"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Download, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseKeywordImportCsv } from "@/lib/seo-visibility/keyword-import-csv";
import { cn } from "@/lib/utils";

type ImportRow = {
  id: string;
  keyword: string;
  standort: string;
};

type RowIssue = "empty" | "duplicate-file" | "duplicate-existing";

type ImportRowWithIssue = ImportRow & {
  issue: RowIssue | null;
};

type KeywordImportResult = {
  created: number;
  skippedDuplicates: number;
  skippedEmpty: number;
  failed: number;
  synced: number;
  syncFailed: number;
  totalRows: number;
  errors: string[];
};

function createRowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function analyzeRows(
  rows: ImportRow[],
  existingKeywords: Set<string>,
): ImportRowWithIssue[] {
  const seen = new Set<string>();

  return rows.map((row) => {
    const keyword = row.keyword.trim();
    const normalized = keyword.toLowerCase();

    if (!keyword) {
      return { ...row, issue: "empty" as const };
    }

    if (seen.has(normalized)) {
      return { ...row, issue: "duplicate-file" as const };
    }

    seen.add(normalized);

    if (existingKeywords.has(normalized)) {
      return { ...row, issue: "duplicate-existing" as const };
    }

    return { ...row, issue: null };
  });
}

function issueLabel(issue: RowIssue | null) {
  switch (issue) {
    case "empty":
      return "Keyword fehlt";
    case "duplicate-file":
      return "Duplikat in CSV";
    case "duplicate-existing":
      return "Bereits vorhanden";
    default:
      return null;
  }
}

function KeywordImportDropzone({
  onFile,
  disabled,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Bitte laden Sie eine CSV-Datei hoch.");
      return;
    }
    onFile(file);
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center transition-colors",
        dragOver ? "border-primary bg-accent/40" : "border-border bg-muted/20",
        disabled && "pointer-events-none opacity-50",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <Upload className="mb-3 size-8 text-muted-foreground" />
      <p className="text-sm font-medium">CSV hier ablegen</p>
      <p className="mt-1 text-xs text-muted-foreground">
        oder klicken Sie, um eine Datei auszuwählen
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Datei auswählen
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}

export function KeywordImportDialog({
  businessId,
  existingKeywords,
  open,
  onOpenChange,
  onImported,
}: {
  businessId: string;
  existingKeywords: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const existingSet = useMemo(
    () => new Set(existingKeywords.map((keyword) => keyword.trim().toLowerCase())),
    [existingKeywords],
  );

  const analyzedRows = useMemo(
    () => analyzeRows(rows, existingSet),
    [rows, existingSet],
  );

  const importableRows = analyzedRows.filter((row) => !row.issue);

  const reset = useCallback(() => {
    setRows([]);
    setParseError(null);
    setImporting(false);
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      reset();
    }
  }

  async function handleFile(file: File) {
    setParseError(null);
    try {
      const text = await file.text();
      const parsed = parseKeywordImportCsv(text);
      if (parsed.length === 0) {
        throw new Error("Die CSV-Datei enthält keine Keyword-Zeilen.");
      }
      setRows(
        parsed.map((row) => ({
          id: createRowId(),
          keyword: row.keyword,
          standort: row.locationLabel,
        })),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "CSV konnte nicht gelesen werden.";
      setParseError(message);
      toast.error(message);
    }
  }

  function updateRow(id: string, patch: Partial<Pick<ImportRow, "keyword" | "standort">>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function handleImport() {
    if (importableRows.length === 0) {
      toast.error("Keine gültigen Keywords zum Importieren.");
      return;
    }

    setImporting(true);
    try {
      const response = await fetch(
        `/api/business/${businessId}/business-keywords/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keywords: importableRows.map((row) => ({
              keyword: row.keyword.trim(),
              locationLabel: row.standort.trim(),
            })),
          }),
        },
      );

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        result?: KeywordImportResult;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Keywords konnten nicht importiert werden.");
      }

      const result = data.result;
      if (!result) {
        throw new Error("Keywords konnten nicht importiert werden.");
      }

      const skipped = result.skippedDuplicates + result.skippedEmpty + result.failed;
      toast.success(
        skipped > 0
          ? `${result.created} Keyword${result.created === 1 ? "" : "s"} importiert; ${skipped} übersprungen.`
          : `${result.created} Keyword${result.created === 1 ? "" : "s"} importiert.`,
      );

      if (result.synced > 0) {
        toast.success(
          `Erstes Ranking für ${result.synced} Keyword${result.synced === 1 ? "" : "s"} abgerufen.`,
        );
      }

      if (result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 3).join(" "));
      }

      handleOpenChange(false);
      onImported();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Keywords konnten nicht importiert werden.",
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Keywords importieren</DialogTitle>
          <DialogDescription>
            Laden Sie eine CSV mit den Spalten <strong>keyword</strong> und optional{" "}
            <strong>standort</strong> hoch. Prüfen und bearbeiten Sie die Einträge vor dem
            Import.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/keyword-import-template.csv" download>
                <Download className="size-4" />
                Beispiel-CSV
              </a>
            </Button>
            {rows.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={importing}
                onClick={reset}
              >
                Andere Datei wählen
              </Button>
            ) : null}
          </div>

          {rows.length === 0 ? (
            <KeywordImportDropzone onFile={(file) => void handleFile(file)} disabled={importing} />
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Standort</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyzedRows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={row.issue ? "bg-destructive/5" : undefined}
                    >
                      <TableCell>
                        <Input
                          value={row.keyword}
                          disabled={importing}
                          onChange={(event) =>
                            updateRow(row.id, { keyword: event.target.value })
                          }
                          placeholder="Keyword"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.standort}
                          disabled={importing}
                          onChange={(event) =>
                            updateRow(row.id, { standort: event.target.value })
                          }
                          placeholder="Standort (optional)"
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.issue ? (
                          <span className="text-destructive">{issueLabel(row.issue)}</span>
                        ) : (
                          <span className="text-emerald-600">Bereit</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={importing}
                          onClick={() => removeRow(row.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {parseError ? (
            <p className="text-sm text-destructive">{parseError}</p>
          ) : null}

          {rows.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {importableRows.length} von {rows.length} Keyword
              {rows.length === 1 ? "" : "s"} bereit zum Import.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={importing}
            onClick={() => handleOpenChange(false)}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            disabled={importing || importableRows.length === 0}
            onClick={() => void handleImport()}
          >
            <span className="inline-flex items-center gap-2">
              {importing ? <Loader2 className="size-4 animate-spin" /> : null}
              {importing
                ? "Importiere…"
                : `${importableRows.length} Keyword${importableRows.length === 1 ? "" : "s"} importieren`}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function KeywordImportActions({
  businessId,
  existingKeywords,
  disabled,
  onImported,
}: {
  businessId: string;
  existingKeywords: string[];
  disabled?: boolean;
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Upload className="size-4" />
        CSV importieren
      </Button>
      <KeywordImportDialog
        businessId={businessId}
        existingKeywords={existingKeywords}
        open={open}
        onOpenChange={setOpen}
        onImported={onImported}
      />
    </>
  );
}
