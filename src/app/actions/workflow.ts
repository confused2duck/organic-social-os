"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompany } from "@/lib/tenant";
import {
  runFullCycle,
  runResearch,
  runStrategy,
  runCalendar,
  runCreativeSpecs,
  runCommunity,
  runWeeklyReport,
} from "@/lib/agents";
import { enqueueTask } from "@/lib/worker/runner";
import type { AgentResult } from "@/lib/agents/types";

type Step = "full" | "research" | "strategy" | "calendar" | "creative" | "community" | "report";

const RUNNERS: Record<Exclude<Step, "full">, (companyId: string) => Promise<AgentResult>> = {
  research: runResearch,
  strategy: runStrategy,
  calendar: runCalendar,
  creative: runCreativeSpecs,
  community: runCommunity,
  report: runWeeklyReport,
};

const ENQUEUE_MAP: Record<Exclude<Step, "full">, string> = {
  research: "agent.research",
  strategy: "agent.strategy",
  calendar: "agent.calendar",
  creative: "agent.creative",
  community: "agent.community",
  report: "agent.report",
};

/** Enqueue a task for the durable background worker instead of running inline. */
export async function enqueueWorkflowAction(step: Step) {
  const company = await requireCompany();
  const type = step === "full" ? "cycle.full" : ENQUEUE_MAP[step];
  const id = await enqueueTask({
    companyId: company.id,
    type: type as never,
    title: step === "full" ? "Full organic cycle (queued)" : `Run ${step} (queued)`,
    agentSystem: step === "research" ? "B" : step === "strategy" || step === "calendar" ? "D" : step === "creative" ? "E" : step === "community" ? "F" : step === "report" ? "G" : undefined,
  });
  revalidatePath("/tasks");
  return { ok: true as const, taskId: id };
}

/** Enqueue the full autonomous, accuracy-gated cycle for the background worker. */
export async function enqueueAutonomousCycleAction() {
  const company = await requireCompany();
  const id = await enqueueTask({
    companyId: company.id,
    type: "autonomous.cycle" as never,
    title: "Autonomous cycle (AI + accuracy gate)",
    agentSystem: "D",
  });
  revalidatePath("/tasks");
  return { ok: true as const, taskId: id };
}

export async function runWorkflowAction(step: Step) {
  const company = await requireCompany();

  const task = await prisma.task.create({
    data: {
      companyId: company.id,
      type: `workflow.${step}`,
      title: step === "full" ? "Run full organic cycle" : `Run ${step} agent`,
      status: "processing",
      startedAt: new Date(),
      agentSystem: step === "research" ? "B" : step === "strategy" || step === "calendar" ? "D" : step === "creative" ? "E" : step === "community" ? "F" : step === "report" ? "G" : null,
    },
  });

  try {
    const results = step === "full" ? await runFullCycle(company.id) : [await RUNNERS[step](company.id)];
    await prisma.task.update({
      where: { id: task.id },
      data: { status: "completed", completedAt: new Date(), result: JSON.stringify(results) },
    });
    await prisma.executionLog.create({
      data: {
        companyId: company.id,
        taskId: task.id,
        level: "info",
        message: `Workflow ${step} completed: ${results.map((r) => `${r.agentSystem}+${r.created}`).join(", ")}`,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true as const, results };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    await prisma.task.update({ where: { id: task.id }, data: { status: "failed", error: message, completedAt: new Date() } });
    await prisma.executionLog.create({ data: { companyId: company.id, taskId: task.id, level: "error", message: `Workflow ${step} failed: ${message}` } });
    return { ok: false as const, error: message };
  }
}
