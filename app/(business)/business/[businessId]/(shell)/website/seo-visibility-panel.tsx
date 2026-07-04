"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { buildGoogleSearchPreviewUrl } from "@/lib/seo-visibility/market";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { businessSettingsPath } from "@/lib/business-paths";
import { KeywordImportActions } from "@/app/(business)/business/[businessId]/(shell)/website/keyword-import-dialog";
import {
  SerpLocationCombobox,
} from "@/components/serp-location-combobox";
import type { SerpLocationOption } from "@/lib/seo-visibility/serp-location-types";
import type {
  BusinessKeywordListRow,
  BusinessKeywordsOverview,
  KeywordRankingSyncRow,
} from "@/lib/seo-visibility/keywords";
import {
  getVisibilityDescription,
  getVisibilityLabel,
  type KeywordVisibility,
} from "@/lib/seo-visibility/visibility";
import { cn } from "@/lib/utils";

function formatSyncDate(value: string) {
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function visibilityStyles(visibility: KeywordVisibility) {
  switch (visibility) {
    case "EXCELLENT":
      return {
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: CheckCircle,
      };
    case "WEAK":
      return {
        className: "border-amber-200 bg-amber-50 text-amber-700",
        icon: AlertTriangle,
      };
    case "LOW":
      return {
        className: "border-orange-200 bg-orange-50 text-orange-700",
        icon: AlertTriangle,
      };
    case "NOT_VISIBLE":
      return {
        className: "border-red-200 bg-red-50 text-red-700",
        icon: XCircle,
      };
  }
}

function StatusBadge({ visibility }: { visibility: KeywordVisibility }) {
  const config = visibilityStyles(visibility);
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("shrink-0 gap-1 font-semibold", config.className)}>
      <Icon className="size-3" />
      {getVisibilityLabel(visibility)}
    </Badge>
  );
}

