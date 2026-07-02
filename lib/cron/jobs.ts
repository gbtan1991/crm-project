import { CronJobStatus, CronJobType, Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { cronHandlers } from "@/lib/cron/registry";

const STALE_RUN_MS = 30 * 60 * 1000;

export async function ensureCronJobs() {
  const defaults: Array<{
    type: CronJobType;
    name: string;
    intervalSeconds: number;
  }> = [
    {
      type: CronJobType.RECONCILE_CALENDAR,
      name: "Reconcile calendar bookings",
      intervalSeconds: 8 * 60 * 60, // 3× per day
    },
    {
      type: CronJobType.RENEW_CALENDAR_SUBSCRIPTIONS,
      name: "Renew calendar webhook subscriptions",
      intervalSeconds: 24 * 60 * 60, // daily
    },
    {
      type: CronJobType.PROCESS_SEQUENCES,
      name: "Process sequences",
      intervalSeconds: 60,
    },
    {
      type: CronJobType.PROCESS_APPOINTMENT_REMINDERS,
      name: "Process appointment reminders",
      intervalSeconds: 60,
    },
    {
      type: CronJobType.PROCESS_REVIEW_REQUESTS,
      name: "Process queued review requests",
      intervalSeconds: 60,
    },
  ];

  for (const job of defaults) {
    await prisma.cronJob.upsert({
      where: { type: job.type },
      update: {
        name: job.name,
        intervalSeconds: job.intervalSeconds,
      },
      create: {
        type: job.type,
        name: job.name,
        intervalSeconds: job.intervalSeconds,
        enabled: true,
        nextRunAt: new Date(),
      },
    });
  }

  await prisma.cronJob.updateMany({
    where: { type: CronJobType.PROCESS_INVOICE_SEQUENCES },
    data: { enabled: false },
  });
}

async function reclaimStaleJobs() {
  const staleBefore = new Date(Date.now() - STALE_RUN_MS);
  await prisma.cronJob.updateMany({
    where: {
      isRunning: true,
      runStartedAt: { lt: staleBefore },
    },
    data: {
      isRunning: false,
      runStartedAt: null,
      lastStatus: CronJobStatus.FAILED,
      lastError: "Reclaimed stale run.",
    },
  });
}

export async function runDueCronJobs() {
  await reclaimStaleJobs();

  const dueJobs = await prisma.cronJob.findMany({
    where: {
      enabled: true,
      isRunning: false,
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: new Date() } }],
    },
    orderBy: { nextRunAt: "asc" },
  });

  for (const job of dueJobs) {
    const claimed = await prisma.cronJob.updateMany({
      where: { id: job.id, isRunning: false },
      data: {
        isRunning: true,
        runStartedAt: new Date(),
      },
    });

    if (claimed.count === 0) {
      continue;
    }

    const handler = cronHandlers[job.type];
    const startedAt = Date.now();

    try {
      if (!handler) {
        throw new Error(`No handler registered for ${job.type}`);
      }

      console.info(`[cron] ${job.type} fired`);
      const result = await handler();
      const nextRunAt = new Date(Date.now() + job.intervalSeconds * 1000);

      await prisma.cronJob.update({
        where: { id: job.id },
        data: {
          isRunning: false,
          runStartedAt: null,
          lastRunAt: new Date(),
          lastStatus: result.skipped
            ? CronJobStatus.SKIPPED
            : CronJobStatus.SUCCESS,
          lastResult: result.summary as Prisma.InputJsonValue,
          lastError: null,
          nextRunAt,
        },
      });
      console.info(
        `[cron] ${job.type} completed in ${Date.now() - startedAt}ms`,
        result.summary,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const nextRunAt = new Date(
        Date.now() + Math.min(job.intervalSeconds, 300) * 1000,
      );

      await prisma.cronJob.update({
        where: { id: job.id },
        data: {
          isRunning: false,
          runStartedAt: null,
          lastRunAt: new Date(),
          lastStatus: CronJobStatus.FAILED,
          lastError: message,
          nextRunAt,
        },
      });

      console.error(`[cron] ${job.type} failed after ${Date.now() - startedAt}ms`, error);
    }
  }
}
