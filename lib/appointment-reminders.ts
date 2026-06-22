import {
  ActivityLogLevel,
  ActivityLogSubType,
  ActivityLogType,
  CalendarProvider,
  MessageProvider,
  MessagePurpose,
  MessageStatus,
  ReminderOffsetUnit,
} from "@/lib/generated/prisma/client";
import { createActivityLog, createActivityLogs } from "@/lib/activity-logs";
import { formatCustomerName } from "@/lib/customer-display";
import { GoogleCalendarOAuth } from "@/lib/google-calendar/oauth";
import { GmailSendError, sendGmailMessage } from "@/lib/google-mail/send";
import { ensureInboxForBusiness } from "@/lib/inbox";
import { OutlookCalendarOAuth } from "@/lib/outlook-calendar/oauth";
import { OutlookSendError, sendOutlookMessage } from "@/lib/outlook-mail/send";
import { prisma } from "@/lib/prisma";
import type { AppointmentReminderSettingsInput } from "@/lib/validation/appointment-reminder";

const DEFAULT_SUBJECT = "Reminder: {{appointmentTitle}} with {{businessName}}";
const DEFAULT_BODY = [
  "Hello {{customerName}},",
  "",
  "This is a reminder for your appointment with {{businessName}}.",
  "",
  "Appointment: {{appointmentTitle}}",
  "Date: {{appointmentDate}}",
  "Time: {{appointmentTime}}",
  "",
  "{{meetingUrl}}",
  "",
  "Thank you.",
].join("\n");
const LOOKAHEAD_MS = 2 * 60 * 1000;

export type AppointmentReminderOffsetRow = {
  id: string;
  amount: number;
  unit: ReminderOffsetUnit;
  sortOrder: number;
};

export type AppointmentReminderSettingsRow = {
  enabled: boolean;
  subject: string;
  bodyText: string;
  offsets: AppointmentReminderOffsetRow[];
};

function offsetMs(offset: { amount: number; unit: ReminderOffsetUnit }) {
  const unitMs =
    offset.unit === "MINUTES"
      ? 60 * 1000
      : offset.unit === "HOURS"
        ? 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
  return offset.amount * unitMs;
}

function serializeSettings(config: {
  enabled: boolean;
  subject: string;
  bodyText: string;
  offsets: Array<{
    id: string;
    amount: number;
    unit: ReminderOffsetUnit;
    sortOrder: number;
  }>;
} | null): AppointmentReminderSettingsRow {
  return {
    enabled: config?.enabled ?? false,
    subject: config?.subject ?? DEFAULT_SUBJECT,
    bodyText: config?.bodyText ?? DEFAULT_BODY,
    offsets:
      config?.offsets.map((offset) => ({
        id: offset.id,
        amount: offset.amount,
        unit: offset.unit,
        sortOrder: offset.sortOrder,
      })) ?? [
        {
          id: "default-1-hour",
          amount: 1,
          unit: "HOURS",
          sortOrder: 0,
        },
      ],
  };
}

export async function getAppointmentReminderSettings(businessId: string) {
  const config = await prisma.appointmentReminderConfig.findUnique({
    where: { businessId },
    include: { offsets: { orderBy: { sortOrder: "asc" } } },
  });

  return serializeSettings(config);
}

