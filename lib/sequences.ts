import {
  ActivityLogLevel,
  ActivityLogSubType,
  ActivityLogType,
  CalendarProvider,
  MessageProvider,
  MessagePurpose,
  MessageStatus,
  ReviewStatus,
  SequenceDelayUnit,
  SequenceEnrollmentStatus,
  SequenceType,
  type SequenceTemplate,
} from "@/lib/generated/prisma/client";
import { env } from "@/env/server.mjs";
import { createActivityLog, createActivityLogs } from "@/lib/activity-logs";
import { formatCustomerName } from "@/lib/customer-display";
import { GmailSendError, sendGmailMessage } from "@/lib/google-mail/send";
import { GoogleCalendarOAuth } from "@/lib/google-calendar/oauth";
import { ensureInboxForBusiness } from "@/lib/inbox";
import { buildInvoicePdfForBusiness, getInvoiceEmailContext } from "@/lib/invoice-email";
import { formatInvoiceDate, invoiceStatusLabel } from "@/lib/invoice-display";
import { formatMoney } from "@/lib/invoice-money";
import { sendReviewRequestEmailForBusiness } from "@/lib/messages/send-review-request-email";
import { OutlookCalendarOAuth } from "@/lib/outlook-calendar/oauth";
import { OutlookSendError, sendOutlookMessage } from "@/lib/outlook-mail/send";
import { wrapEmailContentHtml, buildEmailHtmlFromPlainText } from "@/lib/email-html";
import { prisma } from "@/lib/prisma";
import type { SequenceWriteInput } from "@/lib/validation/sequence";

const DUE_ENROLLMENT_LIMIT = 25;

export type SequenceStepRow = {
  id: string;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  delayAmount: number;
  delayUnit: SequenceDelayUnit;
  sortOrder: number;
};

export type SequenceRow = {
  id: string;
  name: string;
  type: SequenceType;
  isActive: boolean;
  stepCount: number;
  activeEnrollmentCount: number;
  steps: SequenceStepRow[];
  createdAt: string;
  updatedAt: string;
};

export type InvoiceSequenceState = {
  enrollment: {
    id: string;
    status: SequenceEnrollmentStatus;
    currentStepIndex: number;
    nextRunAt: string | null;
    lastError: string | null;
    sequence: {
      id: string;
      name: string;
    };
  } | null;
  activeSequence: { id: string; name: string; stepCount: number } | null;
};

function serializeSequence(sequence: SequenceTemplate & {
  steps: Array<{
    id: string;
    subject: string;
    bodyText: string;
    bodyHtml: string | null;
    delayAmount: number;
    delayUnit: SequenceDelayUnit;
    sortOrder: number;
  }>;
  _count: { enrollments: number };
}): SequenceRow {
  const steps = sequence.steps
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((step) => ({
      id: step.id,
      subject: step.subject,
      bodyText: step.bodyText,
      bodyHtml: step.bodyHtml,
      delayAmount: step.delayAmount,
      delayUnit: step.delayUnit,
      sortOrder: step.sortOrder,
    }));

  return {
    id: sequence.id,
    name: sequence.name,
    type: sequence.type,
    isActive: sequence.isActive,
    stepCount: steps.length,
    activeEnrollmentCount: sequence._count.enrollments,
    steps,
    createdAt: sequence.createdAt.toISOString(),
    updatedAt: sequence.updatedAt.toISOString(),
  };
}

function stepDelayMs(step: { delayAmount: number; delayUnit: SequenceDelayUnit }) {
  const unitMs =
    step.delayUnit === "MINUTES"
      ? 60 * 1000
      : step.delayUnit === "HOURS"
        ? 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
  return step.delayAmount * unitMs;
}

function nextRunFromStep(step: { delayAmount: number; delayUnit: SequenceDelayUnit }) {
  return new Date(Date.now() + stepDelayMs(step));
}

