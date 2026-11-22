import { prisma } from "@/lib/db";
import { parseStringArray, parseRecord } from "@/lib/json";
import { computeWeeklySlots, type PublishingConfig } from "@/lib/scheduling";

export async function getCompanyConfig(companyId: string): Promise<PublishingConfig> {
  const config = await prisma.companyConfig.findUnique({ where: { companyId } });
  return {
    platforms: parseStringArray(config?.platforms),
    postsPerDay: parseRecord<number>(config?.postsPerDay),
    publishingDays: (parseStringArray(config?.publishingDays) as unknown as number[]) ?? [],
    preferredTimes: parseRecord<string[]>(config?.preferredTimes),
    timezone: config?.timezone ?? "UTC",
  };
}

function toNums(arr: unknown): number[] {
  return Array.isArray(arr) ? arr.map((n) => Number(n)).filter((n) => !Number.isNaN(n)) : [];
}

export async function getOverview(companyId: string) {
  const configRow = await prisma.companyConfig.findUnique({ where: { companyId } });
  const config: PublishingConfig = {
    platforms: parseStringArray(configRow?.platforms),
    postsPerDay: parseRecord<number>(configRow?.postsPerDay),
    publishingDays: toNums(JSON.parse(configRow?.publishingDays ?? "[]")),
    preferredTimes: parseRecord<string[]>(configRow?.preferredTimes),
    timezone: configRow?.timezone ?? "UTC",
  };
  const slotPlan = computeWeeklySlots(config);

  const [posts, tasks, approvalsPending, research, reports, creatives, communityNew, connections] =
    await Promise.all([
      prisma.contentPost.groupBy({ by: ["status"], where: { companyId }, _count: true }),
      prisma.task.groupBy({ by: ["status"], where: { companyId }, _count: true }),
      prisma.approval.count({ where: { companyId, status: "pending" } }),
      prisma.researchItem.count({ where: { companyId } }),
      prisma.report.count({ where: { companyId } }),
      prisma.creativeAsset.count({ where: { companyId } }),
      prisma.communityMessage.count({ where: { companyId, status: "new" } }),
      prisma.platformConnection.findMany({ where: { companyId } }),
    ]);

  const postCounts = Object.fromEntries(posts.map((p) => [p.status, p._count]));
  const taskCounts = Object.fromEntries(tasks.map((t) => [t.status, t._count]));
  const totalPosts = posts.reduce((s, p) => s + p._count, 0);

  // Analytics summary (last 30 days). Deterministic, from stored snapshots.
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const analytics = await prisma.analyticsDaily.findMany({
    where: { companyId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  const byPlatform = new Map<string, typeof analytics>();
  for (const a of analytics) {
    const list = byPlatform.get(a.platform) ?? [];
    list.push(a);
    byPlatform.set(a.platform, list);
  }
  const platformSummary = [...byPlatform.entries()].map(([platform, rows]) => {
    const last = rows[rows.length - 1];
    const first = rows[0];
    const last7 = rows.slice(-7);
    return {
      platform,
      followers: last?.followers ?? 0,
      followerDelta: (last?.followers ?? 0) - (first?.followers ?? 0),
      impressions7d: last7.reduce((s, r) => s + r.impressions, 0),
      engagements7d: last7.reduce((s, r) => s + r.engagements, 0),
      source: last?.source ?? "test_fixture",
    };
  });

  const upcoming = await prisma.contentPost.findMany({
    where: { companyId, scheduledFor: { gte: new Date() } },
    orderBy: { scheduledFor: "asc" },
    take: 5,
  });

  return {
    config,
    slotPlan,
    counts: {
      totalPosts,
      postCounts,
      taskCounts,
      approvalsPending,
      research,
      reports,
      creatives,
      communityNew,
    },
    connections,
    platformSummary,
    upcoming,
    totalFollowers: platformSummary.reduce((s, p) => s + p.followers, 0),
    hasData: {
      research: research > 0,
      strategy: (await prisma.strategy.count({ where: { companyId } })) > 0,
      posts: totalPosts > 0,
      reports: reports > 0,
    },
  };
}
