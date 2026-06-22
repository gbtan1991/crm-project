export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { startCronScheduler } = await import("@/lib/cron/scheduler");
  await startCronScheduler();
}
