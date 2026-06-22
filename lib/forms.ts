import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import type { FormWriteInput } from "@/lib/validation/form";

export type FormFieldRow = {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string | null;
  sortOrder: number;
};

export type FormRow = {
  id: string;
  name: string;
  webhookToken: string;
  isActive: boolean;
  fields: FormFieldRow[];
  enquiryCount: number;
  createdAt: string;
  updatedAt: string;
};

const formInclude = {
  fields: { orderBy: { sortOrder: "asc" as const } },
  _count: { select: { enquiries: true } },
} as const;

function serializeFormField(field: {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string | null;
  sortOrder: number;
}): FormFieldRow {
  return {
    id: field.id,
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required,
    placeholder: field.placeholder,
    sortOrder: field.sortOrder,
  };
}

function serializeForm(form: {
  id: string;
  name: string;
  webhookToken: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  fields: Array<{
    id: string;
    key: string;
    label: string;
    type: string;
    required: boolean;
    placeholder: string | null;
    sortOrder: number;
  }>;
  _count: { enquiries: number };
}): FormRow {
  return {
    id: form.id,
    name: form.name,
    webhookToken: form.webhookToken,
    isActive: form.isActive,
    fields: form.fields.map(serializeFormField),
    enquiryCount: form._count.enquiries,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
  };
}

function normalizeFields(fields: FormWriteInput["fields"]) {
  return fields.map((field, index) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required ?? false,
    placeholder: field.placeholder || null,
    sortOrder: field.sortOrder ?? index,
  }));
}

function createWebhookToken(): string {
  return randomBytes(24).toString("hex");
}

export async function listFormsForBusiness(businessId: string) {
  const forms = await prisma.form.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    include: formInclude,
  });

  return forms.map(serializeForm);
}

export async function getFormForBusiness(businessId: string, formId: string) {
  const form = await prisma.form.findFirst({
    where: { id: formId, businessId },
    include: formInclude,
  });

  return form ? serializeForm(form) : null;
}

export async function getFormByWebhookToken(webhookToken: string) {
  const form = await prisma.form.findFirst({
    where: { webhookToken, isActive: true },
    include: {
      fields: { orderBy: { sortOrder: "asc" } },
      business: { select: { id: true, name: true } },
    },
  });

  if (!form) {
    return null;
  }

  return {
    id: form.id,
    businessId: form.businessId,
    name: form.name,
    fields: form.fields.map(serializeFormField),
  };
}

export async function createFormForBusiness(
  businessId: string,
  input: FormWriteInput,
) {
  const fields = normalizeFields(input.fields);

  const form = await prisma.form.create({
    data: {
      businessId,
      name: input.name,
      webhookToken: createWebhookToken(),
      isActive: input.isActive ?? true,
      fields: {
        create: fields,
      },
    },
    include: formInclude,
  });

  return serializeForm(form);
}

export async function updateFormForBusiness(
  businessId: string,
  formId: string,
  input: FormWriteInput,
) {
  const existing = await prisma.form.findFirst({
    where: { id: formId, businessId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const fields = normalizeFields(input.fields);

  const form = await prisma.$transaction(async (tx) => {
    await tx.formField.deleteMany({ where: { formId } });
    return tx.form.update({
      where: { id: formId },
      data: {
        name: input.name,
        isActive: input.isActive ?? true,
        fields: {
          create: fields,
        },
      },
      include: formInclude,
    });
  });

  return serializeForm(form);
}

export async function deleteFormForBusiness(businessId: string, formId: string) {
  const existing = await prisma.form.findFirst({
    where: { id: formId, businessId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  await prisma.form.delete({ where: { id: formId } });
  return { ok: true as const };
}

export async function countFormsForBusiness(businessId: string) {
  return prisma.form.count({ where: { businessId } });
}
