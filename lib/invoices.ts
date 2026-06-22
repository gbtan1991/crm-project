import { prisma } from "@/lib/prisma";
import {
  calculateInvoiceTotals,
  calculateLineTotal,
  decimalToNumber,
} from "@/lib/invoice-money";
import {
  parsePageParam,
  resolvePage,
  type Paginated,
} from "@/lib/pagination";
import {
  Prisma,
  SequenceDelayUnit,
  SequenceEnrollmentStatus,
  type InvoiceStatus,
} from "@/lib/generated/prisma/client";
import type { SendInvoiceEmailInput } from "@/lib/validation/message";
import {
  parseInvoiceDate,
  type InvoiceUpdateInput,
  type InvoiceWriteInput,
} from "@/lib/validation/invoice";

export const INVOICE_PAGE_SIZE = 20;

export type InvoiceLineItemRow = {
  id: string;
  templateServiceId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
};

export type InvoiceListRow = {
  id: string;
  number: string;
  title: string | null;
  status: InvoiceStatus;
  displayStatus: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  vatAmount: number;
  total: number;
  currency: string;
  sentAt: string | null;
  paidAt: string | null;
  customer: {
    id: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  createdAt: string;
};

export type InvoiceDetailRow = InvoiceListRow & {
  notes: string | null;
  vatRate: number;
  lineItems: InvoiceLineItemRow[];
  updatedAt: string;
};

function effectiveStatus(
  status: InvoiceStatus,
  dueDate: Date,
  ref = new Date(),
): InvoiceStatus {
  if (status === "OPEN" && dueDate < ref) {
    return "OVERDUE";
  }
  return status;
}

function serializeLineItem(item: {
  id: string;
  templateServiceId: string | null;
  description: string;
  quantity: { toString(): string };
  unitPrice: { toString(): string };
  lineTotal: { toString(): string };
  sortOrder: number;
}): InvoiceLineItemRow {
  return {
    id: item.id,
    templateServiceId: item.templateServiceId,
    description: item.description,
    quantity: decimalToNumber(item.quantity),
    unitPrice: decimalToNumber(item.unitPrice),
    lineTotal: decimalToNumber(item.lineTotal),
    sortOrder: item.sortOrder,
  };
}

function serializeInvoiceListRow(invoice: {
  id: string;
  number: string;
  title: string | null;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  subtotal: { toString(): string };
  vatAmount: { toString(): string };
  total: { toString(): string };
  currency: string;
  sentAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  customer: {
    id: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}): InvoiceListRow {
  const displayStatus = effectiveStatus(invoice.status, invoice.dueDate);

  return {
    id: invoice.id,
    number: invoice.number,
    title: invoice.title,
    status: invoice.status,
    displayStatus,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    subtotal: decimalToNumber(invoice.subtotal),
    vatAmount: decimalToNumber(invoice.vatAmount),
    total: decimalToNumber(invoice.total),
    currency: invoice.currency,
    sentAt: invoice.sentAt?.toISOString() ?? null,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    customer: invoice.customer,
    createdAt: invoice.createdAt.toISOString(),
  };
}

export function serializeInvoiceDetail(invoice: {
  id: string;
  number: string;
  title: string | null;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  subtotal: { toString(): string };
  vatAmount: { toString(): string };
  total: { toString(): string };
  vatRate: { toString(): string };
  currency: string;
  notes: string | null;
  sentAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  lineItems: Array<{
    id: string;
    templateServiceId: string | null;
    description: string;
    quantity: { toString(): string };
    unitPrice: { toString(): string };
    lineTotal: { toString(): string };
    sortOrder: number;
  }>;
}): InvoiceDetailRow {
  return {
    ...serializeInvoiceListRow(invoice),
    vatRate: decimalToNumber(invoice.vatRate),
    notes: invoice.notes,
    updatedAt: invoice.updatedAt.toISOString(),
    lineItems: invoice.lineItems
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(serializeLineItem),
  };
}

export async function generateInvoiceNumber(businessId: string): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `RE-${year}-`;

  const latest = await prisma.invoice.findFirst({
    where: {
      businessId,
      number: { startsWith: prefix },
    },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  const latestSequence = latest
    ? Number.parseInt(latest.number.slice(prefix.length), 10)
    : 0;
  const next = Number.isFinite(latestSequence) ? latestSequence + 1 : 1;

  return `${prefix}${String(next).padStart(4, "0")}`;
}

function isUniqueInvoiceNumberError(error: unknown) {
  const target =
    error instanceof Prisma.PrismaClientKnownRequestError &&
    Array.isArray(error.meta?.target)
      ? error.meta.target
      : [];

  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    (target.includes("businessId") || target.includes("business_id")) &&
    target.includes("number")
  );
}

function invalidTemplateServiceIds(
  lineItems: InvoiceWriteInput["lineItems"],
  allowedServiceIds: Set<string>,
) {
  return lineItems
    .map((item) => item.templateServiceId)
    .filter(
      (id): id is string =>
        typeof id === "string" && !allowedServiceIds.has(id),
    );
}

export async function listInvoicesForBusiness(
  businessId: string,
  options: { page?: number; status?: InvoiceStatus | "ALL" } = {},
): Promise<Paginated<InvoiceListRow> & { openTotal: number }> {
  const page = options.page ?? 1;
  const status = options.status ?? "ALL";

  const where =
    status === "OVERDUE"
      ? {
          businessId,
          status: "OPEN" as const,
          dueDate: { lt: new Date() },
        }
      : {
          businessId,
          ...(status !== "ALL" ? { status } : {}),
        };

  const [total, openAgg] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.aggregate({
      where: {
        businessId,
        status: "OPEN",
      },
      _sum: { total: true },
    }),
  ]);

  const { page: resolvedPage, totalPages } = resolvePage(
    page,
    total,
    INVOICE_PAGE_SIZE,
  );

  const rows = await prisma.invoice.findMany({
    where,
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    skip: (resolvedPage - 1) * INVOICE_PAGE_SIZE,
    take: INVOICE_PAGE_SIZE,
    include: {
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

  return {
    page: resolvedPage,
    pageSize: INVOICE_PAGE_SIZE,
    total,
    totalPages,
    openTotal: decimalToNumber(openAgg._sum.total),
    rows: rows.map(serializeInvoiceListRow),
  };
}

export async function getInvoiceForBusiness(
  businessId: string,
  invoiceId: string,
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    include: {
      customer: {
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      lineItems: true,
    },
  });

  return invoice ? serializeInvoiceDetail(invoice) : null;
}

export async function listInvoicesForCustomer(
  businessId: string,
  customerId: string,
  limit = 20,
) {
  const invoices = await prisma.invoice.findMany({
    where: { businessId, customerId },
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
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

  return invoices.map(serializeInvoiceListRow);
}

function buildLineItemData(
  lineItems: InvoiceWriteInput["lineItems"],
  vatRate: number,
) {
  const totals = calculateInvoiceTotals(
    lineItems.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    vatRate,
  );

  const lineItemCreates = lineItems.map((item, index) => ({
    templateServiceId: item.templateServiceId ?? null,
    description: item.description.trim(),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: calculateLineTotal(item.quantity, item.unitPrice),
    sortOrder: item.sortOrder ?? index,
  }));

  return { totals, lineItemCreates };
}

function sequenceStepDelayMs(step: {
  delayAmount: number;
  delayUnit: SequenceDelayUnit;
}) {
  const unitMs =
    step.delayUnit === "MINUTES"
      ? 60 * 1000
      : step.delayUnit === "HOURS"
        ? 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
  return step.delayAmount * unitMs;
}

async function autoEnrollInvoiceSequence(businessId: string, invoiceId: string) {
  const sequence = await prisma.sequenceTemplate.findFirst({
    where: {
      businessId,
      type: "INVOICE",
      isActive: true,
      steps: { some: {} },
    },
    orderBy: { createdAt: "asc" },
    include: { steps: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  const firstStep = sequence?.steps[0];
  if (!sequence || !firstStep) {
    return;
  }

  await prisma.sequenceEnrollment.create({
    data: {
      businessId,
      invoiceId,
      sequenceId: sequence.id,
      status: SequenceEnrollmentStatus.ACTIVE,
      currentStepIndex: 0,
      nextRunAt: new Date(Date.now() + sequenceStepDelayMs(firstStep)),
    },
  });
}

export async function createInvoiceForBusiness(
  businessId: string,
  input: InvoiceWriteInput,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, businessId },
    select: { id: true },
  });
  if (!customer) {
    return null;
  }

  const template = await prisma.invoiceTemplate.findFirst({
    where: { id: input.templateId, businessId },
    select: {
      id: true,
      vatRate: true,
      currency: true,
      services: { select: { id: true } },
    },
  });
  if (!template) {
    return null;
  }

  const invalidServiceIds = invalidTemplateServiceIds(
    input.lineItems,
    new Set(template.services.map((service) => service.id)),
  );
  if (invalidServiceIds.length > 0) {
    return {
      error: "One or more line items reference an invalid template service." as const,
    };
  }

  const vatRate = decimalToNumber(template.vatRate);
  const { totals, lineItemCreates } = buildLineItemData(input.lineItems, vatRate);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const number = await generateInvoiceNumber(businessId);

    try {
      const invoice = await prisma.invoice.create({
        data: {
          businessId,
          customerId: input.customerId,
          templateId: template.id,
          number,
          title: input.title?.trim() || null,
          issueDate: parseInvoiceDate(input.issueDate),
          dueDate: parseInvoiceDate(input.dueDate),
          status: "DRAFT",
          vatRate,
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          total: totals.total,
          currency: template.currency,
          notes: input.notes?.trim() || null,
          lineItems: {
            create: lineItemCreates,
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              companyName: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          lineItems: true,
        },
      });

      await autoEnrollInvoiceSequence(businessId, invoice.id);

      return serializeInvoiceDetail(invoice);
    } catch (error) {
      if (isUniqueInvoiceNumberError(error) && attempt < 2) {
        continue;
      }
      throw error;
    }
  }

  return { error: "Failed to allocate invoice number. Please try again." as const };
}

export async function updateInvoiceForBusiness(
  businessId: string,
  invoiceId: string,
  input: InvoiceUpdateInput,
) {
  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    include: { lineItems: true },
  });

  if (!existing) {
    return null;
  }

  const hasStatusChange = input.status !== undefined;
  const hasDraftEdits =
    input.customerId !== undefined ||
    input.title !== undefined ||
    input.issueDate !== undefined ||
    input.dueDate !== undefined ||
    input.notes !== undefined ||
    input.lineItems !== undefined;

  if (hasStatusChange && hasDraftEdits) {
    return { error: "Update invoice details and status separately." as const };
  }

  if (hasStatusChange) {
    return updateInvoiceStatusForBusiness(businessId, invoiceId, input.status);
  }

  if (existing.status !== "DRAFT") {
    return { error: "Only draft invoices can be edited." as const };
  }

  const nextIssueDate = input.issueDate
    ? parseInvoiceDate(input.issueDate)
    : existing.issueDate;
  const nextDueDate = input.dueDate
    ? parseInvoiceDate(input.dueDate)
    : existing.dueDate;
  if (nextDueDate < nextIssueDate) {
    return { error: "Due date cannot be before issue date." as const };
  }

  const vatRate = decimalToNumber(existing.vatRate);
  const lineItems = input.lineItems ?? existing.lineItems.map((item) => ({
    templateServiceId: item.templateServiceId,
    description: item.description,
    quantity: decimalToNumber(item.quantity),
    unitPrice: decimalToNumber(item.unitPrice),
    sortOrder: item.sortOrder,
  }));

  const { totals, lineItemCreates } = buildLineItemData(lineItems, vatRate);

  if (input.lineItems) {
    if (!existing.templateId) {
      const hasTemplateServiceId = input.lineItems.some(
        (item) => item.templateServiceId,
      );
      if (hasTemplateServiceId) {
        return { error: "Line items cannot reference template services." as const };
      }
    } else {
      const services = await prisma.invoiceTemplateService.findMany({
        where: { templateId: existing.templateId },
        select: { id: true },
      });
      const invalidServiceIds = invalidTemplateServiceIds(
        input.lineItems,
        new Set(services.map((service) => service.id)),
      );
      if (invalidServiceIds.length > 0) {
        return {
          error:
            "One or more line items reference an invalid template service." as const,
        };
      }
    }
  }

  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, businessId },
      select: { id: true },
    });
    if (!customer) {
      return { error: "Customer not found." as const };
    }
  }

  const invoice = await prisma.$transaction(async (tx) => {
    await tx.invoiceLineItem.deleteMany({ where: { invoiceId } });

    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        ...(input.customerId ? { customerId: input.customerId } : {}),
        ...(input.title !== undefined
          ? { title: input.title?.trim() || null }
          : {}),
        ...(input.issueDate
          ? { issueDate: parseInvoiceDate(input.issueDate) }
          : {}),
        ...(input.dueDate ? { dueDate: parseInvoiceDate(input.dueDate) } : {}),
        ...(input.notes !== undefined
          ? { notes: input.notes?.trim() || null }
          : {}),
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        total: totals.total,
        lineItems: {
          create: lineItemCreates,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        lineItems: true,
      },
    });
  });

  return { invoice: serializeInvoiceDetail(invoice) };
}