function LastSyncLine({
  lastSync,
  dueCount,
}: {
  lastSync: KeywordRankingSyncRow | null;
  dueCount: number;
}) {
  if (!lastSync) {
    return (
      <p className="text-sm text-muted-foreground">
        Noch keine Synchronisation durchgeführt.
        {dueCount > 0 ? ` · ${dueCount} Keyword${dueCount === 1 ? "" : "s"} ausstehend` : ""}
      </p>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Letzte Synchronisation: {formatSyncDate(lastSync.startedAt)} ·{" "}
      {lastSync.successCount}/{lastSync.totalCount} erfolgreich
      {lastSync.skippedCount > 0 ? ` · ${lastSync.skippedCount} übersprungen` : ""}
      {lastSync.failedCount > 0 ? ` · ${lastSync.failedCount} fehlgeschlagen` : ""}
      {dueCount > 0 ? ` · ${dueCount} ausstehend` : " · alle Keywords heute geprüft"}
    </p>
  );
}

function KeywordCard({
  keyword,
  country,
  onDelete,
  deleting,
}: {
  keyword: BusinessKeywordListRow;
  country: string;
  onDelete: (keyword: BusinessKeywordListRow) => void;
  deleting: boolean;
}) {
  const googleUrl =
    keyword.latestRanking?.serpCheckUrl ??
    buildGoogleSearchPreviewUrl(keyword.keyword, country);
  const visibility = keyword.latestRanking?.visibility ?? "NOT_VISIBLE";
  const position = keyword.latestRanking?.position;

  return (
    <Card className="flex h-full flex-col shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="mb-3 flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-snug">{keyword.keyword}</p>
            <StatusBadge visibility={visibility} />
          </div>

          <div className="mb-3 space-y-1 text-xs text-muted-foreground">
            <p>
              Position:{" "}
              <span className="font-semibold text-foreground">
                {position ? `#${position}` : "—"}
              </span>
            </p>
            {keyword.locationName ? (
              <p className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {keyword.locationName}
              </p>
            ) : null}
            {keyword.syncedToday ? (
              <p className="text-emerald-600">Heute geprüft</p>
            ) : null}
            {keyword.latestRanking?.rankingUrl ? (
              <a
                href={keyword.latestRanking.rankingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="size-3 shrink-0" />
                <span className="truncate">{keyword.latestRanking.rankingUrl}</span>
              </a>
            ) : null}
          </div>

          <p className="mb-4 text-xs text-muted-foreground">
            {keyword.latestRanking?.error
              ? keyword.latestRanking.error
              : getVisibilityDescription(visibility)}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <a href={googleUrl} target="_blank" rel="noopener noreferrer">
              <Search className="size-3.5" />
              Google Resultate ansehen
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={deleting}
            onClick={() => onDelete(keyword)}
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatLocationPreview(locationName: string) {
  return locationName.replace(/,/g, ", ");
}

function AddKeywordDialog({
  businessId,
  targetDomain,
  defaultLocation,
  open,
  onOpenChange,
  onSaved,
}: {
  businessId: string;
  targetDomain: string | null;
  defaultLocation: SerpLocationOption | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [locationCode, setLocationCode] = useState<number | null>(null);
  const [locationName, setLocationName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !defaultLocation) return;
    setLocationCode(defaultLocation.locationCode);
    setLocationName(defaultLocation.locationName);
  }, [defaultLocation, open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!locationCode || !locationName) {
      setError("Bitte wählen Sie einen Standort aus.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/business/${businessId}/business-keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          locationCode,
          locationName,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Keyword konnte nicht erstellt werden.");
      }

      toast.success("Keyword hinzugefügt.");
      if (data.initialSync?.synced) {
        toast.success("Erstes Ranking für das neue Keyword abgerufen.");
      } else if (data.initialSync?.failed) {
        toast.error("Keyword gespeichert, aber die erste Synchronisation ist fehlgeschlagen.");
      }
      setKeyword("");
      setLocationCode(defaultLocation?.locationCode ?? null);
      setLocationName(defaultLocation?.locationName ?? "");
      onOpenChange(false);
      onSaved();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Keyword konnte nicht erstellt werden.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Keyword hinzufügen</DialogTitle>
            <DialogDescription>
              Verfolgen Sie, an welcher Position Ihre Website für einen bestimmten
              Google-Suchbegriff erscheint — simuliert von einem gewählten Standort aus.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="seo-keyword">Keyword</Label>
            <Input
              id="seo-keyword"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="z. B. Webdesign Agentur Aargau"
              required
            />
            <p className="text-xs text-muted-foreground">
              Der exakte Suchtext in Google — so wie ihn jemand eintippen würde. Für lokale
              Suchen den Ort im Keyword mit angeben (z. B. „… in Aargau“ oder „… Aargau“).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seo-location">Standort</Label>
            <SerpLocationCombobox
              id="seo-location"
              businessId={businessId}
              value={locationCode}
              defaultLocation={defaultLocation}
              onValueChange={(location) => {
                setLocationCode(location.locationCode);
                setLocationName(location.locationName);
              }}
              disabled={!defaultLocation}
            />
            <p className="text-xs text-muted-foreground">
              Wo die suchende Person sitzt — simuliert die Google-Ergebnisse aus dieser Region.
              Der Standort wird nicht automatisch an das Keyword angehängt.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Ziel-Domain</Label>
            <Input value={targetDomain ?? "Nicht gesetzt"} readOnly disabled />
            <p className="text-xs text-muted-foreground">
              Die Website, deren Position in den Suchergebnissen gezählt wird.
            </p>
          </div>

          {locationName ? (
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-950">
              Personen in{" "}
              <span className="font-semibold">{formatLocationPreview(locationName)}</span>{" "}
              suchen nach{" "}
              <span className="font-semibold">
                {keyword.trim() || "…"}
              </span>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving || !targetDomain || !locationCode}>
              <span className="inline-flex items-center gap-2">
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {saving ? "Wird gespeichert…" : "Keyword speichern"}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SeoVisibilityPanel({ businessId }: { businessId: string }) {
  const [overview, setOverview] = useState<BusinessKeywordsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadOverview = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const response = await fetch(`/api/business/${businessId}/business-keywords`);
      const data = (await response.json().catch(() => ({}))) as BusinessKeywordsOverview & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Keywords konnten nicht geladen werden.");
      }

      setOverview(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Keywords konnten nicht geladen werden.",
      );
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [businessId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  async function handleSync() {
    setSyncing(true);
    try {
      const response = await fetch(`/api/business/${businessId}/business-keywords/sync`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Synchronisation fehlgeschlagen.");
      }

      if (data.synced === 0 && data.failed === 0 && data.skipped > 0) {
        toast.info("Alle Keywords wurden heute bereits synchronisiert.");
      } else if (data.skipped > 0) {
        toast.success(
          `${data.synced} Keyword${data.synced === 1 ? "" : "s"} synchronisiert, ${data.skipped} bereits heute geprüft.`,
        );
      } else {
        toast.success(
          `${data.synced} Keyword${data.synced === 1 ? "" : "s"} synchronisiert${data.failed > 0 ? `, ${data.failed} fehlgeschlagen` : ""}.`,
        );
      }
      await loadOverview({ silent: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Synchronisation fehlgeschlagen.",
      );
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete(keyword: BusinessKeywordListRow) {
    setDeletingId(keyword.id);
    try {
      const response = await fetch(
        `/api/business/${businessId}/business-keywords/${keyword.id}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Keyword konnte nicht gelöscht werden.");
      }

      toast.success("Keyword gelöscht.");
      await loadOverview({ silent: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Keyword konnte nicht gelöscht werden.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const tierSummary = overview?.tierSummary;
  const keywords = overview?.keywords ?? [];
  const missingDomain = !overview?.targetDomain;

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Search className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Sichtbarkeits-Check
            </span>
          </div>
          <h2 className="font-heading text-2xl font-bold">Keyword-Sichtbarkeit Analyse</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Analysierte Google-Suchbegriffe und deren Sichtbarkeitsstatus. Klicken Sie auf
            &quot;Google Resultate ansehen&quot; für die echte Google-Suche.
          </p>
          <div className="mt-3">
            <LastSyncLine
              lastSync={overview?.lastSync ?? null}
              dueCount={overview?.dueCount ?? 0}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={syncing || loading || missingDomain || keywords.length === 0}
            onClick={() => void handleSync()}
          >
            <span className="inline-flex items-center gap-2">
              {syncing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {syncing ? "Synchronisiere…" : "Synchronisieren"}
            </span>
          </Button>
          <Button disabled={missingDomain} onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Keyword hinzufügen
          </Button>
          <KeywordImportActions
            businessId={businessId}
            defaultLocation={overview?.defaultLocation ?? null}
            existingEntries={keywords.map((keyword) => ({
              keyword: keyword.keyword,
              locationCode: keyword.locationCode,
            }))}
            disabled={missingDomain}
            onImported={() => void loadOverview({ silent: true })}
          />
        </div>
      </div>

      {missingDomain ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Bitte hinterlegen Sie zuerst eine Website-Domain in den{" "}
          <Link href={businessSettingsPath(businessId, "general")} className="font-medium underline">
            Unternehmenseinstellungen
          </Link>
          , bevor Sie Keywords hinzufügen oder synchronisieren können.
        </div>
      ) : null}

      {tierSummary && keywords.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
            Top 3 ({tierSummary.top3})
          </Badge>
          <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
            Top 10 ({tierSummary.top10})
          </Badge>
          <Badge variant="outline" className="gap-1 border-orange-200 bg-orange-50 text-orange-700">
            Top 50 ({tierSummary.top50})
          </Badge>
          <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 text-red-700">
            Nicht gerankt ({tierSummary.notRanked})
          </Badge>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : keywords.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            Noch keine Keywords vorhanden. Fügen Sie Ihr erstes Keyword hinzu.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {keywords.map((keyword) => (
            <KeywordCard
              key={keyword.id}
              keyword={keyword}
              country={overview?.country ?? "CH"}
              deleting={deletingId === keyword.id}
              onDelete={(item) => void handleDelete(item)}
            />
          ))}
        </div>
      )}

      <AddKeywordDialog
        businessId={businessId}
        targetDomain={overview?.targetDomain ?? null}
        defaultLocation={overview?.defaultLocation ?? null}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => void loadOverview({ silent: true })}
      />
    </section>
  );
}