function renderInvoiceVariables(
  value: string,
  context: NonNullable<Awaited<ReturnType<typeof getInvoiceEmailContext>>>,
) {
  const invoice = context.invoice;
  const variables: Record<string, string> = {
    customerName: context.customerName,
    invoiceNumber: invoice.number,
    invoiceTitle: invoice.title ?? invoice.number,
    total: formatMoney(invoice.total, invoice.currency),
    dueDate: formatInvoiceDate(invoice.dueDate),
    issueDate: formatInvoiceDate(invoice.issueDate),
    invoiceStatus: invoiceStatusLabel(invoice.displayStatus),
    businessName: context.subject.replace(/^Invoice .* from /, "") || "",
  };

  return value.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

function renderReviewVariables(
  value: string,
  context: {
    businessName: string;
    customerName: string;
    reviewLink: string;
  },
) {
  const variables: Record<string, string> = {
    businessName: context.businessName,
    customerName: context.customerName,
    reviewLink: context.reviewLink,
    link: context.reviewLink,
  };

  return value.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

function reviewLink(reviewId: string) {
  return `${env.NEXT_PUBLIC_URL}/review/${reviewId}`;
}

async function sendInvoiceSequenceEmail(input: {
  businessId: string;
  invoiceId: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  sequenceId: string;
  enrollmentId: string;
  stepId: string;
}) {
  const [connection, emailContext, pdfResult, inbox] = await Promise.all([
    prisma.calendarConnection.findUnique({
      where: { businessId: input.businessId },
      select: { provider: true, accountEmail: true, connectedAt: true },
    }),
    getInvoiceEmailContext(input.businessId, input.invoiceId),
    buildInvoicePdfForBusiness(input.businessId, input.invoiceId),
    ensureInboxForBusiness(input.businessId),
  ]);

  if (!emailContext || !pdfResult) {
    await createActivityLog({
      businessId: input.businessId,
      type: ActivityLogType.EMAIL,
      subType: ActivityLogSubType.SEQUENCE,
      level: ActivityLogLevel.ERROR,
      message: "Sequenz-E-Mail fehlgeschlagen: Rechnung nicht gefunden.",
      invoiceId: input.invoiceId,
      sequenceId: input.sequenceId,
      sequenceEnrollmentId: input.enrollmentId,
      metadata: { stepId: input.stepId },
    });
    return { ok: false as const, error: "Rechnung nicht gefunden." };
  }
  if (!connection?.connectedAt || !connection.accountEmail) {
    await createActivityLog({
      businessId: input.businessId,
      type: ActivityLogType.EMAIL,
      subType: ActivityLogSubType.SEQUENCE,
      level: ActivityLogLevel.ERROR,
      message: "Sequenz-E-Mail fehlgeschlagen: kein verbundenes Google- oder Outlook-Postfach.",
      invoiceId: input.invoiceId,
      sequenceId: input.sequenceId,
      sequenceEnrollmentId: input.enrollmentId,
      metadata: { stepId: input.stepId, to: emailContext.toAddress },
    });
    return { ok: false as const, error: "Verbinden Sie Google oder Outlook, um E-Mails zu senden." };
  }
  if (
    connection.provider !== CalendarProvider.GOOGLE &&
    connection.provider !== CalendarProvider.OUTLOOK
  ) {
    await createActivityLog({
      businessId: input.businessId,
      type: ActivityLogType.EMAIL,
      subType: ActivityLogSubType.SEQUENCE,
      level: ActivityLogLevel.ERROR,
      message: "Sequenz-E-Mail fehlgeschlagen: verbundener Anbieter kann keine Rechnungs-E-Mails senden.",
      invoiceId: input.invoiceId,
      sequenceId: input.sequenceId,
      sequenceEnrollmentId: input.enrollmentId,
      metadata: { stepId: input.stepId, provider: connection.provider },
    });
    return { ok: false as const, error: "Sequenz-E-Mails erfordern Google oder Outlook." };
  }

  const subject = renderInvoiceVariables(input.subject, emailContext);
  const bodyText = renderInvoiceVariables(input.bodyText, emailContext);
  const bodyHtml = input.bodyHtml
    ? wrapEmailContentHtml(renderInvoiceVariables(input.bodyHtml, emailContext))
    : buildEmailHtmlFromPlainText(bodyText);
  const attachment = {
    filename: pdfResult.filename,
    contentType: "application/pdf",
    data: pdfResult.pdf,
  };

  const message = await prisma.message.create({
    data: {
      inboxId: inbox.id,
      channel: "EMAIL",
      provider:
        connection.provider === CalendarProvider.GOOGLE
          ? MessageProvider.GOOGLE
          : MessageProvider.OUTLOOK,
      purpose: MessagePurpose.SEQUENCE,
      status: MessageStatus.PENDING,
      fromAddress: connection.accountEmail,
      toAddress: emailContext.toAddress,
      subject,
      bodyText,
      bodyHtml,
      customerId: emailContext.invoice.customer.id,
      invoiceId: input.invoiceId,
      metadata: {
        sequenceId: input.sequenceId,
        enrollmentId: input.enrollmentId,
        stepId: input.stepId,
        attachmentFilename: pdfResult.filename,
      },
    },
    select: { id: true },
  });

  await createActivityLog({
    businessId: input.businessId,
    type: ActivityLogType.EMAIL,
    subType: ActivityLogSubType.SEQUENCE,
    message: `Sequenz-E-Mail für ${emailContext.toAddress} in Warteschlange.`,
    invoiceId: input.invoiceId,
    customerId: emailContext.invoice.customer.id,
    messageId: message.id,
    sequenceId: input.sequenceId,
    sequenceEnrollmentId: input.enrollmentId,
    metadata: { stepId: input.stepId, subject, to: emailContext.toAddress },
  });

  try {
    const externalId =
      connection.provider === CalendarProvider.GOOGLE
        ? await sendGmailMessage({
            accessToken: await GoogleCalendarOAuth.getValidAccessToken(input.businessId),
            from: connection.accountEmail,
            to: emailContext.toAddress,
            subject,
            bodyText,
            bodyHtml,
            attachments: [attachment],
          })
        : await sendOutlookMessage({
            accessToken: await OutlookCalendarOAuth.getValidAccessToken(input.businessId),
            to: emailContext.toAddress,
            subject,
            bodyText,
            bodyHtml,
            attachments: [attachment],
          });

    await prisma.message.update({
      where: { id: message.id },
      data: { status: MessageStatus.SENT, externalId, sentAt: new Date() },
    });

    await createActivityLog({
      businessId: input.businessId,
      type: ActivityLogType.EMAIL,
      subType: ActivityLogSubType.SEQUENCE,
      message: `Sequenz-E-Mail an ${emailContext.toAddress} gesendet.`,
      invoiceId: input.invoiceId,
      customerId: emailContext.invoice.customer.id,
      messageId: message.id,
      sequenceId: input.sequenceId,
      sequenceEnrollmentId: input.enrollmentId,
      metadata: {
        stepId: input.stepId,
        subject,
        to: emailContext.toAddress,
        externalId,
      },
    });

    return { ok: true as const, messageId: message.id };
  } catch (error) {
    const errorMessage =
      error instanceof GmailSendError
        ? error.message
        : error instanceof OutlookSendError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Sequenz-E-Mail konnte nicht gesendet werden.";

    await prisma.message.update({
      where: { id: message.id },
      data: { status: MessageStatus.FAILED, error: errorMessage },
    });

    await createActivityLog({
      businessId: input.businessId,
      type: ActivityLogType.EMAIL,
      subType: ActivityLogSubType.SEQUENCE,
      level: ActivityLogLevel.ERROR,
      message: `Sequenz-E-Mail an ${emailContext.toAddress} fehlgeschlagen: ${errorMessage}`,
      invoiceId: input.invoiceId,
      customerId: emailContext.invoice.customer.id,
      messageId: message.id,
      sequenceId: input.sequenceId,
      sequenceEnrollmentId: input.enrollmentId,
      metadata: { stepId: input.stepId, subject, to: emailContext.toAddress },
    });

    return { ok: false as const, error: errorMessage };
  }
}

export async function listSequencesForBusiness(businessId: string) {
  const sequences = await prisma.sequenceTemplate.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
      _count: {
        select: {
          enrollments: {
            where: { status: SequenceEnrollmentStatus.ACTIVE },
          },
        },
      },
    },
  });

  return sequences.map(serializeSequence);
}

