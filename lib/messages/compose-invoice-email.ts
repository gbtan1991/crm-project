import { CalendarProvider } from "@/lib/generated/prisma/client";
import { getInvoiceEmailContext } from "@/lib/invoice-email";
import { prisma } from "@/lib/prisma";

export type InvoiceEmailCompose = {
  fromAddress: string;
  toAddress: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  attachment: {
    filename: string;
    downloadPath: string;
  };
  invoiceNumber: string;
};

export type InvoiceEmailComposeResult =
  | { ok: true; compose: InvoiceEmailCompose }
  | { ok: false; error: string }
  | null;

export async function getInvoiceEmailCompose(
  businessId: string,
  invoiceId: string,
): Promise<InvoiceEmailComposeResult> {
  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    select: { id: true, status: true, number: true },
  });

  if (!existing) {
    return null;
  }

  if (existing.status !== "DRAFT") {
    return { ok: false, error: "Nur Rechnungsentwürfe können versendet werden." };
  }

  const connection = await prisma.calendarConnection.findUnique({
    where: { businessId },
    select: {
      provider: true,
      accountEmail: true,
      connectedAt: true,
    },
  });

  if (!connection?.connectedAt || !connection.accountEmail) {
    return {
      ok: false,
      error: "Verbinden Sie Google oder Outlook, um Rechnungen per E-Mail zu senden.",
    };
  }

  if (
    connection.provider !== CalendarProvider.GOOGLE &&
    connection.provider !== CalendarProvider.OUTLOOK
  ) {
    return {
      ok: false,
      error: "Rechnungsversand per E-Mail erfordert eine Google- oder Outlook-Verbindung.",
    };
  }

  const emailContext = await getInvoiceEmailContext(businessId, invoiceId);
  if (!emailContext) {
    return null;
  }

  const filename = `${existing.number.replace(/[^\w.-]+/g, "-")}.pdf`;

  return {
    ok: true,
    compose: {
      fromAddress: connection.accountEmail,
      toAddress: emailContext.toAddress,
      subject: emailContext.subject,
      bodyText: emailContext.bodyText,
      bodyHtml: emailContext.bodyHtml,
      attachment: {
        filename,
        downloadPath: `/api/business/${businessId}/invoices/${invoiceId}/pdf`,
      },
      invoiceNumber: existing.number,
    },
  };
}
