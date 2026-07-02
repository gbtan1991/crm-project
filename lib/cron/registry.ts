import { CronJobType } from "@/lib/generated/prisma/client";
import { processAppointmentReminders } from "@/lib/appointment-reminders";
import {
  renewAllCalendarWebhooks,
  syncAllBusinessCalendars,
} from "@/lib/calendar/sync";
import { processDueSequences } from "@/lib/sequences";
import { processQueuedDirectReviewRequests } from "@/lib/review-delivery";

import type { CronHandlerRegistry } from "@/lib/cron/types";

export const cronHandlers: CronHandlerRegistry = {
  [CronJobType.RECONCILE_CALENDAR]: async () => {
    const summary = await syncAllBusinessCalendars();
    return { summary };
  },
  [CronJobType.RENEW_CALENDAR_SUBSCRIPTIONS]: async () => {
    const summary = await renewAllCalendarWebhooks();
    return { summary };
  },
  [CronJobType.PROCESS_INVOICE_SEQUENCES]: async () => {
    const summary = await processDueSequences();
    return { summary };
  },
  [CronJobType.PROCESS_SEQUENCES]: async () => {
    const summary = await processDueSequences();
    return { summary };
  },
  [CronJobType.PROCESS_APPOINTMENT_REMINDERS]: async () => {
    const summary = await processAppointmentReminders();
    return { summary };
  },
  [CronJobType.PROCESS_REVIEW_REQUESTS]: async () => {
    const summary = await processQueuedDirectReviewRequests();
    return { summary };
  },
};
