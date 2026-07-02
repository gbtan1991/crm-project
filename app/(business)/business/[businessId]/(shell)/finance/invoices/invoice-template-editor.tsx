"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ServiceDraft = {
  key: string;
  id?: string;
  name: string;
  description: string;
  defaultUnitPrice: string;
  defaultQuantity: string;
};

type TemplateDraft = {
  name: string;
  defaultTitle: string | null;
  defaultNotes: string | null;
  dueDays: number;
  vatRate: number;
  currency: string;
  services: Array<{
    id?: string;
    name: string;
    description?: string | null;
    defaultUnitPrice?: number | null;
    defaultQuantity?: number;
  }>;
};

function toDraft(services: TemplateDraft["services"]): ServiceDraft[] {
  return services.map((service, index) => ({
    key: service.id ?? `new-${index}`,
    id: service.id,
    name: service.name,
    description: service.description ?? "",
    defaultUnitPrice:
      service.defaultUnitPrice == null ? "" : String(service.defaultUnitPrice),
    defaultQuantity: String(service.defaultQuantity ?? 1),
  }));
}

export function InvoiceTemplateEditor({
  businessId,
  templateId,
  initialTemplate,
  onCancel,
  onSaved,
}: {
  businessId: string;
  templateId?: string;
  initialTemplate: TemplateDraft;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initialTemplate.name);
  const [defaultTitle, setDefaultTitle] = useState(
    initialTemplate.defaultTitle ?? "",
  );
  const [defaultNotes, setDefaultNotes] = useState(
    initialTemplate.defaultNotes ?? "",
  );
  const [dueDays, setDueDays] = useState(String(initialTemplate.dueDays));
  const [vatRate, setVatRate] = useState(String(initialTemplate.vatRate));
  const [currency, setCurrency] = useState(initialTemplate.currency);
  const [services, setServices] = useState(() => toDraft(initialTemplate.services));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addService() {
    setServices((current) => [
      ...current,
      {
        key: `new-${Date.now()}`,
        name: "",
        description: "",
        defaultUnitPrice: "",
        defaultQuantity: "1",
      },
    ]);
  }

  function updateService(key: string, patch: Partial<ServiceDraft>) {
    setServices((current) =>
      current.map((service) =>
        service.key === key ? { ...service, ...patch } : service,
      ),
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const payloadServices = services.map((service, index) => ({
      id: service.id,
      name: service.name.trim(),
      description: service.description.trim(),
      defaultUnitPrice: service.defaultUnitPrice
        ? Number(service.defaultUnitPrice)
        : null,
      defaultQuantity: Number(service.defaultQuantity || 1),
      sortOrder: index,
    }));

    if (!name.trim()) {
      setError("Vorlagenname ist erforderlich.");
      return;
    }

    if (payloadServices.length === 0) {
      setError("Fügen Sie mindestens eine Leistung hinzu.");
      return;
    }

    for (const service of payloadServices) {
      if (!service.name) {
        setError("Jede Leistung benötigt einen Namen.");
        return;
      }
      if (!Number.isFinite(service.defaultQuantity) || service.defaultQuantity <= 0) {
        setError("Jede Leistung benötigt eine gültige Standardmenge.");
        return;
      }
      if (
        service.defaultUnitPrice != null &&
        (!Number.isFinite(service.defaultUnitPrice) || service.defaultUnitPrice < 0)
      ) {
        setError("Standard-Einzelpreise dürfen nicht negativ sein.");
        return;
      }
    }

    const parsedVat = Number(vatRate);
    const parsedDueDays = Number(dueDays);
    if (!Number.isFinite(parsedVat) || parsedVat < 0 || parsedVat > 100) {
      setError("Der MwSt.-Satz muss zwischen 0 und 100 liegen.");
      return;
    }
    if (!Number.isFinite(parsedDueDays) || parsedDueDays < 1 || parsedDueDays > 365) {
      setError("Zahlungsziel muss zwischen 1 und 365 Tagen liegen.");
      return;
    }

    setSubmitting(true);

    try {
      const url = templateId
        ? `/api/business/${businessId}/invoice-templates/${templateId}`
        : `/api/business/${businessId}/invoice-templates`;
      const res = await fetch(url, {
        method: templateId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          defaultTitle,
          defaultNotes,
          dueDays: parsedDueDays,
          vatRate: parsedVat,
          currency,
          services: payloadServices,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Vorlage konnte nicht gespeichert werden.");
      }

      toast.success(templateId ? "Vorlage aktualisiert." : "Vorlage erstellt.");
      onSaved();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Vorlage konnte nicht gespeichert werden.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-heading text-xl font-bold">
            {templateId ? "Vorlage bearbeiten" : "Neue Vorlage"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Leistungen, MwSt. und Standardwerte für neue Rechnungen.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Wird gespeichert…
              </>
            ) : (
              "Vorlage speichern"
            )}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vorlagendetails</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="templateName">Vorlagenname</Label>
            <Input
              id="templateName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="z. B. Gartenpflege"
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="defaultTitle">Standard-Rechnungstitel (freiwillig)</Label>
            <Input
              id="defaultTitle"
              value={defaultTitle}
              onChange={(event) => setDefaultTitle(event.target.value)}
              placeholder="Wird beim Erstellen einer Rechnung vorausgefüllt"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vatRate">MwSt.-Satz (%)</Label>
            <Input
              id="vatRate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={vatRate}
              onChange={(event) => setVatRate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Währung</Label>
            <Input
              id="currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              maxLength={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDays">Zahlungsziel (Tage)</Label>
            <Input
              id="dueDays"
              type="number"
              min="1"
              max="365"
              value={dueDays}
              onChange={(event) => setDueDays(event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="defaultNotes">Standardnotizen (freiwillig)</Label>
            <Textarea
              id="defaultNotes"
              value={defaultNotes}
              onChange={(event) => setDefaultNotes(event.target.value)}
              rows={3}
              placeholder="Wird auf neuen Rechnungen aus dieser Vorlage vorausgefüllt"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Leistungen</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addService}>
            <Plus className="size-4" />
            Leistung hinzufügen
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.map((service) => (
            <div
              key={service.key}
              className="rounded-lg border border-border p-4"
            >
              <div className="mb-3 flex justify-end">
                {services.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setServices((current) =>
                        current.filter((item) => item.key !== service.key),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                    Entfernen
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Leistungsname</Label>
                  <Input
                    value={service.name}
                    onChange={(event) =>
                      updateService(service.key, { name: event.target.value })
                    }
                    placeholder="z. B. Rasenmähen"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Standard-Einzelpreis (freiwillig)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={service.defaultUnitPrice}
                    onChange={(event) =>
                      updateService(service.key, {
                        defaultUnitPrice: event.target.value,
                      })
                    }
                    placeholder="Empfohlener Preis pro Einheit"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Beschreibung</Label>
                  <Textarea
                    value={service.description}
                    onChange={(event) =>
                      updateService(service.key, {
                        description: event.target.value,
                      })
                    }
                    rows={2}
                    placeholder="Wird auf Rechnungspositionen angezeigt"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Standardmenge</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    value={service.defaultQuantity}
                    onChange={(event) =>
                      updateService(service.key, {
                        defaultQuantity: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </form>
  );
}
