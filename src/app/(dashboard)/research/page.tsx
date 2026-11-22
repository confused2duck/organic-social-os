import { resolveActiveCompany } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RunWorkflowButton } from "@/components/actions/run-workflow-button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CONF_TONE = { high: "success", medium: "info", low: "warning" } as const;

export default async function ResearchPage() {
  const company = await resolveActiveCompany();
  if (!company) return <EmptyState title="No workspace selected" />;

  const items = await prisma.researchItem.findMany({
    where: { companyId: company.id },
    include: { sources: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Research & Trends"
        description="Company-specific research grounded in your brand, competitors and personas. Sources and confidence are recorded; nothing is fabricated."
      >
        <RunWorkflowButton step="research" label="Run research" size="sm" />
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState
          title="No research yet"
          description="Generate company-specific research from the brand knowledge and competitors you've configured."
          action={<RunWorkflowButton step="research" label="Run research" />}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((it) => (
            <Card key={it.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{it.title}</CardTitle>
                  <Badge tone={CONF_TONE[it.confidence as keyof typeof CONF_TONE] ?? "neutral"}>
                    {it.confidence} confidence
                  </Badge>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Badge tone="muted">{it.category}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {it.generatedBy.replace(/_/g, " ")} · {formatDate(it.createdAt)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{it.summary}</p>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{it.body}</p>
                {it.sources.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground">Sources</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      {it.sources.map((s) => (
                        <li key={s.id}>
                          {s.url ? (
                            <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              {s.title}
                            </a>
                          ) : (
                            <span>{s.title}</span>
                          )}
                          {s.retrievedDate && <span className="text-muted-foreground"> · retrieved {s.retrievedDate}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
