import { ensureCronJobs, runDueCronJobs } from "@/lib/cron/jobs";

const TICK_MS = 15_000;

let started = false;
let ticking = false;
let timer: ReturnType<typeof setInterval> | undefined;

export async function startCronScheduler() {
  if (started) {
    return;
  }
  started = true;

  await ensureCronJobs();
  console.info(`[cron] scheduler started; tick=${TICK_MS}ms`);

  const tick = async () => {
    if (ticking) {
      return;
    }
    ticking = true;
    try {
      await runDueCronJobs();
    } catch (error) {
      console.error("[cron] tick failed", error);
    } finally {
      ticking = false;
    }
  };

  await tick();
  timer = setInterval(tick, TICK_MS);

  if (timer.unref) {
    timer.unref();
  }
}

export function stopCronScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
  started = false;
}
