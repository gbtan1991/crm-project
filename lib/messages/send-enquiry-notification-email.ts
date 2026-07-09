import {
  CalendarProvider,
  MessageProvider,
  MessagePurpose,
  MessageStatus,
} from "@/lib/generated/prisma/client";
import { env } from "@/env/server.mjs";
import { businessEnquiriesPath } from "@/lib/business-paths";
import { enquiryDisplayValue } from "@/lib/enquiry-display";
import { wrapEmailContentHtml } from "@/lib/email-html";
import { GmailSendError, sendGmailMessage } from "@/lib/google-mail/send";
import { GoogleCalendarOAuth } from "@/lib/google-calendar/oauth";
import { ensureInboxForBusiness } from "@/lib/inbox";
import { OutlookCalendarOAuth } from "@/lib/outlook-calendar/oauth";
import { OutlookSendError, sendOutlookMessage } from "@/lib/outlook-mail/send";
import { prisma } from "@/lib/prisma";

type EnquiryField = {
  key: string;
  label: string;
  type: string;
};

type SendEnquiryNotificationEmailInput = {
  businessId: string;
  enquiryId: string;
  formName: string;
  fields: EnquiryField[];
  data: Record<string, unknown>;
  createdAt: Date;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatEnquiryFieldHtml(value: unknown): string {
  if (value == null || value === "") {
    return `<span style="color:#a1a1aa;">—</span>`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `<span style="color:#a1a1aa;">—</span>`;
    }

    const items = value
      .map(
        (item) =>
          `<li style="margin:4px 0;">${escapeHtml(enquiryDisplayValue(item))}</li>`,
      )
      .join("");

    return `<ul style="margin:0;padding-left:20px;">${items}</ul>`;
  }

  return escapeHtml(enquiryDisplayValue(value));
}

function formatEnquiryFieldText(value: unknown): string {
  if (value == null || value === "") {
    return "—";
  }

  if (Array.isArray(value)) {
    return value.map((item) => `• ${enquiryDisplayValue(item)}`).join("\n");
  }

  return enquiryDisplayValue(value);
}

function buildEnquiryEmailContent(input: SendEnquiryNotificationEmailInput) {
  const rows = input.fields
    .map((field) => {
      const value = input.data[field.key];
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;font-weight:600;color:#52525b;vertical-align:top;width:140px;">${escapeHtml(field.label)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#18181b;white-space:pre-wrap;">${formatEnquiryFieldHtml(value)}</td>
      </tr>`;
    })
    .join("");

  const receivedAt = new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(input.createdAt);

  const enquiriesUrl = `${env.NEXT_PUBLIC_URL}${businessEnquiriesPath(input.businessId)}`;

  const bodyHtml = wrapEmailContentHtml(`
    <p style="margin:0 0 16px;color:#18181b;font-size:16px;line-height:1.6;">
      Sie haben eine neue Anfrage über <strong>${escapeHtml(input.formName)}</strong> erhalten.
    </p>
    <p style="margin:0 0 16px;color:#71717a;font-size:14px;line-height:1.5;">
      Eingegangen am ${escapeHtml(receivedAt)}
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:1px solid #e4e4e7;border-radius:8px;border-collapse:collapse;overflow:hidden;">
      ${rows}
    </table>
    <p style="margin:0;">
      <a href="${escapeHtml(enquiriesUrl)}" style="display:inline-block;background-color:#18181b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:6px;">
        Anfrage in MeisterFlow öffnen
      </a>
    </p>
  `);

  const bodyText = [
    `Neue Anfrage über ${input.formName}`,
    `Eingegangen am ${receivedAt}`,
    "",
    ...input.fields.map((field) => {
      const value = formatEnquiryFieldText(input.data[field.key]);
      return Array.isArray(input.data[field.key])
        ? `${field.label}:\n${value}`
        : `${field.label}: ${value}`;
    }),
    "",
    `Anfrage öffnen: ${enquiriesUrl}`,
  ].join("\n");

  return { bodyHtml, bodyText };
}

export async function sendEnquiryNotificationEmail(
  input: SendEnquiryNotificationEmailInput,
): Promise<{ ok: true } | { ok: false; error: string } | null> {
  const [business, connection, inbox] = await Promise.all([
    prisma.business.findUnique({
      where: { id: input.businessId },
      select: {
        name: true,
        owner: { select: { email: true } },
        config: { select: { businessEmail: true } },
      },
    }),
    prisma.calendarConnection.findUnique({
      where: { businessId: input.businessId },
      select: {
        provider: true,
        accountEmail: true,
        connectedAt: true,
      },
    }),
    ensureInboxForBusiness(input.businessId),
  ]);

  if (!business) {
    return null;
  }

  if (!connection?.connectedAt || !connection.accountEmail) {
    return {
      ok: false,
      error: "Kein verbundenes Google- oder Outlook-Konto zum Senden der Benachrichtigung.",
    };
  }

  if (
    connection.provider !== CalendarProvider.GOOGLE &&
    connection.provider !== CalendarProvider.OUTLOOK
  ) {
    return {
      ok: false,
      error: "Anfragebenachrichtigungen erfordern Google oder Outlook.",
    };
  }

  const toAddress =
    business.config?.businessEmail?.trim() || business.owner.email;
  const subject = `Neue Anfrage: ${input.formName}`;
  const { bodyHtml, bodyText } = buildEnquiryEmailContent(input);

  const message = await prisma.message.create({
    data: {
      inboxId: inbox.id,
      channel: "EMAIL",
      provider:
        connection.provider === CalendarProvider.GOOGLE
          ? MessageProvider.GOOGLE
          : MessageProvider.OUTLOOK,
      purpose: MessagePurpose.MANUAL,
      status: MessageStatus.PENDING,
      fromAddress: connection.accountEmail,
      toAddress,
      subject,
      bodyText,
      bodyHtml,
      metadata: {
        enquiryId: input.enquiryId,
        formName: input.formName,
        notificationType: "enquiry_submitted",
      },
    },
    select: { id: true },
  });

  try {
    const externalId =
      connection.provider === CalendarProvider.GOOGLE
        ? await sendGmailMessage({
            accessToken: await GoogleCalendarOAuth.getValidAccessToken(
              input.businessId,
            ),
            from: connection.accountEmail,
            to: toAddress,
            subject,
            bodyText,
            bodyHtml,
          })
        : await sendOutlookMessage({
            accessToken: await OutlookCalendarOAuth.getValidAccessToken(
              input.businessId,
            ),
            to: toAddress,
            subject,
            bodyText,
            bodyHtml,
          });

    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: MessageStatus.SENT,
        externalId,
        sentAt: new Date(),
      },
    });

    return { ok: true };
  } catch (error) {
    const errorMessage =
      error instanceof GmailSendError
        ? error.message
        : error instanceof OutlookSendError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Anfragebenachrichtigung konnte nicht gesendet werden.";

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
