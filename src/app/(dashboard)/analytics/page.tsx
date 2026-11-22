import { resolveActiveCompany } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { computeInsights } from "@/lib/agents";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { FollowersTrend, EngagementBars } from "@/components/charts/analytics-charts";
import { PLATFORM_LABELS, type Platform } from "@/lib/enums";
import { formatNumber, pct } from "@/lib/utils";
import { Users, Eye, Heart, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const company = await resolveActiveCompany();
  if (!company) return <EmptyState title="No workspace selected" />;

  const insights = await computeInsights(company.id, 30);

  if (!insights.hasData) {
    return (
      <div>
        <PageHeader title="Analytics" description="Deterministic analysis of connected or imported platform data." />
        <EmptyState title="No analytics data" description="Connect a platform or import data to see performance analysis." />
      </div>
    );
  }

  // Build a daily series for the followers trend.
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const daily = await prisma.analyticsDaily.findMany({ where: { companyId: company.id, date: { gte: since } }, orderBy: { date: "asc" } });
  const platforms = [...new Set(daily.map((d) => d.platform))];
  const byDate = new Map<string, Record<string, number | string>>();
  for (const d of daily) {
    const key = d.date.toISOString().slice(5, 10);
    const row = byDate.get(key) ?? { date: key };
    row[PLATFORM_LABELS[d.platform as Platform] ?? d.platform] = d.followers;
    byDate.set(key, row);
  }
  const trendData = [...byDate.values()];
  const platformLabels = platforms.map((p) => PLATFORM_LABELS[p as Platform] ?? p);

  return (
    <div>
      <PageHeader title="Analytics" description="Deterministic analysis over the last 30 days. Figures are labelled by source; no causality is inferred without evidence.">
        <StatusBadge status={insights.dataSource} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Followers" value={formatNumber(insights.totals.followers)} sub={`+${formatNumber(insights.totals.followerDelta)} (30d)`} icon={Users} tone="primary" />
        <StatCard label="Impressions" value={formatNumber(insights.totals.impressions)} icon={Eye} />
        <StatCard label="Engagements" value={formatNumber(insights.totals.engagements)} icon={Heart} />
        <StatCard label="Engagement rate" value={pct(insights.totals.engagementRate)} icon={TrendingUp} tone="success" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Follower growth</CardTitle></CardHeader>
          <CardContent><FollowersTrend data={trendData} platforms={platformLabels} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Engagement rate by platform</CardTitle></CardHeader>
          <CardContent><EngagementBars data={insights.byPlatform.map((p) => ({ platform: PLATFORM_LABELS[p.platform as Platform] ?? p.platform, engagementRate: p.engagementRate }))} /></CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top posts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {insights.topPosts.length === 0 && <p className="text-sm text-muted-foreground">No published posts with metrics yet.</p>}
            {insights.topPosts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                <span className="line-clamp-1">{p.topic}</span>
                <span className="shrink-0 font-medium text-success">{pct(p.engagementRate)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Format performance</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {insights.byFormat.map((f) => (
              <div key={f.format} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                <span className="capitalize">{f.format} <span className="text-muted-foreground">({f.posts})</span></span>
                <span className="font-medium">{pct(f.avgEngagementRate)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
