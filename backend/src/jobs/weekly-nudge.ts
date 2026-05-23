import cron from "node-cron";
import { Path } from "../models/Path.js";
import { User } from "../models/User.js";
import { sendWeeklyNudge } from "../services/email.service.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

/**
 * Find users with an active path who have not progressed in 7+ days and send
 * them a nudge email pointing at their next milestone. Runs every Monday at
 * 9am UTC.
 */
async function runNudge(): Promise<void> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let sent = 0;
  let skipped = 0;
  try {
    const paths = await Path.find({ status: "active", updatedAt: { $lt: cutoff } })
      .limit(500)
      .lean();
    for (const path of paths) {
      const user = await User.findById(path.userId).lean();
      if (!user?.email || user.isGuest) {
        skipped++;
        continue;
      }
      const currentWeek = inferCurrentWeek(path);
      const nextMilestone = inferNextMilestone(path);
      if (!nextMilestone) {
        skipped++;
        continue;
      }
      await sendWeeklyNudge(user.email, user.handle, currentWeek, nextMilestone);
      sent++;
    }
    logger.info({ sent, skipped, scanned: paths.length }, "Weekly nudge job complete");
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "Weekly nudge job crashed",
    );
  }
}

function inferCurrentWeek(path: { phases?: { milestones?: { week: number; status?: string }[] }[] }): number {
  const milestones = (path.phases || []).flatMap((p) => p.milestones || []);
  const pending = milestones.find((m) => m.status !== "done");
  if (pending) return pending.week;
  return milestones[milestones.length - 1]?.week || 1;
}

function inferNextMilestone(path: { phases?: { milestones?: { topic: string; status?: string }[] }[] }): string | null {
  for (const phase of path.phases || []) {
    for (const m of phase.milestones || []) {
      if (m.status !== "done") return m.topic;
    }
  }
  return null;
}

export function startWeeklyNudgeJob(): void {
  if (!env.RESEND_API_KEY) {
    logger.info("Weekly nudge job not started — RESEND_API_KEY missing");
    return;
  }
  // Monday 9am UTC — keep the cron expression in UTC for predictability.
  cron.schedule("0 9 * * 1", runNudge, { timezone: "Etc/UTC" });
  logger.info("Weekly nudge cron scheduled (Mon 09:00 UTC)");
}
