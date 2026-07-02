import {
  CalendarProvider,
  MessageProvider,
  MessagePurpose,
  MessageStatus,
} from "@/lib/generated/prisma/client";
import { wrapEmailContentHtml } from "@/lib/email-html";
import {
  buildInvoicePdfForBusiness,
  getInvoiceEmailContext,
} from "@/lib/invoice-email";
import {
  getInvoiceForBusiness,
  type InvoiceDetailRow,
} from "@/lib/invoices";
import { GmailSendError, sendGmailMessage } from "@/lib/google-mail/send";
import { GoogleCalendarOAuth } from "@/lib/google-calendar/oauth";
import { ensureInboxForBusiness } from "@/lib/inbox";
import { OutlookCalendarOAuth } from "@/lib/outlook-calendar/oauth";
import { OutlookSendError, sendOutlookMessage } from "@/lib/outlook-mail/send";
import { prisma } from "@/lib/prisma";
import type { SendInvoiceEmailInput } from "@/lib/validation/message";

export type SendInvoiceEmailResult =
  | {
      ok: true;
      invoice: InvoiceDetailRow;
      messageId: string;
    }
  | { ok: false; error: string };

export async function sendInvoiceEmailForBusiness(
  businessId: string,
  invoiceId: string,
  email: SendInvoiceEmailInput,
): Promise<SendInvoiceEmailResult | null> {
  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    select: { id: true, status: true },
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

  const [emailContext, pdfResult, inbox] = await Promise.all([
    getInvoiceEmailContext(businessId, invoiceId),
    buildInvoicePdfForBusiness(businessId, invoiceId),
    ensureInboxForBusiness(businessId),
  ]);

  if (!emailContext || !pdfResult) {
    return null;
  }

  const bodyHtml = wrapEmailContentHtml(email.bodyHtml);

  const message = await prisma.message.create({
    data: {
      inboxId: inbox.id,
      channel: "EMAIL",
      provider:
        connection.provider === CalendarProvider.GOOGLE
          ? MessageProvider.GOOGLE
          : MessageProvider.OUTLOOK,
      purpose: MessagePurpose.INVOICE,
      status: MessageStatus.PENDING,
      fromAddress: connection.accountEmail,
      toAddress: emailContext.toAddress,
      subject: email.subject,
      bodyText: "",
      bodyHtml,
      customerId: emailContext.invoice.customer.id,
      invoiceId,
      metadata: {
        attachmentFilename: pdfResult.filename,
      },
    },
    select: { id: true },
  });

  try {
    const attachment = {
      filename: pdfResult.filename,
      contentType: "application/pdf",
      data: pdfResult.pdf,
    };
    const externalId =
      connection.provider === CalendarProvider.GOOGLE
        ? await sendGmailMessage({
            accessToken: await GoogleCalendarOAuth.getValidAccessToken(businessId),
            from: connection.accountEmail,
            to: emailContext.toAddress,
            subject: email.subject,
            bodyHtml,
            attachments: [attachment],
          })
        : await sendOutlookMessage({
            accessToken: await OutlookCalendarOAuth.getValidAccessToken(businessId),
            to: emailContext.toAddress,
            subject: email.subject,
            bodyHtml,
            attachments: [attachment],
          });

    const sentAt = new Date();

    await prisma.$transaction([
      prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "OPEN",
          sentAt,
        },
      }),
      prisma.message.update({
        where: { id: message.id },
        data: {
          status: MessageStatus.SENT,
          externalId,
          sentAt,
        },
      }),
    ]);

    const invoice = await getInvoiceForBusiness(businessId, invoiceId);
    if (!invoice) {
      return { ok: false, error: "Rechnung nach dem Versand nicht gefunden." };
    }

    return {
      ok: true,
      invoice,
      messageId: message.id,
    };
  } catch (error) {
    const errorMessage =
      error instanceof GmailSendError
        ? error.message
        : error instanceof OutlookSendError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Rechnungs-E-Mail konnte nicht gesendet werden.";

    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: MessageStatus.FAILED,
        error: errorMessage,
      },
    });

    return { ok: false, error: errorMessage };
  }
}
