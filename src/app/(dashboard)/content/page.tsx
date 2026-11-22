import Link from "next/link";
import { resolveActiveCompany } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { RunWorkflowButton } from "@/components/actions/run-workflow-button";
import { POST_STATUSES, PLATFORM_LABELS, type Platform } from "@/lib/enums";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContentPage({ searchParams }: { searchParams: { status?: string; platform?: string } }) {
  const company = await resolveActiveCompany();
  if (!company) return <EmptyState title="No workspace selected" />;

  const where: { companyId: string; status?: string; platform?: string } = { companyId: company.id };
  if (searchParams.status && POST_STATUSES.includes(searchParams.status as never)) where.status = searchParams.status;
  if (searchParams.platform) where.platform = searchParams.platform;

  const posts = await prisma.contentPost.findMany({
    where,
    orderBy: { scheduledFor: "desc" },
    take: 100,
    include: { creatives: { select: { capabilityState: true, thumbnailPath: true, type: true } } },
  });
  const statusCounts = await prisma.contentPost.groupBy({ by: ["status"], where: { companyId: company.id }, _count: true });

  return (
    <div>
      <PageHeader title="Content Studio" description="Every post with its caption, format, schedule and creative. Edit copy, then approve and queue for publishing.">
        <RunWorkflowButton step="calendar" label="Generate posts" variant="outline" size="sm" />
        <RunWorkflowButton step="full" label="Run full cycle" size="sm" />
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/content" className="rounded-full border px-3 py-1 hover:bg-secondary">All ({posts.length ? undefined : 0}{statusCounts.reduce((s, c) => s + c._count, 0)})</Link>
        {statusCounts.map((c) => (
          <Link key={c.status} href={`/content?status=${c.status}`} className="rounded-full border px-3 py-1 hover:bg-secondary">
            {c.status.replace(/_/g, " ")} ({c._count})
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <EmptyState
          title="No content yet"
          description="Generate a content calendar from your strategy. Each slot becomes an editable post."
          action={<RunWorkflowButton step="calendar" label="Generate posts" />}
        />
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const hashtags = parseJson<string[]>(post.hashtags, []);
            const creative = post.creatives[0];
            return (
              <Link key={post.id} href={`/content/${post.id}`}>
                <Card className="flex items-center gap-4 p-3 transition-colors hover:bg-secondary/50">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-secondary text-xs text-muted-foreground">
                    {creative?.thumbnailPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={creative.thumbnailPath} alt="" className="size-full object-cover" />
                    ) : (
                      post.format
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{post.topic}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{post.caption}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge tone="info">{PLATFORM_LABELS[post.platform as Platform] ?? post.platform}</Badge>
                      <Badge tone="muted">{post.format}</Badge>
                      <span>{formatDateTime(post.scheduledFor)}</span>
                      {hashtags.length > 0 && <span className="hidden sm:inline">{hashtags.slice(0, 2).join(" ")}</span>}
                    </div>
                  </div>
                  <StatusBadge status={post.status} />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
