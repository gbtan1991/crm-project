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
      toast.success("Google Calendar connected.");
      router.replace(settingsPath);
      router.refresh();
    } else if (oauthSuccess === "outlook") {
      toast.success("Outlook Calendar connected.");
      router.replace(settingsPath);
      router.refresh();
    } else if (oauthError) {
      toast.error("Calendar connection failed. Please try again.");
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
        throw new Error(data.error ?? "Sync failed.");
      }

      const { created = 0, updated = 0, cancelled = 0 } = data.result ?? {};
      toast.success(
        `Sync complete — ${created} new, ${updated} updated, ${cancelled} cancelled`,
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Calendar sync failed.",
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
        throw new Error(data.error ?? "Failed to start reconnection.");
      }
      window.location.href = data.authUrl as string;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Reconnection failed.",
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
        throw new Error(data.error ?? "Disconnect failed.");
      }

      toast.success("Calendar disconnected.");
      setDisconnectOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Disconnect failed.",
      );
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Calendar connection</CardTitle>
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
                <dt className="text-muted-foreground">Last synced</dt>
                <dd className="font-medium">
                  {status.lastSyncedAt
                    ? new Date(status.lastSyncedAt).toLocaleString("en-US")
                    : "Never"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Real-time updates</dt>
                <dd className="font-medium">
                  {status.webhookActive ? "Active" : "Not registered"}
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
                  Sync calendar
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
                  Reconnect
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
                      Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect calendar?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will disconnect your calendar from MeisterFlow and
                        remove all imported bookings from this workspace. Events
                        in your Google or Outlook calendar will not be deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={disconnecting}>
                        Cancel
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
                            Disconnecting…
                          </>
                        ) : (
                          "Disconnect and clear bookings"
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
                Connect calendar
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
              Connect calendar
            </DialogTitle>
            <DialogDescription>
              Connect your calendar so MeisterFlow can listen for booking activity
              and import upcoming appointments.
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
