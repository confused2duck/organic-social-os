import Link from "next/link";
import { resolveActiveCompany } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { getCompanyConfig } from "@/lib/services/overview";
import { computeWeeklySlots, startOfWeek } from "@/lib/scheduling";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { RunWorkflowButton } from "@/components/actions/run-workflow-button";
import { WEEKDAYS, PLATFORM_LABELS, type Platform } from "@/lib/enums";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const company = await resolveActiveCompany();
  if (!company) return <EmptyState title="No workspace selected" />;

  const config = await getCompanyConfig(company.id);
  const slotPlan = computeWeeklySlots(config);
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const posts = await prisma.contentPost.findMany({
    where: { companyId: company.id, scheduledFor: { gte: weekStart, lt: weekEnd } },
    orderBy: { scheduledFor: "asc" },
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div>
      <PageHeader
        title="Publishing Calendar"
        description={`Config-driven weekly plan: ${slotPlan.total} slots/week (${slotPlan.perPlatform.map((p) => `${PLATFORM_LABELS[p.platform as Platform] ?? p.platform} ${p.perDay}/day`).join(", ")} × ${slotPlan.publishingDays.length} days).`}
      >
        <RunWorkflowButton step="calendar" label="Generate this week" size="sm" />
      </PageHeader>

      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-center gap-4 p-4 text-sm">
          <span><b>{slotPlan.total}</b> weekly slots</span>
          <span className="text-muted-foreground">·</span>
          <span>{posts.length} scheduled this week</span>
          <span className="text-muted-foreground">·</span>
          <span>Publishing days: {slotPlan.publishingDayLabels.join(", ") || "none"}</span>
        </CardContent>
      </Card>

      {posts.length === 0 ? (
        <EmptyState
          title="No posts scheduled this week"
          description="Generate the calendar from your strategy and publishing configuration."
          action={<RunWorkflowButton step="calendar" label="Generate calendar" />}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((day) => {
            const dayPosts = posts.filter((p) => new Date(p.scheduledFor).toDateString() === day.toDateString());
            return (
              <div key={day.toISOString()} className="min-w-0">
                <div className="mb-2 text-center">
                  <p className="text-xs font-semibold">{WEEKDAYS[day.getDay()]}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDate(day, { day: "2-digit", month: "short" })}</p>
                </div>
                <div className="space-y-2">
                  {dayPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/content/${post.id}`}
                      className="block rounded-lg border bg-card p-2 text-xs transition-colors hover:bg-secondary"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium">{PLATFORM_LABELS[post.platform as Platform] ?? post.platform}</span>
                        <span className="text-muted-foreground">{new Date(post.scheduledFor).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="mt-1 line-clamp-2">{post.topic}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-1">
                        <Badge tone="muted">{post.format}</Badge>
                        <StatusBadge status={post.status} />
                      </div>
                    </Link>
                  ))}
                  {dayPosts.length === 0 && <p className="text-center text-[11px] text-muted-foreground">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
