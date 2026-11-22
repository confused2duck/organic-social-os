import { resolveActiveCompany } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { parseJson, parseStringArray } from "@/lib/json";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { RunWorkflowButton } from "@/components/actions/run-workflow-button";
import { PLATFORM_LABELS, type Platform } from "@/lib/enums";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Pillar { name: string; description: string; weight: number }

export default async function StrategyPage() {
  const company = await resolveActiveCompany();
  if (!company) return <EmptyState title="No workspace selected" />;

  const strategy = await prisma.strategy.findFirst({
    where: { companyId: company.id, status: "active" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Strategy" description="Platform-specific organic strategy from brand knowledge, ICP, research and performance.">
        <RunWorkflowButton step="strategy" label="Generate strategy" variant="outline" size="sm" />
        <RunWorkflowButton step="calendar" label="Generate calendar" size="sm" />
      </PageHeader>

      {!strategy ? (
        <EmptyState
          title="No strategy yet"
          description="Generate an organic strategy from this company's brand knowledge, ICP and research."
          action={<RunWorkflowButton step="strategy" label="Generate strategy" />}
        />
      ) : (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{strategy.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge tone="outline">v{strategy.version}</Badge>
                  <Badge tone="info">{strategy.period}</Badge>
                  <StatusBadge status={strategy.status} />
                </div>
              </div>
              <p className="pt-1 text-sm text-muted-foreground">{strategy.summary}</p>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Generated {formatDate(strategy.createdAt)} · source labelled {strategy.generatedBy.replace(/_/g, " ")}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Content pillars</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {parseJson<Pillar[]>(strategy.pillars, []).map((p) => (
                  <div key={p.name} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.name}</span>
                      <Badge tone="neutral">{p.weight}%</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Objectives</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {parseStringArray(strategy.objectives).map((o, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Platform plans</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(parseJson<Record<string, { cadence: string; formats: string[]; focus: string }>>(strategy.platformPlans, {})).map(
                ([platform, plan]) => (
                  <div key={platform} className="rounded-lg border p-3">
                    <p className="font-medium">{PLATFORM_LABELS[platform as Platform] ?? platform}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.cadence}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {plan.formats?.map((f) => <Badge key={f} tone="muted">{f}</Badge>)}
                    </div>
                    <p className="mt-2 text-sm">{plan.focus}</p>
                  </div>
                ),
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
