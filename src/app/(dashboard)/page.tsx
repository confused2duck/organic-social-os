import Link from "next/link";
import {
  CalendarClock,
  Users,
  CheckCircle2,
  ListChecks,
  TrendingUp,
  Megaphone,
  ArrowRight,
  Info,
} from "lucide-react";
import { resolveActiveCompany } from "@/lib/tenant";
import { getOverview } from "@/lib/services/overview";
import { AGENT_SYSTEM_LIST, WORKFLOW_STAGES } from "@/lib/agent-systems";
import { PLATFORM_LABELS, type Platform } from "@/lib/enums";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const company = await resolveActiveCompany();
  if (!company) {
    return (
      <EmptyState
        title="No company workspace yet"
        description="Create your first company workspace to begin. The system keeps each company's data strictly separated."
        action={
          <Button asChild>
            <Link href="/onboarding">Create a company workspace</Link>
          </Button>
        }
      />
    );
  }

  const o = await getOverview(company.id);
  const connectedCount = o.connections.filter((c) => c.status === "connected").length;

  return (
    <div>
      <PageHeader
        title={`${company.name}`}
        description={company.industry ?? "Organic social media operations overview"}
      >
        {company.dataLabel === "illustrative_fixture" && <Badge tone="muted">Demo fixture data</Badge>}
        <Button asChild variant="outline" size="sm">
          <Link href="/strategy">Open strategy</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/calendar">Publishing calendar</Link>
        </Button>
      </PageHeader>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Weekly publishing slots"
          value={o.slotPlan.total}
          sub={`${o.config.platforms.length} platforms · ${o.slotPlan.publishingDays.length} days/wk`}
          icon={CalendarClock}
          tone="primary"
        />
        <StatCard
          label="Total followers"
          value={formatNumber(o.totalFollowers)}
          sub={o.platformSummary.length ? "across connected analytics" : "no analytics yet"}
          icon={Users}
        />
        <StatCard
          label="Posts in pipeline"
          value={o.counts.totalPosts}
          sub={`${o.counts.postCounts["published"] ?? 0} published · ${o.counts.postCounts["scheduled"] ?? 0} scheduled`}
          icon={Megaphone}
        />
        <StatCard
          label="Awaiting approval"
          value={o.counts.approvalsPending}
          sub={`${o.counts.taskCounts["pending"] ?? 0} tasks pending`}
          icon={CheckCircle2}
          tone={o.counts.approvalsPending > 0 ? "warning" : "default"}
        />
      </div>

      {/* Honesty notice */}
      <Card className="mt-5 border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-medium">Accurate capability state</p>
            <p className="text-muted-foreground">
              {connectedCount === 0
                ? "No social platforms are connected with authorised credentials, so publishing stays in a blocked/queued state and no post IDs are fabricated. "
                : `${connectedCount} platform(s) connected. `}
              Analytics shown are labelled {o.platformSummary[0]?.source === "test_fixture" ? "test fixtures" : "from their source"}; weekly reports via email remain unconfigured until SMTP is set.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Agent systems */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Seven agent systems</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2.5 sm:grid-cols-2">
            {AGENT_SYSTEM_LIST.map((s) => {
              const ready =
                (s.id === "B" && o.hasData.research) ||
                (s.id === "D" && o.hasData.strategy) ||
                (s.id === "F" && o.hasData.posts) ||
                (s.id === "G" && o.hasData.reports) ||
                (s.id === "C" && o.platformSummary.length > 0) ||
                s.id === "A";
              return (
                <div key={s.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                    {s.id}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.tagline}</p>
                  </div>
                  <Badge tone={ready ? "success" : "muted"} className="ml-auto shrink-0">
                    {ready ? "Active" : "Idle"}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Platform analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" /> Platform snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {o.platformSummary.length === 0 && (
              <p className="text-sm text-muted-foreground">No analytics imported yet.</p>
            )}
            {o.platformSummary.map((p) => (
              <div key={p.platform} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{PLATFORM_LABELS[p.platform as Platform] ?? p.platform}</span>
                  <StatusBadge status={p.source} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="font-semibold">{formatNumber(p.followers)}</p>
                    <p className="text-muted-foreground">followers</p>
                  </div>
                  <div>
                    <p className="font-semibold">{formatNumber(p.impressions7d)}</p>
                    <p className="text-muted-foreground">impr. 7d</p>
                  </div>
                  <div>
                    <p className="font-semibold text-success">+{formatNumber(p.followerDelta)}</p>
                    <p className="text-muted-foreground">30d</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Workflow + upcoming */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Continuous workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {WORKFLOW_STAGES.map((stage, i) => (
                <span key={stage} className="inline-flex items-center gap-1.5">
                  <Badge tone="outline">{stage}</Badge>
                  {i < WORKFLOW_STAGES.length - 1 && <ArrowRight className="size-3 text-muted-foreground" />}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next scheduled</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {o.upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No upcoming posts.{" "}
                <Link href="/strategy" className="text-primary hover:underline">
                  Generate a calendar
                </Link>
                .
              </p>
            )}
            {o.upcoming.map((post) => (
              <Link
                key={post.id}
                href={`/content/${post.id}`}
                className="block rounded-lg border p-2.5 transition-colors hover:bg-secondary"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{post.topic}</span>
                  <StatusBadge status={post.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {PLATFORM_LABELS[post.platform as Platform] ?? post.platform} · {formatDateTime(post.scheduledFor)}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
