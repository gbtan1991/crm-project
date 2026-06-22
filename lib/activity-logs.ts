import {
  ActivityLogLevel,
  ActivityLogSubType,
  ActivityLogType,
  Prisma,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type ActivityLogRow = {
  id: string;
  type: ActivityLogType;
  subType: ActivityLogSubType | null;
  level: ActivityLogLevel;
  message: string;
  invoiceId: string | null;
  reviewId: string | null;
  customerId: string | null;
  messageId: string | null;
  sequenceId: string | null;
  sequenceEnrollmentId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: string;
};

type CreateActivityLogInput = {
  businessId?: string | null;
  type: ActivityLogType;
  subType?: ActivityLogSubType | null;
  level?: ActivityLogLevel;
  message: string;
  invoiceId?: string | null;
  reviewId?: string | null;
  customerId?: string | null;
  messageId?: string | null;
  sequenceId?: string | null;
  sequenceEnrollmentId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function createActivityLog(input: CreateActivityLogInput) {
  try {
    await prisma.activityLog.create({
      data: {
        businessId: input.businessId ?? null,
        type: input.type,
        subType: input.subType ?? null,
        level: input.level ?? ActivityLogLevel.INFO,
        message: input.message,
        invoiceId: input.invoiceId ?? null,
        reviewId: input.reviewId ?? null,
        customerId: input.customerId ?? null,
        messageId: input.messageId ?? null,
        sequenceId: input.sequenceId ?? null,
        sequenceEnrollmentId: input.sequenceEnrollmentId ?? null,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("[activity-log] failed to write log", error);
  }
}

export async function createActivityLogs(inputs: CreateActivityLogInput[]) {
  for (const input of inputs) {
    await createActivityLog(input);
  }
}

export async function listSequenceActivityLogsForBusiness(
  businessId: string,
  input: { page?: number; limit?: number } = {},
): Promise<{ items: ActivityLogRow[]; total: number; totalPages: number }> {
  const page = Math.max(input.page ?? 1, 1);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
  const where = {
    businessId,
    OR: [
      { type: ActivityLogType.SEQUENCE },
      { type: ActivityLogType.CRONJOB, subType: ActivityLogSubType.SEQUENCE },
      { type: ActivityLogType.EMAIL, subType: ActivityLogSubType.SEQUENCE },
    ],
  };
  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return {
    items: logs.map((log) => ({
      id: log.id,
      type: log.type,
      subType: log.subType,
      level: log.level,
      message: log.message,
      invoiceId: log.invoiceId,
      reviewId: log.reviewId,
      customerId: log.customerId,
      messageId: log.messageId,
      sequenceId: log.sequenceId,
      sequenceEnrollmentId: log.sequenceEnrollmentId,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    })),
    total,
    totalPages: Math.ceil(total / limit),
  };
}
