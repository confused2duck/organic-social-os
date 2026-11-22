import { prisma } from "@/lib/db";
import { parseJson, parseStringArray, parseRecord } from "@/lib/json";
import { generateWeekSlots, startOfWeek, type PublishingConfig } from "@/lib/scheduling";
import { runResearch } from "./research";
import { runStrategy } from "./strategy";
import { runCalendar } from "./calendar";
import { runCreativeSpecs } from "./creative";
import { runCommunity } from "./community";
import { runWeeklyReport } from "./report";
import type { ContentPillar } from "./strategy";
import type { AgentResult } from "./types";

export { runResearch, runStrategy, runCalendar, runCreativeSpecs, runCommunity, runWeeklyReport };
export { computeInsights } from "./analytics";

function rand(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Generate PAST published posts with clearly-labelled test_fixture metrics so
 * Analytics and Weekly Reports have genuine stored data to compute over. These
 * demo posts are marked published (lifecycle) but NO external post IDs/URLs are
 * fabricated — the PublishAttempt is unverified with a null external URL.
 */
export async function generatePublishedHistory(companyId: string, weeksBack = 2): Promise<AgentResult> {
  const configRow = await prisma.companyConfig.findUnique({ where: { companyId } });
  const strategy = await prisma.strategy.findFirst({ where: { companyId, status: "active" }, orderBy: { createdAt: "desc" } });
  const config: PublishingConfig = {
    platforms: parseStringArray(configRow?.platforms),
    postsPerDay: parseRecord<number>(configRow?.postsPerDay),
    publishingDays: (parseStringArray(configRow?.publishingDays) as unknown as number[]).map(Number),
    preferredTimes: parseRecord<string[]>(configRow?.preferredTimes),
    timezone: configRow?.timezone ?? "UTC",
  };
  const pillars = parseJson<ContentPillar[]>(strategy?.pillars, [{ name: "Educate", description: "", weight: 1 }]);

  let created = 0;
  for (let w = weeksBack; w >= 1; w--) {
    const weekStart = startOfWeek(new Date());
    weekStart.setDate(weekStart.getDate() - w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    await prisma.contentPost.deleteMany({ where: { companyId, scheduledFor: { gte: weekStart, lt: weekEnd }, status: "published" } });

    const slots = generateWeekSlots(config, weekStart);
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const pillar = pillars[i % pillars.length];
      const post = await prisma.contentPost.create({
        data: {
          companyId,
          strategyId: strategy?.id ?? null,
          platform: slot.platform,
          format: ["static", "carousel", "reel", "text"][i % 4],
          scheduledFor: slot.date,
          slotIndex: slot.slotIndex,
          topic: `${pillar.name}: published example ${i + 1}`,
          objective: "Engagement",
          caption: `${pillar.name} post published in a prior week (demo history).`,
          hashtags: JSON.stringify(["#organicgrowth"]),
          status: "published",
        },
      });

      const r = rand(companyId + post.id);
      const impressions = 500 + Math.floor(r * 4000);
      const likes = Math.floor(impressions * (0.01 + r * 0.04));
      await prisma.postMetric.create({
        data: {
          companyId,
          postId: post.id,
          impressions,
          reach: Math.floor(impressions * 0.8),
          likes,
          comments: Math.floor(likes * 0.2),
          shares: Math.floor(likes * 0.1),
          saves: Math.floor(likes * 0.3),
          clicks: Math.floor(likes * 0.4),
          videoViews: post.format === "reel" ? Math.floor(impressions * 0.6) : 0,
          retentionPct: post.format === "reel" ? 30 + r * 40 : 0,
          source: "test_fixture",
        },
      });

      // Honest publish record: no external id/url fabricated, unverified.
      await prisma.publishAttempt.create({
        data: {
          companyId,
          postId: post.id,
          platform: slot.platform,
          status: "published",
          externalId: null,
          externalUrl: null,
          verified: false,
          idempotencyKey: `demo-${post.id}`,
          error: "Local demo history (no authorised platform connection; not externally verified).",
        },
      });
      created++;
    }
  }
  return { agentSystem: "F", created, notes: `${created} published demo posts with test_fixture metrics (no external IDs fabricated).` };
}

/**
 * Run the full organic workflow for a company:
 * Research → Strategy → Calendar → Creative specs → Community → (history) → Report.
 */
export async function runFullCycle(companyId: string, opts?: { withHistory?: boolean }): Promise<AgentResult[]> {
  const results: AgentResult[] = [];
  results.push(await runResearch(companyId));
  results.push(await runStrategy(companyId));
  results.push(await runCalendar(companyId));
  results.push(await runCreativeSpecs(companyId));
  results.push(await runCommunity(companyId));
  if (opts?.withHistory) results.push(await generatePublishedHistory(companyId, 2));
  results.push(await runWeeklyReport(companyId));
  return results;
}
