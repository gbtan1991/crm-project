import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { buildEnquiryPayloadSchema } from "@/lib/validation/form";
import type { EnquiryStatus } from "@/lib/generated/prisma/client";
import type { CustomerOption } from "@/lib/customers";

export type EnquiryListRow = {
  id: string;
  formId: string;
  formName: string;
  status: EnquiryStatus;
  data: Record<string, unknown>;
  title: string;
  excerpt: string | null;
  preview: string;
  customer: CustomerOption | null;
  createdAt: string;
  updatedAt: string;
};

function enquiryTitle(data: Record<string, unknown>): string {
  if (typeof data.name === "string" && data.name.trim()) {
    return data.name.trim();
  }
  if (typeof data.email === "string" && data.email.trim()) {
    return data.email.trim();
  }
  return "New enquiry";
}

function enquiryExcerpt(data: Record<string, unknown>): string | null {
  for (const key of ["description", "message", "notes"] as const) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function enquiryPreview(data: Record<string, unknown>): string {
  const title = enquiryTitle(data);
  const excerpt = enquiryExcerpt(data);

  if (excerpt) {
    return `${title} — ${excerpt.slice(0, 120)}`;
  }

  return title;
}

function serializeEnquiry(enquiry: {
  id: string;
  formId: string;
  status: EnquiryStatus;
  data: unknown;
  createdAt: Date;
  updatedAt: Date;
  form: { name: string };
  customer: CustomerOption | null;
}): EnquiryListRow {
  const data =
    enquiry.data && typeof enquiry.data === "object" && !Array.isArray(enquiry.data)
      ? (enquiry.data as Record<string, unknown>)
      : {};

  return {
    id: enquiry.id,
    formId: enquiry.formId,
    formName: enquiry.form.name,
    status: enquiry.status,
    data,
    title: enquiryTitle(data),
    excerpt: enquiryExcerpt(data),
    preview: enquiryPreview(data),
    customer: enquiry.customer,
    createdAt: enquiry.createdAt.toISOString(),
    updatedAt: enquiry.updatedAt.toISOString(),
  };
}

export async function listEnquiriesForBusiness(
  businessId: string,
  options: { status?: EnquiryStatus | "ALL"; limit?: number } = {},
) {
  const enquiries = await prisma.enquiry.findMany({
    where: {
      businessId,
      ...(options.status && options.status !== "ALL"
        ? { status: options.status }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options.limit,
    include: {
      form: { select: { name: true } },
      customer: {
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return enquiries.map(serializeEnquiry);
}

export async function getEnquiryForBusiness(
  businessId: string,
  enquiryId: string,
) {
  const enquiry = await prisma.enquiry.findFirst({
    where: { id: enquiryId, businessId },
    include: {
      form: { select: { name: true } },
      customer: {
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return enquiry ? serializeEnquiry(enquiry) : null;
}

export async function createEnquiryFromWebhook(
  webhookToken: string,
  payload: unknown,
) {
  const form = await prisma.form.findFirst({
    where: { webhookToken, isActive: true },
    include: {
      fields: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!form) {
    return { error: "Formular nicht gefunden oder inaktiv." as const };
  }

  const schema = buildEnquiryPayloadSchema(form.fields);
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Ungültige Anfragedaten.",
    } as const;
  }

  const data = Object.fromEntries(
    Object.entries(parsed.data).map(([key, value]) => [
      key,
      value === "" ? null : value,
    ]),
  ) as Prisma.InputJsonValue;

  const enquiry = await prisma.enquiry.create({
    data: {
      businessId: form.businessId,
      formId: form.id,
      data,
    },
    include: {
      form: { select: { name: true } },
      customer: {
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return { enquiry: serializeEnquiry(enquiry) };
}

export async function createEnquiryForBusiness(
  businessId: string,
  formId: string,
  payload: unknown,
) {
  const form = await prisma.form.findFirst({
    where: { id: formId, businessId, isActive: true },
    include: {
      fields: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!form) {
    return { error: "Formular nicht gefunden oder inaktiv." as const };
  }

  const schema = buildEnquiryPayloadSchema(form.fields, { includeJsonFields: false });
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Ungültige Anfragedaten.",
    } as const;
  }

  const data = Object.fromEntries(
    Object.entries(parsed.data).map(([key, value]) => [
      key,
      value === "" ? null : value,
    ]),
  ) as Prisma.InputJsonValue;

  const enquiry = await prisma.enquiry.create({
    data: {
      businessId,
      formId: form.id,
      data,
    },
    include: {
      form: { select: { name: true } },
      customer: {
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return { enquiry: serializeEnquiry(enquiry) };
}

export async function updateEnquiryForBusiness(
  businessId: string,
  enquiryId: string,
  input: { status?: EnquiryStatus; customerId?: string | null },
) {
  const existing = await prisma.enquiry.findFirst({
    where: { id: enquiryId, businessId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, businessId },
      select: { id: true },
    });
    if (!customer) {
      return { error: "Kunde nicht gefunden." as const };
    }
  }

  const enquiry = await prisma.enquiry.update({
    where: { id: enquiryId },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
    },
    include: {
      form: { select: { name: true } },
      customer: {
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return serializeEnquiry(enquiry);
}

export async function deleteEnquiryForBusiness(
  businessId: string,
  enquiryId: string,
) {
  const existing = await prisma.enquiry.findFirst({
    where: { id: enquiryId, businessId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  await prisma.enquiry.delete({ where: { id: enquiryId } });
  return { id: enquiryId };
}

export async function countEnquiriesForBusiness(
  businessId: string,
  status?: EnquiryStatus,
) {
  return prisma.enquiry.count({
    where: {
      businessId,
      ...(status ? { status } : {}),
    },
  });
}
