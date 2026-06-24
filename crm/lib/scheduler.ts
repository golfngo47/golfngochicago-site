import cron from "node-cron";
import { runSync } from "./sync";
import { isAuthenticated } from "./gmail";

let schedulerStarted = false;

export function startScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    if (!isAuthenticated()) return;
    console.log("[CRM Scheduler] Starting hourly Gmail sync...");
    try {
      const result = await runSync();
      console.log(
        `[CRM Scheduler] Sync complete: ${result.synced} emails processed, ${result.leads} leads updated`
      );
      if (result.errors.length > 0) {
        console.warn("[CRM Scheduler] Errors:", result.errors);
      }
    } catch (e) {
      console.error("[CRM Scheduler] Sync failed:", e);
    }
  });

  console.log("[CRM Scheduler] Hourly Gmail sync scheduled.");
}