export async function updateAppointmentReminderSettings(
  businessId: string,
  input: AppointmentReminderSettingsInput,
) {
  const config = await prisma.$transaction(async (tx) => {
    const existing = await tx.appointmentReminderConfig.upsert({
      where: { businessId },
      update: {
        enabled: input.enabled,
        subject: input.subject.trim(),
        bodyText: input.bodyText.trim(),
      },
      create: {
        businessId,
        enabled: input.enabled,
        subject: input.subject.trim(),
        bodyText: input.bodyText.trim(),
      },
      select: { id: true },
    });

    await tx.appointmentReminderOffset.deleteMany({
      where: { configId: existing.id },
    });

    await tx.appointmentReminderOffset.createMany({
      data: input.offsets.map((offset, index) => ({
        configId: existing.id,
        amount: offset.amount,
        unit: offset.unit,
        sortOrder: offset.sortOrder ?? index,
      })),
    });

    return tx.appointmentReminderConfig.findUnique({
      where: { businessId },
      include: { offsets: { orderBy: { sortOrder: "asc" } } },
    });
  });

  await createActivityLog({
    businessId,
    type: ActivityLogType.SEQUENCE,
    subType: ActivityLogSubType.APPOINTMENT,
    message: input.enabled
      ? "Appointment reminder settings enabled."
      : "Appointment reminder settings disabled.",
    metadata: {
      offsets: input.offsets.map((offset) => ({
        amount: offset.amount,
        unit: offset.unit,
      })),
    },
  });

  return serializeSettings(config);
}

function renderTemplate(
  value: string,
  context: {
    businessName: string;
    customerName: string;
    appointmentTitle: string;
    appointmentDate: string;
    appointmentTime: string;
    meetingUrl: string;
  },
) {
  return value.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return context[key as keyof typeof context] ?? match;
  });
}

