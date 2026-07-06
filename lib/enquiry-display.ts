export type EnquiryStatusValue = "NEW" | "READ" | "ARCHIVED";

export const ENQUIRY_STATUS_OPTIONS: EnquiryStatusValue[] = [
  "NEW",
  "READ",
  "ARCHIVED",
];

export function enquiryStatusLabel(status: EnquiryStatusValue): string {
  switch (status) {
    case "NEW":
      return "Neu";
    case "READ":
      return "Gelesen";
    case "ARCHIVED":
      return "Archiviert";
    default:
      return status;
  }
}

export function enquiryStatusBadgeVariant(
  status: EnquiryStatusValue,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "NEW":
      return "default";
    case "READ":
      return "secondary";
    case "ARCHIVED":
      return "outline";
    default:
      return "outline";
  }
}

export function formatEnquiryDate(
  value: string,
  timeZone?: string,
): string {
  return new Date(value).toLocaleDateString("de-CH", {
    timeZone,
    dateStyle: "medium",
  });
}

export function formatEnquiryReceivedAt(
  value: string,
  timeZone?: string,
): string {
  return new Date(value).toLocaleString("de-CH", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function enquiryDisplayValue(value: unknown): string {
  if (value == null || value === "") {
    return "—";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "Ja" : "Nein";
  }
  if (Array.isArray(value)) {
    return value.map((item) => enquiryDisplayValue(item)).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
