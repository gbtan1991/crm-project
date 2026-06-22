import { CustomerSource } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  customerWriteSchema,
  normalizeCustomerInput,
} from "@/lib/validation/customer";

const MAX_IMPORT_ROWS = 500;

type CustomerImportField =
  | "companyName"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "address"
  | "postalCode"
  | "city"
  | "status"
  | "notes";

const HEADER_ALIASES: Record<CustomerImportField, string[]> = {
  companyName: ["companyname", "company", "firma", "firmenname"],
  firstName: ["firstname", "first", "vorname", "first_name"],
  lastName: ["lastname", "last", "nachname", "surname", "last_name", "name"],
  email: ["email", "e-mail", "e_mail", "mail"],
  phone: ["phone", "telefon", "tel", "telephone"],
  address: ["address", "adresse", "strasse", "street"],
  postalCode: ["postalcode", "postal", "postcode", "zip", "plz"],
  city: ["city", "ort", "stadt"],
  status: ["status"],
  notes: ["notes", "notizen", "note"],
};

export type CustomerImportResult = {
  created: number;
  skippedDuplicates: number;
  skippedEmpty: number;
  failed: number;
  totalRows: number;
  errors: string[];
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]/g, "");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((csvRow) => csvRow.some((value) => value.trim()));
}

function mapHeaders(headers: string[]) {
  const normalizedHeaders = headers.map(normalizeHeader);
  const map = new Map<CustomerImportField, number>();

  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<
    [CustomerImportField, string[]]
  >) {
    const index = normalizedHeaders.findIndex((header) =>
      aliases.map(normalizeHeader).includes(header),
    );
    if (index >= 0) {
      map.set(field, index);
    }
  }

  return map;
}

function readField(
  row: string[],
  headerMap: Map<CustomerImportField, number>,
  field: CustomerImportField,
): string | undefined {
  const index = headerMap.get(field);
  if (index == null) {
    return undefined;
  }
  return row[index]?.trim();
}

function normalizeStatus(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (["active", "aktiv", "actif"].includes(normalized)) {
    return "ACTIVE";
  }
  if (["inactive", "inaktiv", "disabled", "archived"].includes(normalized)) {
    return "INACTIVE";
  }
  return value;
}

export async function importCustomersFromCsv(
  businessId: string,
  csvText: string,
): Promise<CustomerImportResult> {
  const rows = parseCsv(csvText);
  const [headers, ...dataRows] = rows;
  const result: CustomerImportResult = {
    created: 0,
    skippedDuplicates: 0,
    skippedEmpty: 0,
    failed: 0,
    totalRows: dataRows.length,
    errors: [],
  };

  if (!headers || headers.length === 0) {
    result.errors.push("CSV is missing a header row.");
    return result;
  }

  if (dataRows.length > MAX_IMPORT_ROWS) {
    result.errors.push(`Import up to ${MAX_IMPORT_ROWS} customers at a time.`);
    result.failed = dataRows.length;
    return result;
  }

  const headerMap = mapHeaders(headers);
  if (!headerMap.has("email")) {
    result.errors.push("CSV must include an email column.");
    result.failed = dataRows.length;
    return result;
  }

  const normalizedRows: ReturnType<typeof normalizeCustomerInput>[] = [];

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const input = {
      companyName: readField(row, headerMap, "companyName") ?? "",
      firstName: readField(row, headerMap, "firstName") ?? "",
      lastName: readField(row, headerMap, "lastName") ?? "",
      email: readField(row, headerMap, "email") ?? "",
      phone: readField(row, headerMap, "phone") ?? "",
      address: readField(row, headerMap, "address") ?? "",
      postalCode: readField(row, headerMap, "postalCode") ?? "",
      city: readField(row, headerMap, "city") ?? "",
      status: normalizeStatus(readField(row, headerMap, "status")),
      notes: readField(row, headerMap, "notes") ?? "",
    };

    if (Object.values(input).every((value) => !String(value ?? "").trim())) {
      result.skippedEmpty += 1;
      return;
    }

    const parsed = customerWriteSchema.safeParse(input);
    if (!parsed.success) {
      result.failed += 1;
      result.errors.push(
        `Row ${rowNumber}: ${parsed.error.issues[0]?.message ?? "Invalid row."}`,
      );
      return;
    }

    normalizedRows.push(normalizeCustomerInput(parsed.data));
  });

  if (normalizedRows.length === 0) {
    return result;
  }

  const emails = normalizedRows.map((row) => row.email);
  const existingCustomers = await prisma.customer.findMany({
    where: { businessId, email: { in: emails } },
    select: { email: true },
  });
  const seenEmails = new Set(existingCustomers.map((customer) => customer.email));
  const rowsToCreate = [];

  for (const row of normalizedRows) {
    if (seenEmails.has(row.email)) {
      result.skippedDuplicates += 1;
      continue;
    }
    seenEmails.add(row.email);
    rowsToCreate.push(row);
  }

  if (rowsToCreate.length === 0) {
    return result;
  }

  const created = await prisma.customer.createMany({
    data: rowsToCreate.map((row) => ({
      businessId,
      ...row,
      source: CustomerSource.MANUAL,
    })),
    skipDuplicates: true,
  });

  result.created = created.count;
  result.skippedDuplicates += rowsToCreate.length - created.count;

  return result;
}
