import { prisma } from "@/lib/db";
import { enqueueTask, drainQueue } from "@/lib/worker/runner";

async function main() {
  const company = await prisma.company.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  const id = await enqueueTask({ companyId: company.id, type: "agent.research", title: "Worker test: research", agentSystem: "B", idempotencyKey: `wtest-${Date.now()}` });
  console.log("enqueued task:", id);
  const before = await prisma.task.findUnique({ where: { id } });
  console.log("status before drain:", before?.status);

  const processed = await drainQueue(10);
  console.log("processed by worker:", processed);

  const after = await prisma.task.findUnique({ where: { id } });
  console.log("status after drain:", after?.status, "· attempts:", after?.attempts);
  console.log("result:", after?.result?.slice(0, 120));
  await prisma.$disconnect();
  if (after?.status !== "completed") process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
