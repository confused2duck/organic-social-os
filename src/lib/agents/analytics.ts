import { prisma } from "@/lib/db";
import { PLATFORM_LABELS, type Platform } from "@/lib/enums";

export interface AnalyticsInsights {
  period: { start: string; end: string };
  totals: { followers: number; followerDelta: number; impressions: number; engagements: number; engagementRate: number };
  byPlatform: {
    platform: string;
    followers: number;
    followerDelta: number;
    impressions: number;
    engagements: number;
    engagementRate: number;
  }[];
  bestPlatform?: string;
  worstPlatform?: string;
  topPosts: { id: string; topic: string; platform: string; impressions: number; engagements: number; engagementRate: number }[];
  bottomPosts: { id: string; topic: string; platform: string; impressions: number; engagements: number; engagementRate: number }[];
  byFormat: { format: string; posts: number; avgEngagementRate: number }[];
  dataSource: string;
  hasData: boolean;
}

/**
 * Agent C — Performance Intelligence. Deterministic calculations over stored
 * analytics snapshots and per-post metrics. No causal inference is asserted.
 */
export async function computeInsights(companyId: string, days = 30): Promise<AnalyticsInsights> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  const daily = await prisma.analyticsDaily.findMany({
    where: { companyId, date: { gte: start } },
    orderBy: { date: "asc" },
  });

  const platforms = [...new Set(daily.map((d) => d.platform))];
  const byPlatform = platforms.map((platform) => {
    const rows = daily.filter((d) => d.platform === platform);
    const first = rows[0];
    const last = rows[rows.length - 1];
    const impressions = rows.reduce((s, r) => s + r.impressions, 0);
    const engagements = rows.reduce((s, r) => s + r.engagements, 0);
    return {
      platform,
      followers: last?.followers ?? 0,
      followerDelta: (last?.followers ?? 0) - (first?.followers ?? 0),
      impressions,
      engagements,
      engagementRate: impressions > 0 ? engagements / impressions : 0,
    };
  });

  const sortedByEng = [...byPlatform].sort((a, b) => b.engagementRate - a.engagementRate);

  // Per-post metrics (published posts).
  const posts = await prisma.contentPost.findMany({
    where: { companyId, status: "published" },
    include: { metrics: true },
  });
  const postStats = posts
    .map((p) => {
      const m = p.metrics[0];
      const impressions = m?.impressions ?? 0;
      const engagements = (m?.likes ?? 0) + (m?.comments ?? 0) + (m?.shares ?? 0) + (m?.saves ?? 0);
      return {
        id: p.id,
        topic: p.topic,
        platform: p.platform,
        format: p.format,
        impressions,
        engagements,
        engagementRate: impressions > 0 ? engagements / impressions : 0,
      };
    })
    .filter((p) => p.impressions > 0);

  const rankedPosts = [...postStats].sort((a, b) => b.engagementRate - a.engagementRate);

  const formats = [...new Set(postStats.map((p) => p.format))];
  const byFormat = formats
    .map((format) => {
      const rows = postStats.filter((p) => p.format === format);
      return {
        format,
        posts: rows.length,
        avgEngagementRate: rows.length ? rows.reduce((s, r) => s + r.engagementRate, 0) / rows.length : 0,
      };
    })
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);

  const totalImpr = byPlatform.reduce((s, p) => s + p.impressions, 0);
  const totalEng = byPlatform.reduce((s, p) => s + p.engagements, 0);

  return {
    period: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
    totals: {
      followers: byPlatform.reduce((s, p) => s + p.followers, 0),
      followerDelta: byPlatform.reduce((s, p) => s + p.followerDelta, 0),
      impressions: totalImpr,
      engagements: totalEng,
      engagementRate: totalImpr > 0 ? totalEng / totalImpr : 0,
    },
    byPlatform,
    bestPlatform: sortedByEng[0] ? (PLATFORM_LABELS[sortedByEng[0].platform as Platform] ?? sortedByEng[0].platform) : undefined,
    worstPlatform: sortedByEng.length > 1 ? (PLATFORM_LABELS[sortedByEng[sortedByEng.length - 1].platform as Platform] ?? sortedByEng[sortedByEng.length - 1].platform) : undefined,
    topPosts: rankedPosts.slice(0, 3),
    bottomPosts: rankedPosts.slice(-3).reverse(),
    byFormat,
    dataSource: daily[0]?.source ?? "test_fixture",
    hasData: daily.length > 0,
  };
}
