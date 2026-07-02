import {
  CalendarProvider,
  MessageProvider,
  MessagePurpose,
  MessageStatus,
} from "@/lib/generated/prisma/client";
import { env } from "@/env/server.mjs";
import { formatCustomerName } from "@/lib/customer-display";
import { wrapEmailContentHtml } from "@/lib/email-html";
import { GmailSendError, sendGmailMessage } from "@/lib/google-mail/send";
import { GoogleCalendarOAuth } from "@/lib/google-calendar/oauth";
import { ensureInboxForBusiness } from "@/lib/inbox";
import { OutlookCalendarOAuth } from "@/lib/outlook-calendar/oauth";
import { OutlookSendError, sendOutlookMessage } from "@/lib/outlook-mail/send";
import { prisma } from "@/lib/prisma";

export type SendReviewRequestEmailInput = {
  subject: string;
  bodyHtml: string;
};

export type SendReviewRequestEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string }
  | null;

function ensureReviewLinkHtml(bodyHtml: string, reviewUrl: string) {
  const rendered = bodyHtml.replaceAll("{{link}}", reviewUrl);

  return rendered.includes(reviewUrl)
    ? rendered
    : `${rendered.trim()}\n<p><a href="${reviewUrl}">${reviewUrl}</a></p>`;
}

export async function sendReviewRequestEmailForBusiness(
  businessId: string,
  reviewId: string,
  input: SendReviewRequestEmailInput,
): Promise<SendReviewRequestEmailResult> {
  const [review, connection, inbox] = await Promise.all([
    prisma.review.findFirst({
      where: { id: reviewId, businessId },
      select: {
        id: true,
        status: true,
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
    }),
    prisma.calendarConnection.findUnique({
      where: { businessId },
      select: {
        provider: true,
        accountEmail: true,
        connectedAt: true,
      },
    }),
    ensureInboxForBusiness(businessId),
  ]);

  if (!review) {
    return null;
  }

  if (!connection?.connectedAt || !connection.accountEmail) {
    return { ok: false, error: "Verbinden Sie Google oder Outlook, um Bewertungsanfragen zu senden." };
  }

  if (
    connection.provider !== CalendarProvider.GOOGLE &&
    connection.provider !== CalendarProvider.OUTLOOK
  ) {
    return {
      ok: false,
      error: "Bewertungsanfragen erfordern eine Google- oder Outlook-Verbindung.",
    };
  }

  const reviewUrl = `${env.NEXT_PUBLIC_URL}/review/${review.id}`;
  const bodyHtml = wrapEmailContentHtml(
    ensureReviewLinkHtml(input.bodyHtml, reviewUrl),
  );

  const message = await prisma.message.create({
    data: {
      inboxId: inbox.id,
      channel: "EMAIL",
      provider:
        connection.provider === CalendarProvider.GOOGLE
          ? MessageProvider.GOOGLE
          : MessageProvider.OUTLOOK,
      purpose: MessagePurpose.REVIEW,
      status: MessageStatus.PENDING,
      fromAddress: connection.accountEmail,
      toAddress: review.customer.email,
      subject: input.subject,
      bodyText: "",
      bodyHtml,
      customerId: review.customer.id,
      metadata: {
        reviewId: review.id,
        reviewUrl,
        customerName: formatCustomerName(review.customer),
      },
    },
    select: { id: true },
  });

  try {
    const externalId =
      connection.provider === CalendarProvider.GOOGLE
        ? await sendGmailMessage({
            accessToken: await GoogleCalendarOAuth.getValidAccessToken(businessId),
            from: connection.accountEmail,
            to: review.customer.email,
            subject: input.subject,
            bodyHtml,
          })
        : await sendOutlookMessage({
            accessToken: await OutlookCalendarOAuth.getValidAccessToken(businessId),
            to: review.customer.email,
            subject: input.subject,
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

    return { ok: true, messageId: message.id };
  } catch (error) {
    const errorMessage =
      error instanceof GmailSendError
        ? error.message
        : error instanceof OutlookSendError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Bewertungsanfrage konnte nicht gesendet werden.";

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
