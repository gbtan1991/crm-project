import { z } from "zod";

import type { Prisma } from "@/lib/generated/prisma/client";
import {
  CustomerSource,
  CustomerStatus,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type EnquiryFormField = {
  key: string;
  type: string;
};

type CustomerPatch = {
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  notes: string | null;
};

function readString(data: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function isValidEmail(value: string): boolean {
  return z.string().trim().email().safeParse(value).success;
}

export function extractEnquiryEmail(
  data: Record<string, unknown>,
  fields: EnquiryFormField[],
): string | null {
  const direct = readString(data, ["email"]);
  if (direct && isValidEmail(direct)) {
    return direct.toLowerCase();
  }

  const emailField = fields.find((field) => field.type === "EMAIL");
  if (emailField) {
    const value = readString(data, [emailField.key]);
    if (value && isValidEmail(value)) {
      return value.toLowerCase();
    }
  }

  return null;
}

export function buildCustomerPatchFromEnquiry(
  data: Record<string, unknown>,
): CustomerPatch {
  const companyName = readString(data, ["companyName", "company_name", "company"]);
  const phone = readString(data, ["phone", "telefon", "tel"]);
  const address = readString(data, ["address"]);
  const postalCode = readString(data, ["postalCode", "postal_code", "zip"]);
  const city = readString(data, ["city"]);
  const notes = readString(data, ["description", "message", "notes"]);

  let firstName = readString(data, ["firstName", "first_name"]);
  let lastName = readString(data, ["lastName", "last_name"]);
  const fullName = readString(data, ["name", "full_name", "customer_name"]);

  if (!firstName && !lastName && fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    firstName = parts[0] ?? null;
    lastName = parts.slice(1).join(" ") || null;
  }

  return {
    companyName,
    firstName,
    lastName,
    phone,
    address,
    postalCode,
    city,
    notes,
  };
}

function mergeMissingCustomerFields(
  existing: {
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    notes: string | null;
  },
  patch: CustomerPatch,
): Prisma.CustomerUpdateInput {
  const update: Prisma.CustomerUpdateInput = {};
  const fields = [
    "companyName",
    "firstName",
    "lastName",
    "phone",
    "address",
    "postalCode",
    "city",
    "notes",
  ] as const;

  for (const field of fields) {
    const current = existing[field];
    const next = patch[field];
    if (!current?.trim() && next) {
      update[field] = next;
    }
  }

  return update;
}

export async function findOrCreateCustomerFromEnquiry(
  businessId: string,
  data: Record<string, unknown>,
  fields: EnquiryFormField[],
  tx: Prisma.TransactionClient = prisma,
) {
  const email = extractEnquiryEmail(data, fields);
  if (!email) {
    return null;
  }

  const patch = buildCustomerPatchFromEnquiry(data);

  const existing = await tx.customer.findUnique({
    where: {
      businessId_email: { businessId, email },
    },
  });

  if (existing) {
    const update = mergeMissingCustomerFields(existing, patch);
    if (Object.keys(update).length === 0) {
      return existing;
    }

    return tx.customer.update({
      where: { id: existing.id },
      data: update,
    });
  }

  return tx.customer.create({
    data: {
      businessId,
      email,
      companyName: patch.companyName,
      firstName: patch.firstName,
      lastName: patch.lastName,
      phone: patch.phone,
      address: patch.address,
      postalCode: patch.postalCode,
      city: patch.city,
      notes: patch.notes,
      source: CustomerSource.ENQUIRY,
      status: CustomerStatus.ACTIVE,
    },
  });
}
