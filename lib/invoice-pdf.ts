import { jsPDF } from "jspdf";

import { formatCustomerName } from "@/lib/customer-display";
import { invoiceStatusLabel, type InvoiceStatusValue } from "@/lib/invoice-display";
import { formatMoney } from "@/lib/invoice-money";

export type InvoicePdfSender = {
  name: string;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
};

export type InvoicePdfCustomer = {
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
};

export type InvoicePdfLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoicePdfInput = {
  number: string;
  title?: string | null;
  displayStatus: InvoiceStatusValue;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  vatAmount: number;
  total: number;
  vatRate: number;
  currency: string;
  notes?: string | null;
  customer: InvoicePdfCustomer;
  lineItems: InvoicePdfLineItem[];
};

function formatPdfDate(value: string): string {
  return new Date(value).toLocaleDateString("de-CH", { dateStyle: "medium" });
}

function formatCustomerAddress(customer: InvoicePdfCustomer): string[] {
  const cityLine = [customer.postalCode, customer.city].filter(Boolean).join(" ");

  return [
    formatCustomerName(customer),
    customer.email,
    customer.address ?? "",
    cityLine,
  ].filter(Boolean);
}

export function generateInvoicePdf(
  sender: InvoicePdfSender,
  invoice: InvoicePdfInput,
): ArrayBuffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  let yPos = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(sender.name, margin, yPos);
  yPos += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const senderLines = [
    sender.address,
    [sender.postalCode, sender.city].filter(Boolean).join(" "),
    sender.email,
    sender.phone,
    sender.taxId ? `UID: ${sender.taxId}` : null,
  ].filter((line): line is string => Boolean(line));

  for (const line of senderLines) {
    doc.text(line, margin, yPos);
    yPos += 4;
  }

  yPos += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("RECHNUNG", margin, yPos);
  yPos += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Nummer: ${invoice.number}`, margin, yPos);
  yPos += 4;

  if (invoice.title) {
    doc.text(invoice.title, margin, yPos);
    yPos += 4;
  }

  const invoiceCol = margin;
  const customerCol = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.text("Rechnungsdetails:", invoiceCol, yPos);
  doc.text("Rechnungsempfänger:", customerCol, yPos);
  yPos += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const invoiceDetails = [
    `Rechnungsdatum: ${formatPdfDate(invoice.issueDate)}`,
    `Fälligkeitsdatum: ${formatPdfDate(invoice.dueDate)}`,
    `Status: ${invoiceStatusLabel(invoice.displayStatus)}`,
  ];

  const customerDetails = formatCustomerAddress(invoice.customer);
  const maxRows = Math.max(invoiceDetails.length, customerDetails.length);

  for (let index = 0; index < maxRows; index += 1) {
    if (invoiceDetails[index]) {
      doc.text(invoiceDetails[index], invoiceCol, yPos);
    }
    if (customerDetails[index]) {
      doc.text(customerDetails[index], customerCol, yPos);
    }
    yPos += 4;
  }

  yPos += 4;

  const columns = [
    { name: "Beschreibung", x: margin, width: 90 },
    { name: "Menge", x: margin + 95, width: 20 },
    { name: "Einzelpreis", x: margin + 118, width: 32 },
    { name: "Total", x: margin + 155, width: 30 },
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos - 3, contentWidth, 6, "F");

  for (const column of columns) {
    doc.text(column.name, column.x, yPos);
  }

  yPos += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  for (const item of invoice.lineItems) {
    const descriptionLines = doc.splitTextToSize(
      item.description || "Dienstleistung",
      columns[0].width - 5,
    );

    doc.text(descriptionLines, columns[0].x, yPos);
    doc.text(String(item.quantity), columns[1].x, yPos);
    doc.text(formatMoney(item.unitPrice, invoice.currency), columns[2].x, yPos);
    doc.text(formatMoney(item.lineTotal, invoice.currency), columns[3].x, yPos);

    yPos += descriptionLines.length * 4 + 3;

    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }
  }

  yPos += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin + 115, yPos, pageWidth - margin, yPos);
  yPos += 5;

  const summaryX = margin + 125;
  const summaryValueX = pageWidth - margin;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  doc.text("Zwischensumme:", summaryX, yPos);
  doc.text(formatMoney(invoice.subtotal, invoice.currency), summaryValueX, yPos, {
    align: "right",
  });
  yPos += 4;

  doc.text(`MwSt. (${invoice.vatRate}%):`, summaryX, yPos);
  doc.text(formatMoney(invoice.vatAmount, invoice.currency), summaryValueX, yPos, {
    align: "right",
  });
  yPos += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total:", summaryX, yPos);
  doc.text(formatMoney(invoice.total, invoice.currency), summaryValueX, yPos, {
    align: "right",
  });

  if (invoice.notes) {
    yPos += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Bemerkungen:", margin, yPos);
    yPos += 4;
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(invoice.notes, contentWidth);
    doc.text(noteLines, margin, yPos);
  }

  return doc.output("arraybuffer");
}
