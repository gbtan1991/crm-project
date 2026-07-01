"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Link2,
  Loader2,
  Plug,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";

import { CalendarConnectedBadge } from "@/components/calendar/calendar-connected-badge";
import { CalendarConnectPanel } from "@/components/calendar/calendar-connect-panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { businessSettingsPath } from "@/lib/business-paths";
import { CALENDAR_PROVIDERS } from "@/lib/validation/onboarding";

type CalendarProvider = (typeof CALENDAR_PROVIDERS)[number];

type CalendarStatus = {
  isConnected: boolean;
  provider: CalendarProvider | null;
  accountEmail: string | null;
  lastSyncedAt: string | null;
  webhookActive: boolean;
};

export function CalendarSettingsPanel({
  businessId,
  initialStatus,
}: {
  businessId: string;
  initialStatus: CalendarStatus;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const settingsPath = businessSettingsPath(businessId, "calendar");
  const status = initialStatus;

  const [syncing, setSyncing] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    const oauthSuccess = searchParams.get("oauth_success");
    const oauthError = searchParams.get("error");

    if (oauthSuccess === "google") {
      toast.success("Google Kalender verbunden.");
      router.replace(settingsPath);
      router.refresh();
    } else if (oauthSuccess === "outlook") {
      toast.success("Outlook Kalender verbunden.");
      router.replace(settingsPath);
      router.refresh();
    } else if (oauthError) {
      toast.error("Kalenderverbindung fehlgeschlagen. Bitte versuchen Sie es erneut.");
      router.replace(settingsPath);
    }
  }, [searchParams, router, settingsPath]);

  async function handleSync() {
    setSyncing(true);
    try {
      const response = await fetch(
        `/api/business/${businessId}/calendar/sync`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Synchronisation fehlgeschlagen.");
      }

      const { created = 0, updated = 0, cancelled = 0 } = data.result ?? {};
      toast.success(
        `Synchronisation abgeschlossen — ${created} neu, ${updated} aktualisiert, ${cancelled} storniert`,
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Kalendersynchronisation fehlgeschlagen.",
      );
    } finally {
      setSyncing(false);
    }
  }

  async function handleReconnect() {
    if (!status.provider) return;

    setReconnecting(true);
    const endpoint =
      status.provider === "GOOGLE"
        ? "/api/google-calendar/auth"
        : "/api/outlook-calendar/auth";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, redirectPath: settingsPath }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.authUrl) {
        throw new Error(data.error ?? "Erneute Verbindung konnte nicht gestartet werden.");
      }
      window.location.href = data.authUrl as string;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erneute Verbindung fehlgeschlagen.",
      );
      setReconnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const response = await fetch(
        `/api/business/${businessId}/calendar/disconnect`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Trennung fehlgeschlagen.");
      }

      toast.success("Kalender getrennt.");
      setDisconnectOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Trennung fehlgeschlagen.",
      );
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Kalenderverbindung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {status.isConnected ? (
              <CalendarConnectedBadge
                provider={status.provider}
                accountEmail={status.accountEmail}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No calendar connected yet.
              </p>
            )}
          </div>

          {status.isConnected ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Zuletzt synchronisiert</dt>
                <dd className="font-medium">
                  {status.lastSyncedAt
                    ? new Date(status.lastSyncedAt).toLocaleString("de-CH")
                    : "Nie"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Echtzeit-Updates</dt>
                <dd className="font-medium">
                  {status.webhookActive ? "Aktiv" : "Nicht registriert"}
                </dd>
              </div>
            </dl>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {status.isConnected ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleSync()}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Kalender synchronisieren
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleReconnect()}
                  disabled={reconnecting}
                >
                  {reconnecting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Link2 className="size-4" />
                  )}
                  Erneut verbinden
                </Button>

                <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Unplug className="size-4" />
                      Trennen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Kalender trennen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Dies trennt Ihren Kalender von MeisterFlow und
                        entfernt alle importierten Termine aus diesem Arbeitsbereich. Ereignisse
                        in Ihrem Google- oder Outlook-Kalender werden nicht gelöscht.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={disconnecting}>
                        Abbrechen
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={disconnecting}
                        onClick={(event) => {
                          event.preventDefault();
                          void handleDisconnect();
                        }}
                      >
                        {disconnecting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Wird getrennt…
                          </>
                        ) : (
                          "Trennen und Termine löschen"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setConnectError(null);
                  setConnectOpen(true);
                }}
              >
                <Plug className="size-4" />
                Kalender verbinden
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="size-5" />
              Kalender verbinden
            </DialogTitle>
            <DialogDescription>
              Verbinden Sie Ihren Kalender, damit MeisterFlow Terminaktivitäten
              erkennt und bevorstehende Termine importieren kann.
            </DialogDescription>
          </DialogHeader>

          {connectError ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {connectError}
            </div>
          ) : null}

          <CalendarConnectPanel
            businessId={businessId}
            redirectPath={settingsPath}
            connectedProvider={status.provider}
            onError={setConnectError}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
