import Link from "next/link";
import { resolveActiveCompany } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { RenderAllButton } from "@/components/actions/render-button";
import { RunWorkflowButton } from "@/components/actions/run-workflow-button";

export const dynamic = "force-dynamic";

export default async function CreativePage() {
  const company = await resolveActiveCompany();
  if (!company) return <EmptyState title="No workspace selected" />;

  const creatives = await prisma.creativeAsset.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    include: { post: { select: { id: true, topic: true, platform: true } } },
  });
  const counts = {
    rendered: creatives.filter((c) => c.capabilityState === "rendered").length,
    awaiting: creatives.filter((c) => c.capabilityState === "awaiting_render_runtime").length,
    draft: creatives.filter((c) => c.capabilityState === "draft").length,
  };

  return (
    <div>
      <PageHeader title="Creative Studio" description="Finished branded assets — static graphics, multi-slide carousels and real video — rendered deterministically (SVG→PNG via sharp, MP4 via ffmpeg).">
        <RunWorkflowButton step="creative" label="Generate specs" variant="outline" size="sm" />
        <RenderAllButton />
      </PageHeader>

      <Card className="mb-5 flex flex-wrap items-center gap-4 p-4 text-sm">
        <span><b>{counts.rendered}</b> rendered</span>
        <span className="text-muted-foreground">·</span>
        <span><b>{counts.draft}</b> spec only</span>
        <span className="text-muted-foreground">·</span>
        <span><b>{counts.awaiting}</b> awaiting video runtime</span>
      </Card>

      {creatives.length === 0 ? (
        <EmptyState
          title="No creatives yet"
          description="Generate creative specs from your content, then render real assets."
          action={<RunWorkflowButton step="creative" label="Generate creative specs" />}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {creatives.map((c) => (
            <Link key={c.id} href={c.post ? `/content/${c.post.id}` : "/creative"}>
              <Card className="group overflow-hidden transition-shadow hover:shadow-md">
                <div className="relative flex aspect-square items-center justify-center bg-secondary">
                  {c.thumbnailPath || c.renderPath ? (
                    c.renderPath?.endsWith(".mp4") ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video src={c.renderPath} className="size-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.thumbnailPath ?? c.renderPath ?? ""} alt={c.title} className="size-full object-cover" />
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground">{c.type}</span>
                  )}
                  <div className="absolute left-2 top-2"><Badge tone="info">{c.type.replace(/_/g, " ")}</Badge></div>
                </div>
                <div className="space-y-1 p-2.5">
                  <p className="line-clamp-1 text-sm font-medium">{c.post?.topic ?? c.title}</p>
                  <StatusBadge status={c.capabilityState} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
