import { Info } from "lucide-react";
import { resolveActiveCompany } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { InboxButtons } from "@/components/actions/inbox-buttons";
import { PLATFORM_LABELS, type Platform } from "@/lib/enums";

export const dynamic = "force-dynamic";

const SENTIMENT_TONE = { positive: "success", neutral: "muted", negative: "warning" } as const;

export default async function InboxPage() {
  const company = await resolveActiveCompany();
  if (!company) return <EmptyState title="No workspace selected" />;

  const messages = await prisma.communityMessage.findMany({ where: { companyId: company.id }, orderBy: { receivedAt: "desc" } });

  return (
    <div>
      <PageHeader title="Community Inbox" description="Comments, mentions and DMs with on-brand reply drafts. Replies are drafted, not sent — sending requires an authorised platform connection." />

      <Card className="mb-5 border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">These items are clearly-labelled <b>test fixtures</b> (no platform connected). Reply drafts are generated on-brand; actually sending them requires an authorised connection and is not performed here.</p>
        </CardContent>
      </Card>

      {messages.length === 0 ? (
        <EmptyState title="Inbox empty" description="Connect a platform or run the community agent to populate the inbox." />
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{m.author}</span>
                <Badge tone="info">{PLATFORM_LABELS[m.platform as Platform] ?? m.platform}</Badge>
                <Badge tone="muted">{m.kind}</Badge>
                {m.sentiment && <Badge tone={SENTIMENT_TONE[m.sentiment as keyof typeof SENTIMENT_TONE] ?? "muted"}>{m.sentiment}</Badge>}
                <StatusBadge status={m.source} />
                <div className="ml-auto"><StatusBadge status={m.status} /></div>
              </div>
              <p className="mt-2 text-sm">{m.text}</p>
              {m.replyDraft && (
                <div className="mt-3 rounded-lg border bg-secondary/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Suggested reply (draft)</p>
                  <p className="mt-1 text-sm">{m.replyDraft}</p>
                </div>
              )}
              <div className="mt-3"><InboxButtons messageId={m.id} status={m.status} /></div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
