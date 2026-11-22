import { prisma } from "@/lib/db";
import {
  runResearch,
  runStrategy,
  runCalendar,
  runCreativeSpecs,
  runCommunity,
  runWeeklyReport,
  runFullCycle,
} from "@/lib/agents";
import { renderAllForCompany } from "@/lib/render";
import { runAutonomousCycle } from "@/lib/ai/autonomous";
import type { AgentResult } from "@/lib/agents/types";

// Durable task handlers. Each is idempotent at the data level (the agents
// clear+rebuild their own outputs), so a retry is safe.
type Handler = (companyId: string) => Promise<AgentResult | AgentResult[] | { note: string }>;

export const HANDLERS: Record<string, Handler> = {
  "cycle.full": async (c) => {
    const results = await runFullCycle(c, { withHistory: false });
    const render = await renderAllForCompany(c);
    return [...results, { agentSystem: "E", created: render.rendered, notes: `rendered ${render.rendered}` }];
  },
  "agent.research": runResearch,
  "agent.strategy": runStrategy,
  "agent.calendar": runCalendar,
  "agent.creative": async (c) => {
    const spec = await runCreativeSpecs(c);
    const render = await renderAllForCompany(c);
    return { ...spec, notes: `${spec.notes} · rendered ${render.rendered}` };
  },
  "agent.community": runCommunity,
  "agent.report": runWeeklyReport,
  "render.all": async (c) => {
    const r = await renderAllForCompany(c);
    return { note: `rendered ${r.rendered}, awaiting ${r.awaiting}, blocked ${r.blocked}` };
  },
  // Full autonomous, accuracy-gated cycle (AI when available).
  "autonomous.cycle": async (c) => {
    const r = await runAutonomousCycle(c, { ai: true });
    return { note: `ai=${r.ai.model ?? "none"} · ${r.steps.map((s) => `${s.step}(${s.detail})`).join(" | ")}` };
  },
};

export interface EnqueueInput {
  companyId: string;
  type: keyof typeof HANDLERS;
  title: string;
  agentSystem?: string;
  idempotencyKey?: string;
  dependsOnId?: string;
  priority?: number;
  scheduledFor?: Date;
}

/** Enqueue a task; dedupes on idempotencyKey if provided. */
export async function enqueueTask(input: EnqueueInput): Promise<string> {
  if (input.idempotencyKey) {
    const existing = await prisma.task.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing && existing.status !== "failed") return existing.id;
  }
  const task = await prisma.task.create({
    data: {
      companyId: input.companyId,
      type: input.type,
      title: input.title,
      agentSystem: input.agentSystem ?? null,
      status: "pending",
      priority: input.priority ?? 5,
      idempotencyKey: input.idempotencyKey ?? null,
      dependsOnId: input.dependsOnId ?? null,
      scheduledFor: input.scheduledFor ?? null,
    },
  });
  return task.id;
}

/**
 * Claim and process the next runnable pending task. Returns the processed task
 * id, or null if the queue is empty. Restart-safe: a task left in `processing`
 * by a crash is re-claimed after a stale timeout.
 */
export async function processNextTask(): Promise<{ id: string; type: string; status: string } | null> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 5 * 60 * 1000);

  // Re-queue stale processing tasks (crash recovery).
  await prisma.task.updateMany({
    where: { status: "processing", startedAt: { lt: staleBefore } },
    data: { status: "pending" },
  });

  const candidates = await prisma.task.findMany({
    where: {
      status: "pending",
      OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }],
    },
    include: { dependsOn: true },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    take: 10,
  });
  const task = candidates.find((t) => !t.dependsOn || t.dependsOn.status === "completed");
  if (!task) return null;

  // Claim (optimistic: only if still pending).
  const claim = await prisma.task.updateMany({
    where: { id: task.id, status: "pending" },
    data: { status: "processing", startedAt: now, attempts: { increment: 1 } },
  });
  if (claim.count === 0) return null; // someone else claimed it

  const handler = HANDLERS[task.type];
  try {
    if (!handler) throw new Error(`No handler for task type "${task.type}"`);
    const result = await handler(task.companyId);
    await prisma.task.update({ where: { id: task.id }, data: { status: "completed", completedAt: new Date(), result: JSON.stringify(result) } });
    await prisma.executionLog.create({ data: { companyId: task.companyId, taskId: task.id, level: "info", message: `Task ${task.type} completed` } });
    return { id: task.id, type: task.type, status: "completed" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const fresh = await prisma.task.findUnique({ where: { id: task.id } });
    const willRetry = (fresh?.attempts ?? 1) < (fresh?.maxAttempts ?? 3);
    await prisma.task.update({
      where: { id: task.id },
      data: { status: willRetry ? "pending" : "failed", error: message, completedAt: willRetry ? null : new Date() },
    });
    await prisma.executionLog.create({ data: { companyId: task.companyId, taskId: task.id, level: "error", message: `Task ${task.type} ${willRetry ? "failed (will retry)" : "failed"}: ${message}` } });
    return { id: task.id, type: task.type, status: willRetry ? "retry" : "failed" };
  }
}

/** Drain the queue (process until empty). Returns count processed. */
export async function drainQueue(max = 100): Promise<number> {
  let n = 0;
  for (let i = 0; i < max; i++) {
    const r = await processNextTask();
    if (!r) break;
    n++;
  }
  return n;
}
