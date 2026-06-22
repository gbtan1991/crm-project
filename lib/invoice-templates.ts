import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/invoice-money";
import type { InvoiceTemplateWriteInput } from "@/lib/validation/invoice";
import { normalizeInvoiceTemplateInput } from "@/lib/validation/invoice";

export type InvoiceTemplateServiceRow = {
  id: string;
  name: string;
  description: string | null;
  defaultUnitPrice: number | null;
  defaultQuantity: number;
  sortOrder: number;
};

export type InvoiceTemplateRow = {
  id: string;
  name: string;
  defaultTitle: string | null;
  defaultNotes: string | null;
  dueDays: number;
  vatRate: number;
  currency: string;
  serviceCount: number;
  services: InvoiceTemplateServiceRow[];
  createdAt: string;
  updatedAt: string;
};

function serializeTemplateService(
  service: {
    id: string;
    name: string;
    description: string | null;
    defaultUnitPrice: { toString(): string } | null;
    defaultQuantity: { toString(): string };
    sortOrder: number;
  },
): InvoiceTemplateServiceRow {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    defaultUnitPrice:
      service.defaultUnitPrice == null
        ? null
        : decimalToNumber(service.defaultUnitPrice),
    defaultQuantity: decimalToNumber(service.defaultQuantity),
    sortOrder: service.sortOrder,
  };
}

function serializeTemplate(template: {
  id: string;
  name: string;
  defaultTitle: string | null;
  defaultNotes: string | null;
  dueDays: number;
  vatRate: { toString(): string };
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    defaultUnitPrice: { toString(): string } | null;
    defaultQuantity: { toString(): string };
    sortOrder: number;
  }>;
}): InvoiceTemplateRow {
  const services = template.services
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(serializeTemplateService);

  return {
    id: template.id,
    name: template.name,
    defaultTitle: template.defaultTitle,
    defaultNotes: template.defaultNotes,
    dueDays: template.dueDays,
    vatRate: decimalToNumber(template.vatRate),
    currency: template.currency,
    serviceCount: services.length,
    services,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

const templateInclude = {
  services: { orderBy: { sortOrder: "asc" as const } },
};

export async function listInvoiceTemplatesForBusiness(businessId: string) {
  const templates = await prisma.invoiceTemplate.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    include: templateInclude,
  });

  return templates.map(serializeTemplate);
}

export async function getInvoiceTemplateForBusiness(
  businessId: string,
  templateId: string,
) {
  const template = await prisma.invoiceTemplate.findFirst({
    where: { id: templateId, businessId },
    include: templateInclude,
  });

  return template ? serializeTemplate(template) : null;
}

export async function createInvoiceTemplateForBusiness(
  businessId: string,
  input: InvoiceTemplateWriteInput,
) {
  const data = normalizeInvoiceTemplateInput(input);

  const created = await prisma.invoiceTemplate.create({
    data: {
      businessId,
      name: data.name,
      defaultTitle: data.defaultTitle,
      defaultNotes: data.defaultNotes,
      dueDays: data.dueDays,
      vatRate: data.vatRate,
      currency: data.currency,
      services: {
        create: data.services.map((service) => ({
          name: service.name,
          description: service.description,
          defaultUnitPrice: service.defaultUnitPrice,
          defaultQuantity: service.defaultQuantity,
          sortOrder: service.sortOrder,
        })),
      },
    },
    include: templateInclude,
  });

  return serializeTemplate(created);
}

export async function updateInvoiceTemplateForBusiness(
  businessId: string,
  templateId: string,
  input: InvoiceTemplateWriteInput,
) {
  const data = normalizeInvoiceTemplateInput(input);
  const existing = await prisma.invoiceTemplate.findFirst({
    where: { id: templateId, businessId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const existingServices = await prisma.invoiceTemplateService.findMany({
    where: { templateId },
    select: { id: true },
  });
  const existingServiceIds = new Set(
    existingServices.map((service) => service.id),
  );
  const invalidIncomingService = data.services.find(
    (service) => service.id && !existingServiceIds.has(service.id),
  );
  if (invalidIncomingService) {
    return { error: "Template service not found." as const };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const incomingIds = new Set(
      data.services.map((service) => service.id).filter(Boolean) as string[],
    );
    const deleteIds = existingServices
      .map((service) => service.id)
      .filter((id) => !incomingIds.has(id));

    if (deleteIds.length > 0) {
      await tx.invoiceTemplateService.deleteMany({
        where: { id: { in: deleteIds }, templateId },
      });
    }

    await tx.invoiceTemplate.update({
      where: { id: templateId },
      data: {
        name: data.name,
        defaultTitle: data.defaultTitle,
        defaultNotes: data.defaultNotes,
        dueDays: data.dueDays,
        vatRate: data.vatRate,
        currency: data.currency,
      },
    });

    for (const service of data.services) {
      if (service.id) {
        await tx.invoiceTemplateService.update({
          where: { id: service.id, templateId },
          data: {
            name: service.name,
            description: service.description,
            defaultUnitPrice: service.defaultUnitPrice,
            defaultQuantity: service.defaultQuantity,
            sortOrder: service.sortOrder,
          },
        });
      } else {
        await tx.invoiceTemplateService.create({
          data: {
            templateId,
            name: service.name,
            description: service.description,
            defaultUnitPrice: service.defaultUnitPrice,
            defaultQuantity: service.defaultQuantity,
            sortOrder: service.sortOrder,
          },
        });
      }
    }

    return tx.invoiceTemplate.findUniqueOrThrow({
      where: { id: templateId },
      include: templateInclude,
    });
  });

  return serializeTemplate(updated);
}

export async function deleteInvoiceTemplateForBusiness(
  businessId: string,
  templateId: string,
) {
  const template = await prisma.invoiceTemplate.findFirst({
    where: { id: templateId, businessId },
    include: {
      _count: { select: { invoices: true } },
    },
  });

  if (!template) {
    return null;
  }

  if (template._count.invoices > 0) {
    return { error: "Templates linked to invoices cannot be deleted." as const };
  }

  await prisma.invoiceTemplate.delete({ where: { id: templateId } });

  return { ok: true as const };
}
