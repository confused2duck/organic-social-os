import Link from "next/link";
import { resolveActiveCompany } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApprovalButtons } from "@/components/actions/approval-buttons";
import { PLATFORM_LABELS, type Platform } from "@/lib/enums";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const company = await resolveActiveCompany();
  if (!company) return <EmptyState title="No workspace selected" />;

  const pending = await prisma.approval.findMany({
    where: { companyId: company.id, status: "pending" },
    include: { post: { include: { creatives: { select: { thumbnailPath: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  const recent = await prisma.approval.findMany({
    where: { companyId: company.id, status: { in: ["approved", "rejected"] } },
    orderBy: { decidedAt: "desc" },
    take: 8,
    include: { post: { select: { topic: true } } },
  });

  return (
    <div>
      <PageHeader title="Approvals" description="Approve or reject posts before they are scheduled. Approval rules are enforced by your automation settings." />

      {pending.length === 0 ? (
        <EmptyState title="No pending approvals" description="Generated posts that require approval will appear here." />
      ) : (
        <div className="space-y-3">
          {pending.map((a) => {
            const post = a.post;
            if (!post) return null;
            return (
              <Card key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-secondary">
                  {post.creatives[0]?.thumbnailPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.creatives[0].thumbnailPath} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">{post.format}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/content/${post.id}`} className="font-medium hover:underline">{post.topic}</Link>
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{post.caption}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge tone="info">{PLATFORM_LABELS[post.platform as Platform] ?? post.platform}</Badge>
                    <Badge tone="muted">{post.format}</Badge>
                    <span>{formatDateTime(post.scheduledFor)}</span>
                  </div>
                </div>
                <ApprovalButtons postId={post.id} />
              </Card>
            );
          })}
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Recent decisions</h3>
          <Card>
            <CardContent className="divide-y p-0">
              {recent.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="line-clamp-1">{a.post?.topic ?? "—"}</span>
                  <Badge tone={a.status === "approved" ? "success" : "danger"}>{a.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