async function findActiveSequenceConflict(input: {
  businessId: string;
  type: SequenceType;
  sequenceId?: string;
}) {
  return prisma.sequenceTemplate.findFirst({
    where: {
      businessId: input.businessId,
      type: input.type,
      isActive: true,
      ...(input.sequenceId ? { id: { not: input.sequenceId } } : {}),
    },
    select: { id: true, name: true },
  });
}

export async function createSequenceForBusiness(
  businessId: string,
  input: SequenceWriteInput,
) {
  if (input.isActive) {
    const conflict = await findActiveSequenceConflict({
      businessId,
      type: input.type,
    });
    if (conflict) {
      return {
        error: `${input.type === "INVOICE" ? "Rechnungs" : "Bewertungs"}sequenz «${conflict.name}» ist bereits aktiv. Deaktivieren Sie sie, bevor Sie eine weitere ${input.type === "INVOICE" ? "Rechnungs" : "Bewertungs"}sequenz aktivieren.` as const,
      };
    }
  }

  const sequence = await prisma.sequenceTemplate.create({
    data: {
      businessId,
      type: input.type,
      name: input.name.trim(),
      isActive: input.isActive,
      autoStart: input.isActive,
      steps: {
        create: input.steps.map((step, index) => ({
          subject: step.subject.trim(),
          bodyText: step.bodyText.trim(),
          bodyHtml: step.bodyHtml?.trim() || null,
          delayAmount: step.delayAmount,
          delayUnit: step.delayUnit,
          sortOrder: step.sortOrder ?? index,
        })),
      },
    },
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
      _count: { select: { enrollments: true } },
    },
  });

  return serializeSequence(sequence);
}

