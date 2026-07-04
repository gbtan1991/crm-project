"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { WebsiteOverview } from "@/lib/website-tickets";

const META_PIXEL_SETUP_URL = "https://www.youtube.com/watch?v=h35eEoI4wm8";

type WebsiteFormState = {
  domain: string;
  hostingAccess: string;
  hasWebsite: boolean;
  hasGoogleAnalytics: boolean;
  hasSearchConsole: boolean;
};

function toFormState(overview: WebsiteOverview): WebsiteFormState {
  return {
    domain: overview.domain ?? "",
    hostingAccess: overview.hostingAccess ?? "",
    hasWebsite: overview.hasWebsite,
    hasGoogleAnalytics: overview.hasGoogleAnalytics,
    hasSearchConsole: overview.hasSearchConsole,
  };
}

export function WebsiteSettingsForm({
  businessId,
  initialOverview,
  showMetaPixelHelp = true,
}: {
  businessId: string;
  initialOverview: WebsiteOverview;
  showMetaPixelHelp?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<WebsiteFormState>(() => toFormState(initialOverview));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/business/${businessId}/settings/website`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Website-Einstellungen konnten nicht gespeichert werden.");
      }

      toast.success("Website-Informationen aktualisiert.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Website-Einstellungen konnten nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="size-4" />
          Website-Informationen
        </CardTitle>
        <CardDescription>
          Angaben aus der Einrichtung — hier können Sie Domain und Website-Status jederzeit
          aktualisieren.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="website-domain">Website-URL / Domain</Label>
            <Input
              id="website-domain"
              value={form.domain}
              onChange={(event) =>
                setForm((current) => ({ ...current, domain: event.target.value }))
              }
              placeholder="www.beispiel.ch"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website-hosting">Hosting-Anbieter</Label>
            <Input
              id="website-hosting"
              value={form.hostingAccess}
              onChange={(event) =>
                setForm((current) => ({ ...current, hostingAccess: event.target.value }))
              }
              placeholder="z. B. Hostpoint, Infomaniak"
            />
            <p className="text-xs text-muted-foreground">
              Optional — hilft dem Website-Team bei Zugang und Support.
            </p>
          </div>

          {showMetaPixelHelp ? (
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Meta Pixel</span>
              <a
                href={META_PIXEL_SETUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                Einrichtungsanleitung
                <ExternalLink className="size-3" />
              </a>
            </div>
          ) : null}

          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {[
              {
                key: "hasWebsite" as const,
                label: "Bestehende Website",
                sub: "Sie haben bereits eine aktive Website",
              },
              {
                key: "hasGoogleAnalytics" as const,
                label: "Google Analytics",
                sub: "Besuchertracking ist eingerichtet",
              },
              {
                key: "hasSearchConsole" as const,
                label: "Google Search Console",
                sub: "Suchperformance wird überwacht",
              },
            ].map(({ key, label, sub }) => (
              <div key={key} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
                <Switch
                  checked={form[key]}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, [key]: checked }))
                  }
                />
              </div>
            ))}
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Wird gespeichert…
              </>
            ) : (
              "Änderungen speichern"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
