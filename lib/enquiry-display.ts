export type EnquiryStatusValue = "NEW" | "READ" | "ARCHIVED";

export const ENQUIRY_STATUS_OPTIONS: EnquiryStatusValue[] = [
  "NEW",
  "READ",
  "ARCHIVED",
];

export function enquiryStatusLabel(status: EnquiryStatusValue): string {
  switch (status) {
    case "NEW":
      return "New";
    case "READ":
      return "Read";
    case "ARCHIVED":
      return "Archived";
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
  return new Date(value).toLocaleDateString(undefined, {
    timeZone,
    dateStyle: "medium",
  });
}

export function formatEnquiryReceivedAt(
  value: string,
  timeZone?: string,
): string {
  return new Date(value).toLocaleString(undefined, {
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
  return String(value);
}
