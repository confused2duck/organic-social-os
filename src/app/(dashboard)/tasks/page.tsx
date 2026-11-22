import { resolveActiveCompany } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { RunWorkflowButton, EnqueueButton, AutonomousCycleButton } from "@/components/actions/run-workflow-button";
import { getAiStatus } from "@/lib/ai";
import { Bot } from "lucide-react";
import { AGENT_SYSTEMS, type AgentSystemId } from "@/lib/agent-systems";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const LEVEL_TONE = { info: "muted", warn: "warning", error: "danger" } as const;

export default async function TasksPage() {
  const company = await resolveActiveCompany();
  if (!company) return <EmptyState title="No workspace selected" />;

  const [tasks, logs, counts, aiStatus] = await Promise.all([
    prisma.task.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.executionLog.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.task.groupBy({ by: ["status"], where: { companyId: company.id }, _count: true }),
    getAiStatus(),
  ]);

  return (
    <div>
      <PageHeader title="Tasks" description="The durable task queue the agents run through — idempotent, restart-safe, with execution history. The background worker also runs a persistent scheduler (no browser needed).">
        <AutonomousCycleButton />
        <EnqueueButton step="full" label="Queue full cycle" />
      </PageHeader>

      <Card className={aiStatus.available ? "mb-5 border-success/40 bg-success/5" : "mb-5 border-warning/40 bg-warning/5"}>
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Bot className={`mt-0.5 size-4 shrink-0 ${aiStatus.available ? "text-success" : "text-warning"}`} />
          <div>
            <p className="font-medium">AI inference runtime: {aiStatus.available ? `connected (${aiStatus.model})` : "not connected"}</p>
            <p className="text-muted-foreground">
              {aiStatus.available
                ? `Local open-weight model via ${aiStatus.provider}. The autonomous cycle generates model-driven copy (labelled ai:<model>), then the accuracy gate validates it before scheduling.`
                : `${aiStatus.reason}. The system falls back to deterministic generation (labelled deterministic_generation) — nothing is fabricated. Run "npm run worker" with Ollama for model-driven content.`}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mb-5 flex flex-wrap gap-2">
        {counts.map((c) => (
          <Card key={c.status} className="px-4 py-2 text-sm"><StatusBadge status={c.status} /> <span className="ml-1 font-semibold">{c._count}</span></Card>
        ))}
        {counts.length === 0 && <span className="text-sm text-muted-foreground">No tasks run yet.</span>}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Recent tasks</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet — run a workflow to create tasks.</p>}
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border p-2.5 text-sm">
                {t.agentSystem && <Badge tone="info">{(AGENT_SYSTEMS[t.agentSystem as AgentSystemId]?.name ?? t.agentSystem)}</Badge>}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.type} · {formatDateTime(t.createdAt)}{t.error ? ` · ${t.error}` : ""}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Execution log</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {logs.length === 0 && <p className="text-sm text-muted-foreground">No log entries yet.</p>}
            {logs.map((l) => (
              <div key={l.id} className="rounded-lg border p-2 text-xs">
                <div className="flex items-center justify-between">
                  <Badge tone={LEVEL_TONE[l.level as keyof typeof LEVEL_TONE] ?? "muted"}>{l.level}</Badge>
                  <span className="text-muted-foreground">{formatDateTime(l.createdAt)}</span>
                </div>
                <p className="mt-1">{l.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
