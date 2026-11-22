import Link from "next/link";
import { Info, CheckCircle2, AlertTriangle, ExternalLink, Heart, MessageCircle } from "lucide-react";
import { resolveActiveCompany } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { PLATFORM_LABELS, type Platform } from "@/lib/enums";
import { InstagramControls } from "@/components/connections/instagram-controls";
import {
  verifyConnection,
  instagramOAuthConfig,
  testTokenConfigured,
  type InstagramMedia,
  type InstagramInsights,
  type InstagramAccount,
} from "@/lib/integrations/instagram";
import { getInstagramToken, parseStoredProfile } from "@/lib/integrations/instagram-store";

export const dynamic = "force-dynamic";

const CAPS = [
  { key: "publish", label: "Publishing" },
  { key: "schedule", label: "Scheduling" },
  { key: "analytics", label: "Analytics import" },
  { key: "inbox", label: "Community inbox" },
];

type IgConn = Awaited<ReturnType<typeof prisma.platformConnection.findUnique>>;

interface LiveSnapshot {
  live: boolean; // true = fetched live this render; false = stored snapshot fallback
  error?: string;
  account?: InstagramAccount;
  media?: InstagramMedia[];
  insights?: InstagramInsights | null;
  fetchedAt?: string;
}

async function loadInstagramLive(conn: NonNullable<IgConn>): Promise<LiveSnapshot> {
  const token = getInstagramToken(conn);
  const stored = parseStoredProfile(conn);
  if (!token) {
    return { live: false, error: "Stored credential unavailable.", account: storedToAccount(conn, stored), insights: stored.insights ?? null };
  }
  const scopes = conn.scopes ? (JSON.parse(conn.scopes) as string[]) : undefined;
  const v = await verifyConnection(token, { grantedScopes: scopes, withMedia: true, withInsights: true });
  if (!v.ok || !v.account) {
    // Fall back to the last genuine snapshot, clearly labelled.
    return { live: false, error: v.error, account: storedToAccount(conn, stored), insights: stored.insights ?? null };
  }
  return { live: true, account: v.account, media: v.recentMedia, insights: v.insights ?? null, fetchedAt: new Date().toISOString() };
}

