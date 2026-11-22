// Persistent scheduler. Runs inside the background worker process (no browser
// needed). Each tick computes which jobs are DUE per company from their config
// and current time, and enqueues them with a period-scoped idempotency key so a
// job runs at most once per period — surviving restarts and preventing duplicates.

import { prisma } from "@/lib/db";
import { enqueueTask } from "@/lib/worker/runner";
import { weekLabel } from "@/lib/agents/strategy";
import { parseStringArray } from "@/lib/json";

export interface SchedulerTick { now: string; enqueued: string[]; skipped: number }

/** Has a task with this idempotency key ever been created? (restart-safe dedupe) */
async function exists(idempotencyKey: string): Promise<boolean> {
  return (await prisma.task.findUnique({ where: { idempotencyKey }, select: { id: true } })) !== null;
}

/**
 * One scheduler tick. Enqueues due jobs for every active company:
 *  - Weekly autonomous content cycle (once per ISO week).
 *  - Weekly report (on/after the configured report weekday).
 * Respects paused workflows. Idempotent per period.
 */
export async function tickScheduler(now = new Date()): Promise<SchedulerTick> {
  const companies = await prisma.company.findMany({ where: { status: "active" }, include: { config: true } });
  const wl = weekLabel(now);
  const weekday = now.getUTCDay(); // 0=Sun..6=Sat
  const enqueued: string[] = [];
  let skipped = 0;

  for (const c of companies) {
    const paused = c.config ? parseStringArray(c.config.pausedWorkflows) : [];
    if (paused.includes("all")) { skipped++; continue; }

    // 1) Weekly autonomous content cycle — once per week.
    if (!paused.includes("cycle")) {
      const key = `sched:cycle:${c.id}:${wl}`;
      if (!(await exists(key))) {
        await enqueueTask({ companyId: c.id, type: "autonomous.cycle", title: `Scheduled autonomous cycle ${wl}`, idempotencyKey: key, agentSystem: "D", priority: 4 });
        enqueued.push(key);
      } else skipped++;
    }

    // 2) Weekly report — on/after the configured report weekday.
    const reportDay = c.config?.weeklyReportDay ?? 1;
    if (!paused.includes("report") && weekday >= reportDay) {
      const key = `sched:report:${c.id}:${wl}`;
      if (!(await exists(key))) {
        await enqueueTask({ companyId: c.id, type: "agent.report", title: `Scheduled weekly report ${wl}`, idempotencyKey: key, agentSystem: "G", priority: 6 });
        enqueued.push(key);
      } else skipped++;
    }
  }

  return { now: now.toISOString(), enqueued, skipped };
}
