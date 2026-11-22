import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { resolveActiveCompany } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { PostEditor } from "@/components/actions/post-editor";
import { ApprovalButtons } from "@/components/actions/approval-buttons";
import { PublishButton, SubmitForApprovalButton } from "@/components/actions/publish-button";
import { RenderButton } from "@/components/actions/render-button";
import { EmptyState } from "@/components/layout/page-header";
import { PLATFORM_LABELS, type Platform } from "@/lib/enums";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({ params }: { params: { id: string } }) {
  const company = await resolveActiveCompany();
  if (!company) return <EmptyState title="No workspace selected" />;

  // Tenant-scoped lookup: a foreign id resolves to null → 404.
  const post = await prisma.contentPost.findFirst({
    where: { id: params.id, companyId: company.id },
    include: { creatives: true, attempts: { orderBy: { attemptedAt: "desc" } }, approvals: { orderBy: { createdAt: "desc" } } },
  });
  if (!post) notFound();

  const hashtags = parseJson<string[]>(post.hashtags, []);
  const creative = post.creatives[0];
  const slides = creative ? parseJson<{ renderedSlides?: string[] }>(creative.spec, {}).renderedSlides : undefined;

  return (
    <div>
      <Link href="/content" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Content Studio
      </Link>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-5">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{post.topic}</CardTitle>
                <StatusBadge status={post.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge tone="info">{PLATFORM_LABELS[post.platform as Platform] ?? post.platform}</Badge>
                <Badge tone="muted">{post.format}</Badge>
                <span className="text-xs text-muted-foreground">{formatDateTime(post.scheduledFor)} · {post.objective}</span>
              </div>
            </CardHeader>
            <CardContent>
              <PostEditor
                postId={post.id}
                initial={{ topic: post.topic, mainMessage: post.mainMessage ?? "", caption: post.caption ?? "", hashtags }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              {post.status === "awaiting_approval" && <ApprovalButtons postId={post.id} />}
              {["draft", "rejected"].includes(post.status) && <SubmitForApprovalButton postId={post.id} />}
              {["approved", "scheduled"].includes(post.status) && <PublishButton postId={post.id} />}
              {post.status === "blocked" && <PublishButton postId={post.id} />}
              <span className="text-xs text-muted-foreground">Current: {post.status.replace(/_/g, " ")}</span>
            </CardContent>
          </Card>

          {post.attempts.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Publishing attempts</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {post.attempts.map((a) => (
                  <div key={a.id} className="rounded-lg border p-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span>{PLATFORM_LABELS[a.platform as Platform] ?? a.platform}</span>
                      <StatusBadge status={a.status} />
                    </div>
                    {a.externalUrl ? (
                      <a href={a.externalUrl} className="text-xs text-primary hover:underline">{a.externalUrl}</a>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.error ?? "No external URL (not published to a platform)."}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Creative</CardTitle>
                {creative && <StatusBadge status={creative.capabilityState} />}
              </div>
            </CardHeader>
            <CardContent>
              {!creative ? (
                <p className="text-sm text-muted-foreground">No creative generated yet.</p>
              ) : creative.capabilityState !== "rendered" && creative.capabilityState !== "awaiting_render_runtime" ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Creative spec ready ({creative.type}). Render to produce the real asset.</p>
                  <RenderButton creativeId={creative.id} label="Render creative" />
                </div>
              ) : (
                <div className="space-y-3">
                  {creative.renderPath?.endsWith(".mp4") ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={creative.renderPath} controls className="w-full rounded-lg border" />
                  ) : slides && slides.length > 1 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {slides.map((s, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={s} alt={`Slide ${i + 1}`} className="w-full rounded-md border" />
                      ))}
                    </div>
                  ) : creative.renderPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={creative.renderPath} alt={creative.title} className="w-full rounded-lg border" />
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {creative.type} {creative.width ? `· ${creative.width}×${creative.height}` : ""}
                      {creative.capabilityState === "awaiting_render_runtime" && " · video encoder unavailable (poster shown)"}
                    </span>
                    {creative.renderPath && (
                      <a href={creative.renderPath} download className="text-xs text-primary hover:underline">Download</a>
                    )}
                  </div>
                  <RenderButton creativeId={creative.id} label="Re-render" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Audience:</span> {post.targetAudience ?? "—"}</p>
              <p><span className="text-muted-foreground">Creative brief:</span> {post.creativeRequirements ?? "—"}</p>
              <div className="flex flex-wrap gap-1 pt-1">{hashtags.map((h) => <Badge key={h} tone="muted">{h}</Badge>)}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