function storedToAccount(conn: NonNullable<IgConn>, stored: ReturnType<typeof parseStoredProfile>): InstagramAccount | undefined {
  const p = stored.profile;
  if (!p) return undefined;
  return {
    id: conn.externalId ?? "",
    userId: conn.externalId ?? "",
    username: p.username,
    name: p.name,
    accountType: p.accountType,
    mediaCount: p.mediaCount,
    followersCount: p.followersCount,
    followsCount: p.followsCount,
    profilePictureUrl: p.profilePictureUrl,
    biography: p.biography,
    website: p.website,
  };
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-center">
      <div className="text-lg font-semibold tabular-nums">{typeof value === "number" ? value.toLocaleString() : "—"}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function InstagramPanel({ conn, snap, env }: { conn: NonNullable<IgConn>; snap: LiveSnapshot; env: { testToken: boolean; oauth: boolean } }) {
  const a = snap.account;
  const connected = conn.status === "connected";
  const sourceLabel = conn.dataSource === "oauth" ? "OAuth (per-company)" : conn.dataSource === "env_test_token" ? "Developer test token" : "—";

  return (
    <Card className="mb-5 overflow-hidden">
      <div className="sunset-gradient px-5 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {a?.profilePictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.profilePictureUrl} alt="" className="size-12 rounded-full border-2 border-white/40 object-cover" />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-full bg-white/20 text-lg font-semibold">
                {(a?.username ?? "IG").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{a?.username ? `@${a.username}` : "Instagram"}</span>
                {connected && snap.live && (
                  <Badge tone="success" className="bg-white/20 text-white">● LIVE</Badge>
                )}
                {connected && !snap.live && (
                  <Badge tone="warning" className="bg-white/20 text-white">stored snapshot</Badge>
                )}
              </div>
              <p className="text-sm text-white/80">{a?.name ?? "Instagram account"}{a?.accountType ? ` · ${a.accountType}` : ""}</p>
            </div>
          </div>
          <StatusBadge status={conn.status} />
        </div>
      </div>

      <CardContent className="space-y-4 p-5">
        {!connected && (
          <p className="text-sm text-muted-foreground">
            No Instagram account is connected to this workspace yet. Connecting performs a read-only verification first — it never posts.
          </p>
        )}

        {conn.lastError && conn.status !== "connected" && (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <span className="text-muted-foreground">Last attempt: {conn.lastError}</span>
          </div>
        )}

        {connected && a && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Followers" value={a.followersCount} />
              <Stat label="Following" value={a.followsCount} />
              <Stat label="Posts" value={a.mediaCount} />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Account id: <span className="font-mono">{conn.externalId}</span></span>
              <span>Credential: {sourceLabel}</span>
              {snap.fetchedAt && <span>Fetched live: {new Date(snap.fetchedAt).toLocaleString()}</span>}
              {!snap.live && snap.error && <span className="text-warning">Live refresh failed: {snap.error}</span>}
            </div>

            {/* Insights — genuine or honestly unavailable */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account insights</div>
              {snap.insights?.available ? (
                <div className="flex flex-wrap gap-4">
                  {snap.insights.metrics.map((m) => (
                    <div key={m.name} className="text-sm">
                      <span className="font-semibold tabular-nums">{m.value.toLocaleString()}</span>{" "}
                      <span className="text-muted-foreground">{m.name}{m.period ? ` / ${m.period}` : ""}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Insights unavailable{snap.insights?.reason ? ` — ${snap.insights.reason}` : ""}. No numbers are shown rather than estimated.
                </p>
              )}
            </div>

            {/* Recent media — real posts from the authorised account */}
            {snap.media && snap.media.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent media (live)</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {snap.media.map((m) => (
                    <a key={m.id} href={m.permalink} target="_blank" rel="noopener noreferrer" className="group relative block aspect-square overflow-hidden rounded-md border bg-secondary">
                      {m.mediaUrl || m.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.thumbnailUrl || m.mediaUrl} alt={m.caption?.slice(0, 60) ?? ""} className="size-full object-cover transition group-hover:scale-105" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">{m.mediaType}</div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/45 px-1.5 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                        <span className="flex items-center gap-0.5"><Heart className="size-3" />{m.likeCount ?? 0}</span>
                        <span className="flex items-center gap-0.5"><MessageCircle className="size-3" />{m.commentsCount ?? 0}</span>
                        <ExternalLink className="size-3" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Read-only connection. Publishing to this account stays disabled until you explicitly authorise it — no posts, comments or messages are sent from here.</span>
            </div>
          </>
        )}

        <InstagramControls connected={connected} testToken={env.testToken} oauth={env.oauth} />
      </CardContent>
    </Card>
  );
}

export default async function ConnectionsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const company = await resolveActiveCompany();
  if (!company) return <EmptyState title="No workspace selected" />;

  const connections = await prisma.platformConnection.findMany({ where: { companyId: company.id }, orderBy: { platform: "asc" } });
  const ig = connections.find((c) => c.platform === "INSTAGRAM") ?? null;
  const others = connections.filter((c) => c.platform !== "INSTAGRAM");

  const env = { testToken: testTokenConfigured(), oauth: instagramOAuthConfig().configured };
  const snap: LiveSnapshot | null = ig && ig.status === "connected" ? await loadInstagramLive(ig) : null;

  const igConnected = searchParams.ig_connected === "1";
  const igError = searchParams.ig_error;
  const igUser = searchParams.ig_user;

  return (
    <div>
      <PageHeader title="Connected Pages" description="Authorised platform connections. A page is shown as connected only when a real, verified authorisation exists — no status, metric or post is ever fabricated." />

      {igConnected && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
          <span>Instagram authorised{igUser ? ` as @${igUser}` : ""} and verified (read-only).</span>
        </div>
      )}
      {igError && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span>Instagram authorisation did not complete: {igError}</span>
        </div>
      )}

      {/* Instagram gets a dedicated live panel (the integration focus). */}
      {ig ? (
        <InstagramPanel conn={ig} snap={snap ?? { live: false }} env={env} />
      ) : (
        <Card className="mb-5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <CardTitle className="text-base">Instagram</CardTitle>
              <p className="text-sm text-muted-foreground">Not set up for this workspace yet.</p>
            </div>
            <InstagramControls connected={false} testToken={env.testToken} oauth={env.oauth} />
          </CardContent>
        </Card>
      )}

      <Card className="mb-5 border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            Other platforms (LinkedIn, Facebook, YouTube, TikTok) require their own authorised API credentials or a verified connector. Until those are configured, publishing stays <b>blocked</b> and no post IDs, URLs or confirmations are ever fabricated. LinkedIn is currently paused.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {others.map((c) => {
          const caps = parseJson<Record<string, boolean>>(c.capabilities, {});
          return (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{PLATFORM_LABELS[c.platform as Platform] ?? c.platform}</CardTitle>
                  <StatusBadge status={c.status} />
                </div>
                {c.handle && <p className="text-xs text-muted-foreground">@{c.handle}</p>}
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {CAPS.map((cap) => (
                    <div key={cap.key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{cap.label}</span>
                      <Badge tone={caps[cap.key] ? "success" : "muted"}>{caps[cap.key] ? "available" : "unavailable"}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
