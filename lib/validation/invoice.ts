import { z } from "zod";

export const invoiceStatusSchema = z.enum([
  "DRAFT",
  "OPEN",
  "PAID",
  "OVERDUE",
  "CANCELLED",
]);

export const invoiceTemplateServiceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Service name is required.").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  defaultUnitPrice: z.coerce.number().min(0).optional().nullable(),
  defaultQuantity: z.coerce.number().positive().default(1),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const invoiceTemplateWriteSchema = z.object({
  name: z.string().trim().min(1, "Template name is required.").max(100),
  defaultTitle: z.string().trim().max(200).optional().or(z.literal("")),
  defaultNotes: z.string().trim().max(5000).optional().or(z.literal("")),
  dueDays: z.coerce.number().int().min(1).max(365).default(30),
  vatRate: z.coerce.number().min(0).max(100).optional(),
  currency: z.string().trim().length(3).optional(),
  services: z
    .array(invoiceTemplateServiceSchema)
    .min(1, "Add at least one service."),
});

export const invoiceLineItemWriteSchema = z.object({
  templateServiceId: z.string().uuid().optional().nullable(),
  description: z.string().trim().min(1, "Description is required.").max(500),
  quantity: z.coerce.number().positive("Quantity must be greater than zero."),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

function isValidInvoiceDateValue(value: string): boolean {
  const date = parseInvoiceDate(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? date.toISOString().slice(0, 10) === value
    : true;
}

const invoiceDateSchema = z
  .string()
  .min(1, "Date is required.")
  .refine(isValidInvoiceDateValue, {
    message: "Enter a valid invoice date.",
  });

const invoiceWriteBaseSchema = z.object({
  customerId: z.string().uuid(),
  templateId: z.string().uuid(),
  title: z.string().trim().max(200).optional().or(z.literal("")),
  issueDate: invoiceDateSchema,
  dueDate: invoiceDateSchema,
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  lineItems: z
    .array(invoiceLineItemWriteSchema)
    .min(1, "Add at least one line item."),
});

export const invoiceWriteSchema = invoiceWriteBaseSchema
  .refine(
    (input) => parseInvoiceDate(input.dueDate) >= parseInvoiceDate(input.issueDate),
    {
      message: "Due date cannot be before issue date.",
      path: ["dueDate"],
    },
  );

export const invoiceUpdateSchema = invoiceWriteBaseSchema
  .partial()
  .extend({
    status: invoiceStatusSchema.optional(),
  })
  .refine(
    (input) =>
      !input.issueDate ||
      !input.dueDate ||
      parseInvoiceDate(input.dueDate) >= parseInvoiceDate(input.issueDate),
    {
      message: "Due date cannot be before issue date.",
      path: ["dueDate"],
    },
  );

export type InvoiceTemplateWriteInput = z.infer<typeof invoiceTemplateWriteSchema>;
export type InvoiceWriteInput = z.infer<typeof invoiceWriteSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;

export function normalizeInvoiceTemplateInput(input: InvoiceTemplateWriteInput) {
  const emptyToNull = (value?: string) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };

  return {
    name: input.name.trim(),
    defaultTitle: emptyToNull(input.defaultTitle),
    defaultNotes: emptyToNull(input.defaultNotes),
    dueDays: input.dueDays ?? 30,
    vatRate: input.vatRate ?? 8.1,
    currency: input.currency?.trim().toUpperCase() || "CHF",
    services: input.services.map((service, index) => ({
      id: service.id,
      name: service.name.trim(),
      description: service.description?.trim() || null,
      defaultUnitPrice:
        service.defaultUnitPrice == null ? null : service.defaultUnitPrice,
      defaultQuantity: service.defaultQuantity,
      sortOrder: service.sortOrder ?? index,
    })),
  };
}

export function parseInvoiceDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }
  return new Date(value);
}
