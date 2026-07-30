import { logger } from "../../utils/logger.js";
import { runTournamentReminderJob } from "./tournamentReminder.service.js";
import {
  getNextDailyRun,
  getReminderTimeZone,
} from "./tournamentReminder.helpers.js";

const STARTUP_DELAY_MS = 10_000;
const DEFAULT_DAILY_HOUR = 8;
const DEFAULT_DAILY_MINUTE = 0;
const TEST_INTERVAL_MS = 2 * 60 * 1000;
let reminderTimer = null;
let jobIsRunning = false;

export function startTournamentReminderScheduler() {
  if (reminderTimer || process.env.DISABLE_TOURNAMENT_REMINDERS === "true") {
    return;
  }

  const execute = async ({ force = false } = {}) => {
    if (jobIsRunning) return;
    jobIsRunning = true;

    try {
      const summary = await runTournamentReminderJob({ force });
      logger.info(
        `Tournament reminder check completed: ${summary.sent} sent, ${summary.skipped} skipped, ${summary.failed} failed`
      );
    } catch (error) {
      logger.error(`Tournament reminder scheduler failed: ${error.message}`);
    } finally {
      jobIsRunning = false;
    }
  };

  // TEMPORARY TEST SCHEDULE: force the first check after two minutes and then
  // repeat every two minutes. Delivery records still prevent duplicate emails.
  reminderTimer = setTimeout(async () => {
    await execute({ force: true });
    reminderTimer = setInterval(
      () => void execute({ force: true }),
      TEST_INTERVAL_MS
    );
    reminderTimer.unref?.();
  }, TEST_INTERVAL_MS);
  reminderTimer.unref?.();

  logger.info("Tournament reminder TEST scheduler started (every 2 minutes)");

  /*
   * PRODUCTION DAILY SCHEDULE (temporarily disabled for testing)
   * ------------------------------------------------------------
   * const timeZone = getReminderTimeZone();
   * const dailyHour = readScheduleNumber(
   *   process.env.REMINDER_DAILY_HOUR,
   *   DEFAULT_DAILY_HOUR,
   *   0,
   *   23
   * );
   * const dailyMinute = readScheduleNumber(
   *   process.env.REMINDER_DAILY_MINUTE,
   *   DEFAULT_DAILY_MINUTE,
   *   0,
   *   59
   * );
   *
   * const scheduleNextDailyCheck = () => {
   *   const now = new Date();
   *   const nextRun = getNextDailyRun({
   *     now,
   *     timeZone,
   *     hour: dailyHour,
   *     minute: dailyMinute,
   *   });
   *
   *   reminderTimer = setTimeout(async () => {
   *     await execute();
   *     scheduleNextDailyCheck();
   *   }, nextRun.getTime() - now.getTime());
   *   reminderTimer.unref?.();
   * };
   *
   * reminderTimer = setTimeout(async () => {
   *   await execute();
   *   scheduleNextDailyCheck();
   * }, STARTUP_DELAY_MS);
   * reminderTimer.unref?.();
   */
}

export function stopTournamentReminderScheduler() {
  if (!reminderTimer) return;
  clearTimeout(reminderTimer);
  clearInterval(reminderTimer);
  reminderTimer = null;
}

function readScheduleNumber(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum
    ? number
    : fallback;
}
