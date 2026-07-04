"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Copy,
  Download,
  Loader2,
  Plus,
  Trash2,
  Upload,
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SerpLocationCombobox } from "@/components/serp-location-combobox";
import { parseKeywordImportCsv } from "@/lib/seo-visibility/keyword-import-csv";
import type { SerpLocationOption } from "@/lib/seo-visibility/serp-location-types";
import { cn } from "@/lib/utils";

type ImportRow = {
  id: string;
  keyword: string;
  locationCode: number | null;
  locationName: string;
};

type RowIssue = "empty" | "location-missing" | "duplicate-file" | "duplicate-existing";

type ImportRowWithIssue = ImportRow & {
  issue: RowIssue | null;
};

type ExistingKeywordEntry = {
  keyword: string;
  locationCode: number;
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

function duplicateKey(keyword: string, locationCode: number) {
  return `${keyword.trim().toLowerCase()}::${locationCode}`;
}

function toLocationOption(row: ImportRow): SerpLocationOption | null {
  if (row.locationCode == null || !row.locationName) return null;
  return {
    locationCode: row.locationCode,
    locationName: row.locationName,
    locationType: "",
  };
}

function createImportRow(
  input: {
    keyword?: string;
    locationCode?: number | null;
    locationName?: string;
  } = {},
): ImportRow {
  return {
    id: createRowId(),
    keyword: input.keyword ?? "",
    locationCode: input.locationCode ?? null,
    locationName: input.locationName ?? "",
  };
}

function analyzeRows(
  rows: ImportRow[],
  existingEntries: ExistingKeywordEntry[],
): ImportRowWithIssue[] {
  const existingKeys = new Set(
    existingEntries.map((entry) => duplicateKey(entry.keyword, entry.locationCode)),
  );
  const seen = new Set<string>();

  return rows.map((row) => {
    const keyword = row.keyword.trim();

    if (!keyword) {
      return { ...row, issue: "empty" as const };
    }

    if (row.locationCode == null || !row.locationName) {
      return { ...row, issue: "location-missing" as const };
    }

    const key = duplicateKey(keyword, row.locationCode);

    if (seen.has(key)) {
      return { ...row, issue: "duplicate-file" as const };
    }

    seen.add(key);

    if (existingKeys.has(key)) {
      return { ...row, issue: "duplicate-existing" as const };
    }

    return { ...row, issue: null };
  });
}

function issueLabel(issue: RowIssue | null) {
  switch (issue) {
    case "empty":
      return "Keyword fehlt";
    case "location-missing":
      return "Standort fehlt";
    case "duplicate-file":
      return "Duplikat in Liste";
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
        Eine Spalte <strong>keyword</strong> — oder klicken Sie, um eine Datei auszuwählen
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
  defaultLocation,
  existingEntries,
  open,
  onOpenChange,
  onImported,
}: {
  businessId: string;
  defaultLocation: SerpLocationOption | null;
  existingEntries: ExistingKeywordEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [seedLocationCode, setSeedLocationCode] = useState<number | null>(null);
  const [seedLocationName, setSeedLocationName] = useState("");
  const [seedComboboxKey, setSeedComboboxKey] = useState(0);
  const [pendingSeedLocation, setPendingSeedLocation] =
    useState<SerpLocationOption | null>(null);
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !defaultLocation) return;
    setSeedLocationCode(defaultLocation.locationCode);
    setSeedLocationName(defaultLocation.locationName);
  }, [defaultLocation, open]);

  const analyzedRows = useMemo(
    () => analyzeRows(rows, existingEntries),
    [rows, existingEntries],
  );

  const importableRows = analyzedRows.filter((row) => !row.issue);

  const reset = useCallback(() => {
    setRows([]);
    setParseError(null);
    setImporting(false);
    setSeedLocationCode(defaultLocation?.locationCode ?? null);
    setSeedLocationName(defaultLocation?.locationName ?? "");
    setSeedComboboxKey(0);
    setPendingSeedLocation(null);
    setOverwriteConfirmOpen(false);
  }, [defaultLocation]);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      reset();
    }
  }

  function getSeedLocation() {
    return {
      locationCode: seedLocationCode,
      locationName: seedLocationName,
    };
  }

  function applySeedLocationToAll(location: SerpLocationOption) {
    setSeedLocationCode(location.locationCode);
    setSeedLocationName(location.locationName);
    setRows((current) =>
      current.map((row) => ({
        ...row,
        locationCode: location.locationCode,
        locationName: location.locationName,
      })),
    );
  }

  function handleSeedLocationChange(location: SerpLocationOption) {
    if (location.locationCode === seedLocationCode) return;

    if (rows.length > 0) {
      setPendingSeedLocation(location);
      setOverwriteConfirmOpen(true);
      setSeedComboboxKey((key) => key + 1);
      return;
    }

    applySeedLocationToAll(location);
  }

  function confirmSeedLocationOverwrite() {
    if (!pendingSeedLocation) return;
    applySeedLocationToAll(pendingSeedLocation);
    setPendingSeedLocation(null);
    setOverwriteConfirmOpen(false);
  }

  function cancelSeedLocationOverwrite() {
    setPendingSeedLocation(null);
    setOverwriteConfirmOpen(false);
  }

  async function handleFile(file: File) {
    setParseError(null);
    try {
      const text = await file.text();
      const parsed = parseKeywordImportCsv(text);
      if (parsed.length === 0) {
        throw new Error("Die CSV-Datei enthält keine Keyword-Zeilen.");
      }

      const seed = getSeedLocation();
      setRows(
        parsed.map((row) =>
          createImportRow({
            keyword: row.keyword,
            locationCode: seed.locationCode,
            locationName: seed.locationName,
          }),
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "CSV konnte nicht gelesen werden.";
      setParseError(message);
      toast.error(message);
    }
  }

  function addRow(keyword = "") {
    const seed = getSeedLocation();
    setRows((current) => [
      ...current,
      createImportRow({
        keyword,
        locationCode: seed.locationCode,
        locationName: seed.locationName,
      }),
    ]);
  }

  function duplicateRow(id: string) {
    const source = rows.find((row) => row.id === id);
    if (!source) return;
    setRows((current) => [
      ...current,
      createImportRow({
        keyword: source.keyword,
        locationCode: source.locationCode,
        locationName: source.locationName,
      }),
    ]);
  }

  function updateRowKeyword(id: string, keyword: string) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, keyword } : row)),
    );
  }

  function updateRowLocation(id: string, location: SerpLocationOption) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              locationCode: location.locationCode,
              locationName: location.locationName,
            }
          : row,
      ),
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
              locationCode: row.locationCode,
              locationName: row.locationName,
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
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Keywords importieren</DialogTitle>
          <DialogDescription>
            Laden Sie eine CSV mit einer Spalte <strong>keyword</strong> hoch oder tragen
            Sie Keywords manuell ein. Der Standard-Standort gilt für neue Zeilen und
            überschreibt bei Änderung alle Standorte in der Tabelle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label htmlFor="import-seed-location">Standard-Standort</Label>
            <SerpLocationCombobox
              key={seedComboboxKey}
              id="import-seed-location"
              businessId={businessId}
              value={seedLocationCode}
              defaultLocation={defaultLocation}
              onValueChange={handleSeedLocationChange}
              disabled={!defaultLocation || importing}
            />
            <p className="text-xs text-muted-foreground">
              Voreinstellung für CSV-Import und neue Zeilen. Der Standort wird nicht
              automatisch an Keywords angehängt.
            </p>
            {rows.length > 0 ? (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>
                  Wenn Sie den Standard-Standort ändern, werden die Standorte{" "}
                  <strong>aller {rows.length} Zeile{rows.length === 1 ? "" : "n"}</strong>{" "}
                  in der Tabelle überschrieben. Einzelne Zeilen können danach wieder
                  angepasst werden.
                </p>
              </div>
            ) : null}
          </div>

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
                Zurücksetzen
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={importing}
              onClick={() => addRow()}
            >
              <Plus className="size-4" />
              Zeile hinzufügen
            </Button>
          </div>

          {rows.length === 0 ? (
            <KeywordImportDropzone onFile={(file) => void handleFile(file)} disabled={importing} />
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="min-w-[220px]">Standort</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyzedRows.map((row) => {
                    const rowLocation = toLocationOption(row);

                    return (
                      <TableRow
                        key={row.id}
                        className={row.issue ? "bg-destructive/5" : undefined}
                      >
                        <TableCell className="align-top">
                          <div className="space-y-1.5">
                            <Input
                              value={row.keyword}
                              disabled={importing}
                              onChange={(event) =>
                                updateRowKeyword(row.id, event.target.value)
                              }
                              placeholder="Keyword"
                            />
                            {row.keyword.trim() && rowLocation ? (
                              <p className="text-xs text-muted-foreground">
                                Personen in{" "}
                                <span className="font-medium text-foreground">
                                  {rowLocation.locationName.replace(/,/g, ", ")}
                                </span>{" "}
                                suchen nach „{row.keyword.trim()}“
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <SerpLocationCombobox
                            businessId={businessId}
                            value={row.locationCode}
                            defaultLocation={rowLocation ?? defaultLocation}
                            onValueChange={(location) =>
                              updateRowLocation(row.id, location)
                            }
                            disabled={!defaultLocation || importing}
                          />
                        </TableCell>
                        <TableCell className="align-top text-xs text-muted-foreground">
                          {row.issue ? (
                            <span className="text-destructive">{issueLabel(row.issue)}</span>
                          ) : (
                            <span className="text-emerald-600">Bereit</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={importing}
                              title="Zeile duplizieren"
                              onClick={() => duplicateRow(row.id)}
                            >
                              <Copy className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={importing}
                              title="Zeile entfernen"
                              onClick={() => removeRow(row.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

      <AlertDialog
        open={overwriteConfirmOpen}
        onOpenChange={(open) => {
          setOverwriteConfirmOpen(open);
          if (!open) {
            setPendingSeedLocation(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Standorte aller Zeilen überschreiben?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Standard-Standort wird auf{" "}
              <strong>
                {pendingSeedLocation?.locationName.replace(/,/g, ", ") ?? "…"}
              </strong>{" "}
              geändert. Dadurch werden die Standorte aller {rows.length} Keyword-Zeile
              {rows.length === 1 ? "" : "n"} in der Tabelle überschrieben.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelSeedLocationOverwrite}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmSeedLocationOverwrite}>
              Alle Standorte überschreiben
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

export function KeywordImportActions({
  businessId,
  defaultLocation,
  existingEntries,
  disabled,
  onImported,
}: {
  businessId: string;
  defaultLocation: SerpLocationOption | null;
  existingEntries: ExistingKeywordEntry[];
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
        defaultLocation={defaultLocation}
        existingEntries={existingEntries}
        open={open}
        onOpenChange={setOpen}
        onImported={onImported}
      />
    </>
  );
}
