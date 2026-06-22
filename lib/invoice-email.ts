import { formatCustomerName } from "@/lib/customer-display";
import {
  invoiceStatusLabel,
  type InvoiceStatusValue,
} from "@/lib/invoice-display";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { getInvoiceForBusiness } from "@/lib/invoices";
import { prisma } from "@/lib/prisma";

export async function buildInvoicePdfForBusiness(
  businessId: string,
  invoiceId: string,
): Promise<{ pdf: ArrayBuffer; filename: string } | null> {
  const [business, invoice] = await Promise.all([
    prisma.business.findFirst({
      where: { id: businessId },
      select: {
        name: true,
        config: {
          select: {
            address: true,
            postalCode: true,
            city: true,
            businessEmail: true,
            phone: true,
            taxId: true,
          },
        },
      },
    }),
    getInvoiceForBusiness(businessId, invoiceId),
  ]);

  if (!business || !invoice) {
    return null;
  }

  const customer = await prisma.customer.findFirst({
    where: { id: invoice.customer.id, businessId },
    select: {
      companyName: true,
      firstName: true,
      lastName: true,
      email: true,
      address: true,
      postalCode: true,
      city: true,
    },
  });

  if (!customer) {
    return null;
  }

  const pdf = generateInvoicePdf(
    {
      name: business.name,
      address: business.config?.address,
      postalCode: business.config?.postalCode,
      city: business.config?.city,
      email: business.config?.businessEmail,
      phone: business.config?.phone,
      taxId: business.config?.taxId,
    },
    {
      number: invoice.number,
      title: invoice.title,
      displayStatus: invoice.displayStatus,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      subtotal: invoice.subtotal,
      vatAmount: invoice.vatAmount,
      total: invoice.total,
      vatRate: invoice.vatRate,
      currency: invoice.currency,
      notes: invoice.notes,
      customer,
      lineItems: invoice.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    },
  );

  return {
    pdf,
    filename: `${invoice.number.replace(/[^\w.-]+/g, "-")}.pdf`,
  };
}

export function buildInvoiceEmailContent(input: {
  businessName: string;
  invoiceNumber: string;
  customerName: string;
  totalLabel: string;
  dueDateLabel: string;
  displayStatus: InvoiceStatusValue;
}) {
  const subject = `Invoice ${input.invoiceNumber} from ${input.businessName}`;

  const bodyText = [
    `Hello ${input.customerName},`,
    "",
    `Please find attached invoice ${input.invoiceNumber} from ${input.businessName}.`,
    "",
    `Amount: ${input.totalLabel}`,
    `Due date: ${input.dueDateLabel}`,
    `Status: ${invoiceStatusLabel(input.displayStatus)}`,
    "",
    "Thank you for your business.",
  ].join("\n");

  return { subject, bodyText };
}

export async function getInvoiceEmailContext(
  businessId: string,
  invoiceId: string,
) {
  const invoice = await getInvoiceForBusiness(businessId, invoiceId);
  if (!invoice) {
    return null;
  }

  const business = await prisma.business.findFirst({
    where: { id: businessId },
    select: { name: true },
  });

  if (!business) {
    return null;
  }

  const customerName = formatCustomerName(invoice.customer);
  const totalLabel = new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: invoice.currency,
  }).format(invoice.total);
  const dueDateLabel = new Date(invoice.dueDate).toLocaleDateString("de-CH", {
    dateStyle: "medium",
  });

  const { subject, bodyText } = buildInvoiceEmailContent({
    businessName: business.name,
    invoiceNumber: invoice.number,
    customerName,
    totalLabel,
    dueDateLabel,
    displayStatus: invoice.displayStatus,
  });

  return {
    invoice,
    customerName,
    subject,
    bodyText,
    toAddress: invoice.customer.email,
  };
}
