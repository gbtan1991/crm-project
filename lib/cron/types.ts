import type { CronJobType } from "@/lib/generated/prisma/client";

export type CronHandlerResult = {
  skipped?: boolean;
  summary: Record<string, unknown>;
};

export type CronHandler = () => Promise<CronHandlerResult>;

export type CronHandlerRegistry = Record<CronJobType, CronHandler>;
