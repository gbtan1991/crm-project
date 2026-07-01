"use client";

import { useState } from "react";
import { CalendarDays, Check, Loader2, Mail } from "lucide-react";

import { IntegrationCard } from "@/app/(business)/business/[businessId]/onboarding/components/integration-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CALENDAR_PROVIDERS } from "@/lib/validation/onboarding";

type CalendarProvider = (typeof CALENDAR_PROVIDERS)[number];

const CALENDAR_OPTIONS: {
  id: CalendarProvider;
  name: string;
  description: string;
  tabLabel: string;
}[] = [
  {
    id: "GOOGLE",
    name: "Google Calendar",
    tabLabel: "Google",
    description: "Gmail, Google Workspace",
  },
  {
    id: "OUTLOOK",
    name: "Microsoft Outlook",
    tabLabel: "Outlook",
    description: "Outlook Desktop & Web, Microsoft 365",
  },
];

export function CalendarConnectPanel({
  businessId,
  redirectPath,
  connectedProvider,
  onError,
}: {
  businessId: string;
  redirectPath: string;
  connectedProvider?: CalendarProvider | null;
  onError?: (message: string) => void;
}) {
  const [provider, setProvider] = useState<CalendarProvider>(
    connectedProvider ?? "GOOGLE",
  );
  const [connecting, setConnecting] = useState(false);

  async function connectCalendar(target: CalendarProvider) {
    setConnecting(true);
    const endpoint =
      target === "GOOGLE"
        ? "/api/google-calendar/auth"
        : "/api/outlook-calendar/auth";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, redirectPath }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.authUrl) {
        onError?.(data.error ?? "Kalenderverbindung konnte nicht gestartet werden.");
        return;
      }
      window.location.href = data.authUrl as string;
    } catch {
      onError?.("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setConnecting(false);
    }
  }

  const selected = CALENDAR_OPTIONS.find((o) => o.id === provider)!;

  return (
    <div className="space-y-4">
      <Tabs
        value={provider}
        onValueChange={(value) => setProvider(value as CalendarProvider)}
      >
        <TabsList className="grid w-full grid-cols-2">
          {CALENDAR_OPTIONS.map((opt) => (
            <TabsTrigger key={opt.id} value={opt.id}>
              {opt.tabLabel}
            </TabsTrigger>
          ))}
        </TabsList>

        {CALENDAR_OPTIONS.map((opt) => (
          <TabsContent key={opt.id} value={opt.id} className="mt-4 space-y-4">
            <IntegrationCard
              name={opt.name}
              description={opt.description}
              icon={
                opt.id === "GOOGLE" ? (
                  <CalendarDays className="size-6 text-blue-600" />
                ) : (
                  <Mail className="size-6 text-sky-600" />
                )
              }
              selected
              connected={connectedProvider === opt.id}
            />
          </TabsContent>
        ))}
      </Tabs>

      <Button
        type="button"
        className="w-full"
        disabled={connecting || connectedProvider === provider}
        onClick={() => void connectCalendar(provider)}
      >
        {connecting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Weiterleitung…
          </>
        ) : connectedProvider === provider ? (
          "Bereits verbunden"
        ) : provider === "GOOGLE" ? (
          "Google Calendar verbinden"
        ) : (
          "Microsoft Outlook verbinden"
        )}
      </Button>

      <div className="rounded-xl bg-muted/60 p-4">
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          MeisterFlow überwacht:
        </p>
        <ul className="space-y-1">
          {[
            "Neue Buchungen",
            "Verschobene Termine",
            "Stornierte Termine",
          ].map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <Check className="size-3.5 text-emerald-500" strokeWidth={3} />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Durch die Verbindung mit {selected.name} werden kommende Termine ab heute
        importiert.
      </p>
    </div>
  );
}