export async function updateSequenceForBusiness(
  businessId: string,
  sequenceId: string,
  input: SequenceWriteInput,
) {
  const existing = await prisma.sequenceTemplate.findFirst({
    where: { id: sequenceId, businessId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  if (input.isActive) {
    const conflict = await findActiveSequenceConflict({
      businessId,
      sequenceId,
      type: input.type,
    });
    if (conflict) {
      return {
        error: `${input.type === "INVOICE" ? "Rechnungs" : "Bewertungs"}sequenz «${conflict.name}» ist bereits aktiv. Deaktivieren Sie sie, bevor Sie eine weitere ${input.type === "INVOICE" ? "Rechnungs" : "Bewertungs"}sequenz aktivieren.` as const,
      };
    }
  }

  const sequence = await prisma.$transaction(async (tx) => {
    await tx.sequenceStep.deleteMany({ where: { sequenceId } });
    return tx.sequenceTemplate.update({
      where: { id: sequenceId },
      data: {
        name: input.name.trim(),
        type: input.type,
        isActive: input.isActive,
        autoStart: input.isActive,
        steps: {
          create: input.steps.map((step, index) => ({
            subject: step.subject.trim(),
            bodyText: step.bodyText.trim(),
            bodyHtml: step.bodyHtml?.trim() || null,
            delayAmount: step.delayAmount,
            delayUnit: step.delayUnit,
            sortOrder: step.sortOrder ?? index,
          })),
        },
      },
      include: {
        steps: { orderBy: { sortOrder: "asc" } },
        _count: { select: { enrollments: true } },
      },
    });
  });

  return serializeSequence(sequence);
}

export async function deleteSequenceForBusiness(
  businessId: string,
  sequenceId: string,
) {
  const existing = await prisma.sequenceTemplate.findFirst({
    where: { id: sequenceId, businessId },
    include: { _count: { select: { enrollments: true } } },
  });

  if (!existing) {
    return null;
  }

  if (existing._count.enrollments > 0) {
    return { error: "Sequenzen mit Rechnungs-Einschreibungen können nicht gelöscht werden." as const };
  }

  await prisma.sequenceTemplate.delete({ where: { id: sequenceId } });
  return { ok: true as const };
}

export async function getInvoiceSequenceState(
  businessId: string,
  invoiceId: string,
): Promise<InvoiceSequenceState> {
  const [enrollment, activeSequence] = await Promise.all([
    prisma.sequenceEnrollment.findUnique({
      where: { invoiceId },
      select: {
        id: true,
        status: true,
        currentStepIndex: true,
        nextRunAt: true,
        lastError: true,
        sequence: { select: { id: true, name: true } },
      },
    }),
    prisma.sequenceTemplate.findFirst({
      where: { businessId, type: "INVOICE", isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: { select: { steps: true } },
      },
    }),
  ]);

  return {
    enrollment: enrollment
      ? {
          ...enrollment,
          nextRunAt: enrollment.nextRunAt?.toISOString() ?? null,
        }
      : null,
    activeSequence: activeSequence
      ? {
          id: activeSequence.id,
          name: activeSequence.name,
          stepCount: activeSequence._count.steps,
        }
      : null,
  };
}

export async function getActiveReviewSequenceForBusiness(businessId: string) {
  const sequence = await prisma.sequenceTemplate.findFirst({
    where: { businessId, type: "REVIEW", isActive: true },
    select: {
      id: true,
      name: true,
      _count: { select: { steps: true } },
    },
  });

  return sequence
    ? {
        id: sequence.id,
        name: sequence.name,
        stepCount: sequence._count.steps,
      }
    : null;
}

export async function startInvoiceSequenceForBusiness(
  businessId: string,
  invoiceId: string,
  sequenceId?: string,
) {
  const [invoice, sequence] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id: invoiceId, businessId },
      select: { id: true, status: true },
    }),
    prisma.sequenceTemplate.findFirst({
      where: {
        ...(sequenceId ? { id: sequenceId } : {}),
        businessId,
        type: "INVOICE",
        isActive: true,
      },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  if (!invoice) {
    return { error: "Rechnung nicht gefunden." as const };
  }
  if (!sequence) {
    return { error: "Aktive Rechnungssequenz nicht gefunden." as const };
  }
  if (sequence.steps.length === 0) {
    return { error: "Sequenz hat keine E-Mail-Schritte." as const };
  }
  if (invoice.status !== "DRAFT" && invoice.status !== "OPEN") {
    return {
      error: "Nur Entwürfe oder offene Rechnungen können eine Rechnungssequenz starten." as const,
    };
  }

  const firstStep = sequence.steps[0];
  const enrollment = await prisma.sequenceEnrollment.create({
    data: {
      businessId,
      invoiceId,
      sequenceId: sequence.id,
      status: SequenceEnrollmentStatus.ACTIVE,
      currentStepIndex: 0,
      nextRunAt: nextRunFromStep(firstStep),
    },
    select: { id: true },
  }).catch((error: unknown) => {
    if (
      typeof error === "object" &&
      error != null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return null;
    }
    throw error;
  });

  if (!enrollment) {
    return { error: "Diese Rechnung hat bereits eine Sequenz." as const };
  }

  console.info(
    `[sequence] enrolled invoice ${invoiceId} in sequence ${sequence.id}; nextRunAt=${nextRunFromStep(firstStep).toISOString()}`,
  );
  await createActivityLog({
    businessId,
    type: ActivityLogType.SEQUENCE,
    subType: ActivityLogSubType.INVOICE,
    message: `Rechnung in Sequenz «${sequence.name}» eingeschrieben.`,
    invoiceId,
    sequenceId: sequence.id,
    sequenceEnrollmentId: enrollment.id,
    metadata: {
      invoiceStatus: invoice.status,
      nextRunAt: nextRunFromStep(firstStep).toISOString(),
    },
  });

  return { enrollmentId: enrollment.id };
}

export async function startReviewSequenceForBusiness(
  businessId: string,
  reviewId: string,
) {
  const [review, sequence] = await Promise.all([
    prisma.review.findFirst({
      where: { id: reviewId, businessId },
      select: { id: true, status: true },
    }),
    prisma.sequenceTemplate.findFirst({
      where: { businessId, type: "REVIEW", isActive: true },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  if (!review) {
    return { error: "Bewertung nicht gefunden." as const };
  }
  if (!sequence) {
    return { error: "Aktive Bewertungssequenz nicht gefunden." as const };
  }
  if (sequence.steps.length === 0) {
    return { error: "Bewertungssequenz hat keine E-Mail-Schritte." as const };
  }
  if (review.status !== ReviewStatus.REQUESTED) {
    return { error: "Nur angefragte Bewertungen können eine Sequenz starten." as const };
  }

  const firstStep = sequence.steps[0];
  const enrollment = await prisma.sequenceEnrollment
    .create({
      data: {
        businessId,
        reviewId,
        sequenceId: sequence.id,
        status: SequenceEnrollmentStatus.ACTIVE,
        currentStepIndex: 0,
        nextRunAt: nextRunFromStep(firstStep),
      },
      select: { id: true },
    })
    .catch((error: unknown) => {
      if (
        typeof error === "object" &&
        error != null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        return null;
      }
      throw error;
    });

  if (!enrollment) {
    return { error: "Diese Bewertung hat bereits eine Sequenz." as const };
  }

  await createActivityLog({
    businessId,
    type: ActivityLogType.SEQUENCE,
    subType: ActivityLogSubType.REVIEW,
    message: `Bewertung in Sequenz «${sequence.name}» eingeschrieben.`,
    reviewId,
    sequenceId: sequence.id,
    sequenceEnrollmentId: enrollment.id,
    metadata: {
      nextRunAt: nextRunFromStep(firstStep).toISOString(),
    },
  });

  return { enrollmentId: enrollment.id };
}

type ReviewEnrollmentForProcessing = {
  id: string;
  businessId: string;
  reviewId: string | null;
  sequenceId: string;
  currentStepIndex: number;
  review: {
    id: string;
    status: ReviewStatus;
    customer: {
      id: string;
      companyName: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
    business: { name: string };
  } | null;
  sequence: {
    steps: Array<{
      id: string;
      subject: string;
      bodyText: string;
      bodyHtml: string | null;
      delayAmount: number;
      delayUnit: SequenceDelayUnit;
    }>;
  };
};

async function processReviewEnrollment(enrollment: ReviewEnrollmentForProcessing) {
  if (!enrollment.review) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: SequenceEnrollmentStatus.FAILED,
        lastError: "Bewertung existiert nicht mehr.",
      },
    });
    await createActivityLog({
      businessId: enrollment.businessId,
      type: ActivityLogType.SEQUENCE,
      subType: ActivityLogSubType.REVIEW,
      level: ActivityLogLevel.ERROR,
      message: "Bewertungssequenz fehlgeschlagen: Bewertung existiert nicht mehr.",
      sequenceId: enrollment.sequenceId,
      sequenceEnrollmentId: enrollment.id,
    });
    return { failed: true, reason: "Bewertung existiert nicht mehr." };
  }

  if (
    enrollment.review.status === ReviewStatus.RECEIVED ||
    enrollment.review.status === ReviewStatus.DECLINED
  ) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: SequenceEnrollmentStatus.COMPLETED,
        completedAt: new Date(),
        lastError: null,
      },
    });
    await createActivityLog({
      businessId: enrollment.businessId,
      type: ActivityLogType.SEQUENCE,
      subType: ActivityLogSubType.REVIEW,
      message: `Bewertungssequenz gestoppt, da Bewertung ${enrollment.review.status.toLowerCase()} ist.`,
      reviewId: enrollment.review.id,
      sequenceId: enrollment.sequenceId,
      sequenceEnrollmentId: enrollment.id,
    });
    return { completed: true, reason: "Bewertung abgeschlossen oder abgelehnt." };
  }

  const step = enrollment.sequence.steps[enrollment.currentStepIndex];
  if (!step) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: SequenceEnrollmentStatus.COMPLETED,
        completedAt: new Date(),
        lastError: null,
      },
    });
    await createActivityLog({
      businessId: enrollment.businessId,
      type: ActivityLogType.SEQUENCE,
      subType: ActivityLogSubType.REVIEW,
      message: "Bewertungssequenz abgeschlossen. Keine weiteren E-Mail-Schritte.",
      reviewId: enrollment.review.id,
      sequenceId: enrollment.sequenceId,
      sequenceEnrollmentId: enrollment.id,
    });
    return { completed: true, reason: "Keine weiteren Schritte." };
  }

  const context = {
    businessName: enrollment.review.business.name,
    customerName: formatCustomerName(enrollment.review.customer),
    reviewLink: reviewLink(enrollment.review.id),
  };
  const subject = renderReviewVariables(step.subject, context);
  const bodyText = renderReviewVariables(step.bodyText, context);
  const bodyHtml = step.bodyHtml
    ? renderReviewVariables(step.bodyHtml, context)
    : undefined;

  await createActivityLog({
    businessId: enrollment.businessId,
    type: ActivityLogType.SEQUENCE,
    subType: ActivityLogSubType.REVIEW,
    message: `Bewertungssequenz Schritt ${enrollment.currentStepIndex + 1} von ${enrollment.sequence.steps.length} wird verarbeitet.`,
    reviewId: enrollment.review.id,
    sequenceId: enrollment.sequenceId,
    sequenceEnrollmentId: enrollment.id,
    metadata: { stepId: step.id },
  });

  const sendResult = await sendReviewRequestEmailForBusiness(
    enrollment.businessId,
    enrollment.review.id,
    { subject, bodyText, bodyHtml },
  );

  if (!sendResult) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: SequenceEnrollmentStatus.FAILED,
        lastError: "Bewertung nicht gefunden.",
      },
    });
    return { failed: true, reason: "Bewertung nicht gefunden." };
  }

  if (!sendResult.ok) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: SequenceEnrollmentStatus.FAILED,
        lastError: sendResult.error,
      },
    });
    await createActivityLog({
      businessId: enrollment.businessId,
      type: ActivityLogType.EMAIL,
      subType: ActivityLogSubType.SEQUENCE,
      level: ActivityLogLevel.ERROR,
      message: `Bewertungssequenz-E-Mail an ${enrollment.review.customer.email} fehlgeschlagen: ${sendResult.error}`,
      reviewId: enrollment.review.id,
      customerId: enrollment.review.customer.id,
      sequenceId: enrollment.sequenceId,
      sequenceEnrollmentId: enrollment.id,
      metadata: { stepId: step.id, subject },
    });
    return { failed: true, reason: sendResult.error };
  }

  const sentAt = new Date();
  const nextStepIndex = enrollment.currentStepIndex + 1;
  const nextStep = enrollment.sequence.steps[nextStepIndex];

  await prisma.sequenceEnrollment.update({
    where: { id: enrollment.id },
    data: nextStep
      ? {
          currentStepIndex: nextStepIndex,
          nextRunAt: nextRunFromStep(nextStep),
          lastError: null,
        }
      : {
          currentStepIndex: nextStepIndex,
          nextRunAt: null,
          status: SequenceEnrollmentStatus.COMPLETED,
          completedAt: sentAt,
          lastError: null,
        },
  });

  await createActivityLogs([
    {
      businessId: enrollment.businessId,
      type: ActivityLogType.EMAIL,
      subType: ActivityLogSubType.SEQUENCE,
      message: `Bewertungssequenz-E-Mail an ${enrollment.review.customer.email} gesendet.`,
      reviewId: enrollment.review.id,
      customerId: enrollment.review.customer.id,
      messageId: sendResult.messageId,
      sequenceId: enrollment.sequenceId,
      sequenceEnrollmentId: enrollment.id,
      metadata: { stepId: step.id, subject },
    },
    {
      businessId: enrollment.businessId,
      type: ActivityLogType.SEQUENCE,
      subType: ActivityLogSubType.REVIEW,
      message: nextStep
        ? `Review sequence step ${enrollment.currentStepIndex + 1} sent. Next step scheduled.`
        : "Final review sequence step sent. Sequence completed.",
      reviewId: enrollment.review.id,
      messageId: sendResult.messageId,
      sequenceId: enrollment.sequenceId,
      sequenceEnrollmentId: enrollment.id,
      metadata: {
        stepId: step.id,
        nextRunAt: nextStep ? nextRunFromStep(nextStep).toISOString() : null,
      },
    },
  ]);

  return { sent: true, messageId: sendResult.messageId };
}