async function sendAppointmentReminder(input: {
  businessId: string;
  bookingId: string;
  offsetId: string;
  subject: string;
  bodyText: string;
}) {
  const [booking, connection, inbox] = await Promise.all([
    prisma.booking.findFirst({
      where: { id: input.bookingId, businessId: input.businessId },
      select: {
        id: true,
        title: true,
        startsAt: true,
        meetingUrl: true,
        customer: {
          select: {
            id: true,
            companyName: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        business: {
          select: {
            name: true,
            config: { select: { timezone: true } },
          },
        },
      },
    }),
    prisma.calendarConnection.findUnique({
      where: { businessId: input.businessId },
      select: { provider: true, accountEmail: true, connectedAt: true },
    }),
    ensureInboxForBusiness(input.businessId),
  ]);

  if (!booking?.customer) {
    return { ok: false as const, error: "Booking has no customer email." };
  }
  if (!connection?.connectedAt || !connection.accountEmail) {
    return { ok: false as const, error: "Connect Google or Outlook to send reminders." };
  }
  if (
    connection.provider !== CalendarProvider.GOOGLE &&
    connection.provider !== CalendarProvider.OUTLOOK
  ) {
    return { ok: false as const, error: "Appointment reminders require Google or Outlook." };
  }

  const timeZone = booking.business.config?.timezone ?? "UTC";
  const context = {
    businessName: booking.business.name,
    customerName: formatCustomerName(booking.customer),
    appointmentTitle: booking.title,
    appointmentDate: new Intl.DateTimeFormat("de-CH", {
      dateStyle: "medium",
      timeZone,
    }).format(booking.startsAt),
    appointmentTime: new Intl.DateTimeFormat("de-CH", {
      timeStyle: "short",
      timeZone,
    }).format(booking.startsAt),
    meetingUrl: booking.meetingUrl ? `Meeting link: ${booking.meetingUrl}` : "",
  };
  const subject = renderTemplate(input.subject, context);
  const bodyText = renderTemplate(input.bodyText, context);

  const message = await prisma.message.create({
    data: {
      inboxId: inbox.id,
      channel: "EMAIL",
      provider:
        connection.provider === CalendarProvider.GOOGLE
          ? MessageProvider.GOOGLE
          : MessageProvider.OUTLOOK,
      purpose: MessagePurpose.REMINDER,
      status: MessageStatus.PENDING,
      fromAddress: connection.accountEmail,
      toAddress: booking.customer.email,
      subject,
      bodyText,
      customerId: booking.customer.id,
      metadata: {
        bookingId: booking.id,
        offsetId: input.offsetId,
      },
    },
    select: { id: true },
  });

  try {
    const externalId =
      connection.provider === CalendarProvider.GOOGLE
        ? await sendGmailMessage({
            accessToken: await GoogleCalendarOAuth.getValidAccessToken(input.businessId),
            from: connection.accountEmail,
            to: booking.customer.email,
            subject,
            bodyText,
          })
        : await sendOutlookMessage({
            accessToken: await OutlookCalendarOAuth.getValidAccessToken(input.businessId),
            to: booking.customer.email,
            subject,
            bodyText,
          });

    await prisma.$transaction([
      prisma.message.update({
        where: { id: message.id },
        data: { status: MessageStatus.SENT, externalId, sentAt: new Date() },
      }),
      prisma.appointmentReminderDelivery.create({
        data: {
          businessId: input.businessId,
          bookingId: booking.id,
          offsetId: input.offsetId,
          messageId: message.id,
        },
      }),
    ]);

    await createActivityLog({
      businessId: input.businessId,
      type: ActivityLogType.EMAIL,
      subType: ActivityLogSubType.APPOINTMENT,
      message: `Appointment reminder sent to ${booking.customer.email}.`,
      customerId: booking.customer.id,
      messageId: message.id,
      metadata: { bookingId: booking.id, offsetId: input.offsetId, subject },
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
            : "Failed to send appointment reminder.";

    await prisma.message.update({
      where: { id: message.id },
      data: { status: MessageStatus.FAILED, error: errorMessage },
    });

    await createActivityLog({
      businessId: input.businessId,
      type: ActivityLogType.EMAIL,
      subType: ActivityLogSubType.APPOINTMENT,
      level: ActivityLogLevel.ERROR,
      message: `Appointment reminder failed for ${booking.customer.email}: ${errorMessage}`,
      customerId: booking.customer.id,
      messageId: message.id,
      metadata: { bookingId: booking.id, offsetId: input.offsetId, subject },
    });

    return { ok: false as const, error: errorMessage };
  }
}

export async function processAppointmentReminders() {
  const configs = await prisma.appointmentReminderConfig.findMany({
    where: { enabled: true, offsets: { some: {} } },
    include: { offsets: { orderBy: { sortOrder: "asc" } } },
  });

  let checked = 0;
  let due = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const config of configs) {
    await createActivityLog({
      businessId: config.businessId,
      type: ActivityLogType.CRONJOB,
      subType: ActivityLogSubType.APPOINTMENT,
      message: "Appointment reminder cron checked settings.",
      metadata: { offsets: config.offsets.length },
    });

    for (const offset of config.offsets) {
      const now = Date.now();
      const targetStart = new Date(now + offsetMs(offset));
      const targetEnd = new Date(targetStart.getTime() + LOOKAHEAD_MS);
      const bookings = await prisma.booking.findMany({
        where: {
          businessId: config.businessId,
          remindersEnabled: true,
          skipAutomation: false,
          status: { notIn: ["CANCELLED", "COMPLETED", "OVERDUE"] },
          startsAt: { gte: targetStart, lt: targetEnd },
          customer: { isNot: null },
          reminderDeliveries: { none: { offsetId: offset.id } },
        },
        select: { id: true },
      });

      checked += 1;
      due += bookings.length;

      for (const booking of bookings) {
        const result = await sendAppointmentReminder({
          businessId: config.businessId,
          bookingId: booking.id,
          offsetId: offset.id,
          subject: config.subject,
          bodyText: config.bodyText,
        });

        if (result.ok) {
          sent += 1;
        } else {
          failed += 1;
        }
      }
    }
  }

  if (configs.length === 0) {
    skipped = 1;
  }

  const summary = { configs: configs.length, checked, due, sent, failed, skipped };
  console.info("[appointment-reminders] processed", summary);

  await createActivityLogs(
    configs.map((config) => ({
      businessId: config.businessId,
      type: ActivityLogType.CRONJOB,
      subType: ActivityLogSubType.APPOINTMENT,
      level: failed > 0 ? ActivityLogLevel.WARNING : ActivityLogLevel.INFO,
      message: `Appointment reminder cron processed: due ${due}, sent ${sent}, failed ${failed}.`,
      metadata: summary,
    })),
  );

  return summary;
}
