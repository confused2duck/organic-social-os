import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";

interface RegisterRecord {
  excelId: string;
  sourceParagraph: string;
  itemType: string;
  domain: string;
  platform: string;
  workstream: string;
  track: string;
  activity: string;
  assignedAgent: string;
  executionMode: string;
  trigger: string;
  integrations: string;
  output: string;
  kpi: string;
  guardrail: string;
  releaseWave: string;
  scope: "organic" | "paid" | "leadgen";
  agentSystem: string | null;
}

interface AgentRecord {
  key: string;
  name: string;
  agentSystem: string;
  agentSystemName: string;
  activityCount: number;
  domains: string[];
  workstreams: string[];
}

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), rel), "utf-8")) as T;
}

export async function seedCatalog(prisma: PrismaClient) {
  const register = loadJson<RegisterRecord[]>("prisma/data/activity-register.json");
  const agents = loadJson<AgentRecord[]>("prisma/data/agent-catalog.json");

  // Reference tables are global; rebuild them deterministically.
  await prisma.activityCatalog.deleteMany({});
  await prisma.agentDefinition.deleteMany({});

  // Insert activities in chunks (SQLite createMany is supported).
  const rows = register.map((r) => ({
    excelId: r.excelId,
    sourceParagraph: r.sourceParagraph || null,
    itemType: r.itemType || null,
    domain: r.domain,
    workstream: r.workstream,
    track: r.track || null,
    activity: r.activity,
    assignedAgent: r.assignedAgent,
    executionMode: r.executionMode || null,
    trigger: r.trigger || null,
    integrations: r.integrations || null,
    output: r.output || null,
    kpi: r.kpi || null,
    guardrail: r.guardrail || null,
    releaseWave: r.releaseWave || null,
    scope: r.scope,
    agentSystem: r.agentSystem,
    implementationStatus: "planned",
  }));

  const chunk = 200;
  for (let i = 0; i < rows.length; i += chunk) {
    await prisma.activityCatalog.createMany({ data: rows.slice(i, i + chunk) });
  }

  await prisma.agentDefinition.createMany({
    data: agents.map((a) => ({
      key: a.key,
      name: a.name,
      agentSystem: a.agentSystem,
      summary: `${a.agentSystemName} specialist — owns ${a.activityCount} organic activities across ${a.domains.join(", ")}.`,
      domains: JSON.stringify(a.domains),
      responsibilities: JSON.stringify(a.workstreams),
      activityCount: a.activityCount,
      scope: "organic",
    })),
  });

  const organic = register.filter((r) => r.scope === "organic").length;
  const paid = register.filter((r) => r.scope === "paid").length;
  const leadgen = register.filter((r) => r.scope === "leadgen").length;
  return { total: register.length, organic, paid, leadgen, agents: agents.length };
}