async function processEnrollment(enrollmentId: string) {
  const enrollment = await prisma.sequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      invoice: { select: { id: true, status: true } },
      review: {
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
          business: { select: { name: true } },
        },
      },
      sequence: { include: { steps: { orderBy: { sortOrder: "asc" } } } },
    },
  });

  if (!enrollment || enrollment.status !== SequenceEnrollmentStatus.ACTIVE) {
    return { skipped: true, reason: "Einschreibung nicht mehr aktiv." };
  }
  if (enrollment.sequence.type === "REVIEW") {
    return processReviewEnrollment(enrollment);
  }

  if (!enrollment.invoice) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: SequenceEnrollmentStatus.FAILED,
        lastError: "Rechnung existiert nicht mehr.",
      },
    });
    await createActivityLog({
      businessId: enrollment.businessId,
      type: ActivityLogType.SEQUENCE,
      subType: ActivityLogSubType.INVOICE,
      level: ActivityLogLevel.ERROR,
      message: "Sequenz fehlgeschlagen: Rechnung existiert nicht mehr.",
      sequenceId: enrollment.sequenceId,
      sequenceEnrollmentId: enrollment.id,
    });
    return { failed: true, reason: "Rechnung existiert nicht mehr." };
  }
  if (enrollment.invoice.status === "PAID" || enrollment.invoice.status === "CANCELLED") {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: SequenceEnrollmentStatus.COMPLETED,
        completedAt: new Date(),
        lastError: null,
      },
    });
    await createActivityLog({
      businessId: enrollment.businessId,
      type: ActivityLogType.SEQUENCE,
      subType: ActivityLogSubType.INVOICE,
      message: `Sequenz gestoppt, da Rechnung ${enrollment.invoice.status.toLowerCase()} ist.`,
      invoiceId: enrollment.invoice.id,
      sequenceId: enrollment.sequenceId,
      sequenceEnrollmentId: enrollment.id,
    });
    return { completed: true, reason: "Rechnung ist bezahlt oder storniert." };
  }
  if (
    enrollment.invoice.status !== "DRAFT" &&
    enrollment.invoice.status !== "OPEN"
  ) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: SequenceEnrollmentStatus.FAILED,
        lastError: `Invoice is in unsupported status ${enrollment.invoice.status}.`,
      },
    });
    await createActivityLog({
      businessId: enrollment.businessId,
      type: ActivityLogType.SEQUENCE,
      subType: ActivityLogSubType.INVOICE,
      level: ActivityLogLevel.ERROR,
      message: `Sequenz fehlgeschlagen wegen Rechnungsstatus ${enrollment.invoice.status}.`,
      invoiceId: enrollment.invoice.id,
      sequenceId: enrollment.sequenceId,
      sequenceEnrollmentId: enrollment.id,
    });
    return { failed: true, reason: "Nicht unterstützter Rechnungsstatus." };
  }

  const step = enrollment.sequence.steps[enrollment.currentStepIndex];
  if (!step) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: SequenceEnrollmentStatus.COMPLETED,
        completedAt: new Date(),
        lastError: null,
      },
    });
    await createActivityLog({
      businessId: enrollment.businessId,
      type: ActivityLogType.SEQUENCE,
      subType: ActivityLogSubType.INVOICE,
      message: "Sequenz abgeschlossen. Keine weiteren E-Mail-Schritte.",
      invoiceId: enrollment.invoice.id,
      sequenceId: enrollment.sequenceId,
      sequenceEnrollmentId: enrollment.id,
    });
    return { completed: true, reason: "Keine weiteren Schritte." };
  }

  console.info(
    `[sequence] sending step ${enrollment.currentStepIndex + 1}/${enrollment.sequence.steps.length} for invoice ${enrollment.invoice.id}`,
  );
  await createActivityLog({
    businessId: enrollment.businessId,
    type: ActivityLogType.SEQUENCE,
    subType: ActivityLogSubType.INVOICE,
    message: `Sequenz Schritt ${enrollment.currentStepIndex + 1} von ${enrollment.sequence.steps.length} wird verarbeitet.`,
    invoiceId: enrollment.invoice.id,
    sequenceId: enrollment.sequenceId,
    sequenceEnrollmentId: enrollment.id,
    metadata: { stepId: step.id },
  });
  const sendResult = await sendInvoiceSequenceEmail({
    businessId: enrollment.businessId,
    invoiceId: enrollment.invoice.id,
    sequenceId: enrollment.sequenceId,
    enrollmentId: enrollment.id,
    stepId: step.id,
    subject: step.subject,
    bodyText: step.bodyText,
    bodyHtml: step.bodyHtml ?? undefined,
  });

  if (!sendResult.ok) {
    console.error(
      `[sequence] failed invoice ${enrollment.invoice.id} enrollment ${enrollment.id}: ${sendResult.error}`,
    );
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: SequenceEnrollmentStatus.FAILED,
        lastError: sendResult.error,
      },
    });
    return { failed: true, reason: sendResult.error };
  }

  const sentAt = new Date();
  const nextStepIndex = enrollment.currentStepIndex + 1;
  const nextStep = enrollment.sequence.steps[nextStepIndex];

  await prisma.$transaction([
    ...(enrollment.invoice.status === "DRAFT"
      ? [
          prisma.invoice.update({
            where: { id: enrollment.invoice.id },
            data: { status: "OPEN", sentAt },
          }),
        ]
      : []),
    prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: nextStep
        ? {
            currentStepIndex: nextStepIndex,
            nextRunAt: nextRunFromStep(nextStep),
            lastError: null,
          }
        : {
            currentStepIndex: nextStepIndex,
            nextRunAt: null,
            status: SequenceEnrollmentStatus.COMPLETED,
            completedAt: sentAt,
            lastError: null,
          },
    }),
  ]);

  console.info(
    `[sequence] sent invoice ${enrollment.invoice.id} enrollment ${enrollment.id}; messageId=${sendResult.messageId}`,
  );
  await createActivityLog({
    businessId: enrollment.businessId,
    type: ActivityLogType.SEQUENCE,
    subType: ActivityLogSubType.INVOICE,
    message: nextStep
      ? `Sequence step ${enrollment.currentStepIndex + 1} sent. Next step scheduled.`
      : "Final sequence step sent. Sequence completed.",
    invoiceId: enrollment.invoice.id,
    messageId: sendResult.messageId,
    sequenceId: enrollment.sequenceId,
    sequenceEnrollmentId: enrollment.id,
    metadata: {
      stepId: step.id,
      nextRunAt: nextStep ? nextRunFromStep(nextStep).toISOString() : null,
    },
  });

  return { sent: true, messageId: sendResult.messageId };
}

