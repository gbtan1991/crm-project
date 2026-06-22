export type InvoiceLineTotalsInput = {
  quantity: number;
  unitPrice: number;
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function calculateLineTotal(quantity: number, unitPrice: number): number {
  return roundMoney(quantity * unitPrice);
}

export function calculateInvoiceTotals(
  lineItems: InvoiceLineTotalsInput[],
  vatRate: number,
) {
  const subtotal = roundMoney(
    lineItems.reduce(
      (sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice),
      0,
    ),
  );
  const vatAmount = roundMoney(subtotal * (vatRate / 100));
  const total = roundMoney(subtotal + vatAmount);

  return { subtotal, vatAmount, total };
}

export function formatMoney(
  amount: number,
  currency = "CHF",
  locale = "de-CH",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function decimalToNumber(value: { toString(): string } | number | null): number {
  if (value == null) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  return Number(value.toString());
}
