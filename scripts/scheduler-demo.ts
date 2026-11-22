import { prisma } from "@/lib/db";
import { tickScheduler } from "@/lib/scheduler";
import { processNextTask } from "@/lib/worker/runner";

// Demonstrates end-to-end autonomy: the scheduler ENQUEUES due jobs and the
// worker COMPLETES them with no manual trigger. (The slow AI cycle is skipped
// here for a fast demo; the real worker runs it the same way.)
async function main() {
  await prisma.task.deleteMany({ where: { OR: [{ idempotencyKey: { startsWith: "sched:" } }, { type: "autonomous.cycle", status: "pending" }] } });

  // Use a Monday timestamp so the weekly report job is due (report cadence is Mon+).
  const monday = new Date("2026-11-23T10:00:00Z");
  const tick = await tickScheduler(monday);
  console.log("scheduler tick (Mon) enqueued:", tick.enqueued.length, "jobs:", tick.enqueued.join(", "));

  // Skip the long AI cycle in this demo; keep the fast scheduler-enqueued reports.
  await prisma.task.deleteMany({ where: { type: "autonomous.cycle", status: "pending" } });

  let processed = 0;
  for (let i = 0; i < 10; i++) {
    const r = await processNextTask();
    if (!r) break;
    console.log(`  worker processed ${r.type} → ${r.status}`);
    processed++;
  }

  const completedSched = await prisma.task.count({ where: { idempotencyKey: { startsWith: "sched:" }, status: "completed" } });
  console.log(`\nworker processed ${processed} task(s); ${completedSched} scheduler-enqueued task(s) COMPLETED without manual trigger.`);
  console.log(completedSched >= 1 ? "SCHEDULER→WORKER AUTONOMY: PASS" : "no scheduler task completed (check report cadence/weekday)");
  await prisma.$disconnect();
  if (completedSched < 1) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