export async function processDueSequences() {
  const activeBusinessIds = await prisma.sequenceTemplate.findMany({
    where: { isActive: true },
    distinct: ["businessId"],
    select: { businessId: true },
  });

  const due = await prisma.sequenceEnrollment.findMany({
    where: {
      status: SequenceEnrollmentStatus.ACTIVE,
      AND: [
        { OR: [{ nextRunAt: null }, { nextRunAt: { lte: new Date() } }] },
        { OR: [{ invoiceId: { not: null } }, { reviewId: { not: null } }] },
      ],
    },
    orderBy: { nextRunAt: "asc" },
    take: DUE_ENROLLMENT_LIMIT,
    select: { id: true, businessId: true },
  });

  let sent = 0;
  let completed = 0;
  let failed = 0;
  let skipped = 0;

  console.info(`[sequence] processing due enrollments; due=${due.length}`);

  await createActivityLogs(
    activeBusinessIds.map((item) => ({
      businessId: item.businessId,
      type: ActivityLogType.CRONJOB,
      subType: ActivityLogSubType.SEQUENCE,
      message: `Sequenz-Cron: fällige Einschreibungen geprüft. Jetzt fällig: ${
        due.filter((enrollment) => enrollment.businessId === item.businessId).length
      }.`,
      metadata: { due: due.length },
    })),
  );

  for (const item of due) {
    const result = await processEnrollment(item.id);
    if ("sent" in result) sent += 1;
    else if ("completed" in result) completed += 1;
    else if ("failed" in result) failed += 1;
    else skipped += 1;
  }

  const summary = {
    due: due.length,
    sent,
    completed,
    failed,
    skipped,
  };

  console.info("[sequence] processed invoice enrollments", summary);

  const dueBusinessIds = [...new Set(due.map((item) => item.businessId))];
  await createActivityLogs(
    dueBusinessIds.map((businessId) => ({
      businessId,
      type: ActivityLogType.CRONJOB,
      subType: ActivityLogSubType.SEQUENCE,
      message: `Sequenz-Cron: fällige Einschreibungen verarbeitet — gesendet ${sent}, abgeschlossen ${completed}, fehlgeschlagen ${failed}, übersprungen ${skipped}.`,
      metadata: summary,
      level: failed > 0 ? ActivityLogLevel.WARNING : ActivityLogLevel.INFO,
    })),
  );

  return summary;
}

export const processDueInvoiceSequences = processDueSequences;
