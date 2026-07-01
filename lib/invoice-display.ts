export type InvoiceStatusValue =
  | "DRAFT"
  | "OPEN"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export function invoiceStatusLabel(status: InvoiceStatusValue): string {
  switch (status) {
    case "DRAFT":
      return "Entwurf";
    case "OPEN":
      return "Offen";
    case "PAID":
      return "Bezahlt";
    case "OVERDUE":
      return "Überfällig";
    case "CANCELLED":
      return "Storniert";
    default:
      return status;
  }
}

export function invoiceStatusBadgeVariant(
  status: InvoiceStatusValue,
): "default" | "secondary" | "success" | "destructive" | "outline" {
  switch (status) {
    case "DRAFT":
      return "secondary";
    case "OPEN":
      return "default";
    case "PAID":
      return "success";
    case "OVERDUE":
      return "destructive";
    case "CANCELLED":
      return "outline";
    default:
      return "outline";
  }
}

export function formatInvoiceDate(
  value: string,
  timeZone?: string,
): string {
  return new Date(value).toLocaleDateString("de-CH", {
    timeZone,
    dateStyle: "medium",
  });
}

export function toDateInputValue(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

export function defaultDueDate(issueDate = new Date(), days = 30): string {
  const due = new Date(issueDate);
  due.setUTCDate(due.getUTCDate() + days);
  return toDateInputValue(due);
}

export function dueDateFromIssue(issueDate: string, dueDays: number): string {
  const [year, month, day] = issueDate.split("-").map(Number);
  const due = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  due.setUTCDate(due.getUTCDate() + dueDays);
  return toDateInputValue(due);
}
