/**
 * Persistent background worker for the Organic Social OS.
 *
 * Polls the durable Task queue (SQLite via Prisma) and processes runnable tasks
 * one at a time: claim → run handler → complete/retry. Restart-safe (stale
 * `processing` tasks are re-queued) and idempotent at the data level.
 *
 * Run standalone:  npm run worker
 * Run with the app: npm run dev:all
 */
import { processNextTask } from "@/lib/worker/runner";
import { tickScheduler } from "@/lib/scheduler";
import { prisma } from "@/lib/db";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 2000);
const SCHEDULER_TICK_MS = Number(process.env.SCHEDULER_TICK_MS ?? 60_000);
let running = true;
let lastSchedulerTick = 0;

async function maybeTickScheduler() {
  if (Date.now() - lastSchedulerTick < SCHEDULER_TICK_MS) return;
  lastSchedulerTick = Date.now();
  try {
    const tick = await tickScheduler();
    if (tick.enqueued.length) console.log(`[scheduler] enqueued ${tick.enqueued.length}: ${tick.enqueued.join(", ")}`);
  } catch (e) {
    console.error("[scheduler] error:", e instanceof Error ? e.message : e);
  }
}

async function loop() {
  console.log(`[worker] started · polling every ${POLL_MS}ms · scheduler every ${SCHEDULER_TICK_MS}ms`);
  while (running) {
    try {
      await maybeTickScheduler();
      const r = await processNextTask();
      if (r) {
        console.log(`[worker] ${r.type} → ${r.status} (${r.id})`);
        continue; // immediately try the next task
      }
    } catch (e) {
      console.error("[worker] error:", e instanceof Error ? e.message : e);
    }
    await new Promise((res) => setTimeout(res, POLL_MS));
  }
}

async function shutdown() {
  console.log("[worker] shutting down …");
  running = false;
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

loop().catch((e) => {
  console.error("[worker] fatal:", e);
  process.exit(1);
});