export async function updateInvoiceStatusForBusiness(
  businessId: string,
  invoiceId: string,
  status: InvoiceStatus | undefined,
) {
  if (!status) {
    return { error: "Status is required." as const };
  }

  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    include: {
      customer: {
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      lineItems: true,
    },
  });

  if (!existing) {
    return null;
  }

  if (status === "OVERDUE") {
    return {
      error: "Overdue is calculated automatically from open invoices." as const,
    };
  }

  if (status === existing.status) {
    return { invoice: serializeInvoiceDetail(existing) };
  }

  const current = existing.status;
  const allowed =
    (current === "OPEN" && (status === "PAID" || status === "CANCELLED")) ||
    (current === "PAID" && (status === "OPEN" || status === "CANCELLED")) ||
    (current === "CANCELLED" && status === "OPEN");

  if (!allowed) {
    return { error: `Cannot change invoice from ${current} to ${status}.` };
  }

  const paidAt = status === "PAID" ? new Date() : null;
  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status, paidAt },
    include: {
      customer: {
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      lineItems: true,
    },
  });

  return { invoice: serializeInvoiceDetail(invoice) };
}

export async function sendInvoiceForBusiness(
  businessId: string,
  invoiceId: string,
  email: SendInvoiceEmailInput,
) {
  const { sendInvoiceEmailForBusiness } = await import(
    "@/lib/messages/send-invoice-email"
  );
  const result = await sendInvoiceEmailForBusiness(businessId, invoiceId, email);

  if (!result) {
    return null;
  }

  if (!result.ok) {
    return { error: result.error };
  }

  return { invoice: result.invoice, messageId: result.messageId };
}

export function parseInvoicePageParam(
  value: string | string[] | undefined,
): number {
  return parsePageParam(value);
}

export function parseInvoiceStatusParam(
  value: string | string[] | undefined,
): InvoiceStatus | "ALL" {
  const raw = Array.isArray(value) ? value[0] : value;
  if (
    raw === "DRAFT" ||
    raw === "OPEN" ||
    raw === "PAID" ||
    raw === "OVERDUE" ||
    raw === "CANCELLED"
  ) {
    return raw;
  }
  return "ALL";
}
