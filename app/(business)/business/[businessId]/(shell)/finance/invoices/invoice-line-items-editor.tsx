"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateInvoiceTotals,
  calculateLineTotal,
  formatMoney,
} from "@/lib/invoice-money";

export type InvoiceLineItemDraft = {
  key: string;
  templateServiceId?: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
};

export function emptyInvoiceLineItem(): InvoiceLineItemDraft {
  return {
    key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    templateServiceId: null,
    description: "",
    quantity: "1",
    unitPrice: "",
  };
}

export function invoiceLineItemsToDraft(
  items: Array<{
    id: string;
    templateServiceId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
  }>,
): InvoiceLineItemDraft[] {
  return items.map((item) => ({
    key: item.id,
    templateServiceId: item.templateServiceId ?? null,
    description: item.description,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
  }));
}

export function buildInvoiceLineItemPayload(lines: InvoiceLineItemDraft[]) {
  return lines.map((line, index) => ({
    templateServiceId: line.templateServiceId ?? null,
    description: line.description.trim(),
    quantity: Number(line.quantity),
    unitPrice: Number(line.unitPrice),
    sortOrder: index,
  }));
}

export function validateInvoiceLineItems(lines: InvoiceLineItemDraft[]): string | null {
  if (lines.length === 0) {
    return "Fügen Sie mindestens eine Position hinzu.";
  }

  for (const line of lines) {
    if (!line.description.trim()) {
      return "Jede Position benötigt eine Beschreibung.";
    }
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return "Jede Position benötigt eine gültige Menge.";
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return "Jede Position benötigt einen gültigen Einzelpreis.";
    }
  }

  return null;
}

export function InvoiceLineItemsEditor({
  lines,
  currency,
  vatRate,
  onChange,
}: {
  lines: InvoiceLineItemDraft[];
  currency: string;
  vatRate: number;
  onChange: (lines: InvoiceLineItemDraft[]) => void;
}) {
  function updateLine(key: string, patch: Partial<InvoiceLineItemDraft>) {
    onChange(
      lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(key: string) {
    onChange(lines.filter((line) => line.key !== key));
  }

  function addLine() {
    onChange([...lines, emptyInvoiceLineItem()]);
  }

  const parsedLines = lines
    .map((line) => ({
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
    }))
    .filter(
      (line) =>
        Number.isFinite(line.quantity) &&
        line.quantity > 0 &&
        Number.isFinite(line.unitPrice) &&
        line.unitPrice >= 0,
    );

  const totals = calculateInvoiceTotals(parsedLines, vatRate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Add as many line items as you need.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={addLine}>
          <Plus className="size-4" />
          Add line item
        </Button>
      </div>

      {lines.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No line items yet. Add one to continue.
        </div>
      ) : (
        lines.map((line) => {
          const quantity = Number(line.quantity);
          const unitPrice = Number(line.unitPrice);
          const lineTotal =
            Number.isFinite(quantity) && Number.isFinite(unitPrice)
              ? calculateLineTotal(quantity, unitPrice)
              : 0;

          return (
            <div
              key={line.key}
              className="rounded-lg border border-border p-4"
            >
              <div className="mb-3 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length === 1}
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Beschreibung</Label>
                  <Input
                    value={line.description}
                    onChange={(event) =>
                      updateLine(line.key, { description: event.target.value })
                    }
                    placeholder="e.g. Website design"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Menge</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(line.key, { quantity: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Einzelpreis</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(event) =>
                      updateLine(line.key, { unitPrice: event.target.value })
                    }
                  />
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Line total: {formatMoney(lineTotal, currency)}
              </p>
            </div>
          );
        })
      )}

      <div className="space-y-2 rounded-lg bg-muted/40 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Zwischensumme</span>
          <span>{formatMoney(totals.subtotal, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">MwSt. ({vatRate}%)</span>
          <span>{formatMoney(totals.vatAmount, currency)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
          <span>Total</span>
          <span>{formatMoney(totals.total, currency)}</span>
        </div>
      </div>
    </div>
  );
}
