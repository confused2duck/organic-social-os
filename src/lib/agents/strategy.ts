import { prisma } from "@/lib/db";
import { parseStringArray, parseRecord } from "@/lib/json";
import { loadBrandContext } from "./context";
import { computeWeeklySlots } from "@/lib/scheduling";
import { PLATFORM_LABELS, type Platform } from "@/lib/enums";
import type { AgentResult } from "./types";

export interface ContentPillar {
  name: string;
  description: string;
  weight: number;
}

/**
 * Agent D — Strategy. Produces a platform-specific organic strategy from brand
 * knowledge, ICP, research and the company's publishing configuration.
 */
export async function runStrategy(companyId: string): Promise<AgentResult> {
  const ctx = await loadBrandContext(companyId);
  const configRow = await prisma.companyConfig.findUnique({ where: { companyId } });
  const platforms = parseStringArray(configRow?.platforms);
  const postsPerDay = parseRecord<number>(configRow?.postsPerDay);
  const publishingDays = (parseStringArray(configRow?.publishingDays) as unknown as number[]).map(Number);
  const slotPlan = computeWeeklySlots({
    platforms,
    postsPerDay,
    publishingDays,
    preferredTimes: parseRecord<string[]>(configRow?.preferredTimes),
    timezone: configRow?.timezone ?? "UTC",
  });

  const keyMessages = ctx.messaging.keyMessages ?? [];
  const valueProps = ctx.messaging.valueProps ?? [];
  const differentiator = ctx.differentiators[0];
  const product = ctx.products[0];

  const pillars: ContentPillar[] = [
    { name: "Educate", description: `Teach ${ctx.icp.segments?.[0] ?? "the audience"} something useful about ${ctx.industry ?? "the category"}.`, weight: 30 },
    { name: "Proof", description: `Show evidence for "${valueProps[0] ?? ctx.tagline ?? "the core value"}"${differentiator ? ` and our differentiator "${differentiator}"` : ""}${product ? ` via ${product.name}` : ""} — results, examples, process.`, weight: 25 },
    { name: "Point of view", description: keyMessages[0] ? `Take a clear stance: "${keyMessages[0]}".` : "Share an opinionated take on the category.", weight: 25 },
    { name: "Community", description: "Engage, answer, and spotlight the audience and customers.", weight: 20 },
  ];

  const objectives = [
    // Lead with the company's own marketing objectives when provided.
    ...ctx.objectives.map((o) => `Support marketing objective: ${o}.`),
    `Grow qualified organic reach among ${ctx.icps.map((i) => i.name ?? i.segments?.[0]).filter(Boolean).join(" & ") || ctx.icp.segments?.join(" & ") || "the ICP"}.`,
    `Consistently publish ${slotPlan.total} posts/week across ${platforms.map((p) => PLATFORM_LABELS[p as Platform] ?? p).join(", ")}.`,
    `Reinforce the positioning: ${ctx.positioning ?? "(set positioning)"}.`,
    "Improve engagement rate week-over-week via the best-performing formats.",
  ];

  const platformPlans: Record<string, { cadence: string; formats: string[]; focus: string }> = {};
  for (const p of platforms) {
    const perDay = postsPerDay[p] ?? 0;
    platformPlans[p] = {
      cadence: `${perDay}/day on ${publishingDays.length} days (${perDay * publishingDays.length}/wk)`,
      formats: platformFormats(p),
      focus: platformFocus(p, ctx),
    };
  }

  // Supersede previous active strategy; keep history.
  await prisma.strategy.updateMany({ where: { companyId, status: "active" }, data: { status: "superseded" } });
  const prior = await prisma.strategy.count({ where: { companyId } });

  await prisma.strategy.create({
    data: {
      companyId,
      title: `${ctx.name} — Organic Social Strategy`,
      period: weekLabel(new Date()),
      summary: `A ${pillars.length}-pillar organic strategy for ${ctx.name} targeting ${ctx.icp.segments?.join(", ") ?? "the ICP"}, delivering ${slotPlan.total} posts/week.`,
      objectives: JSON.stringify(objectives),
      pillars: JSON.stringify(pillars),
      platformPlans: JSON.stringify(platformPlans),
      version: prior + 1,
      status: "active",
      generatedBy: "deterministic_generation",
    },
  });

  return { agentSystem: "D", created: 1, notes: `Strategy v${prior + 1} with ${pillars.length} pillars across ${platforms.length} platforms.` };
}

function platformFormats(platform: string): string[] {
  switch (platform) {
    case "LINKEDIN":
      return ["text", "carousel", "document", "video"];
    case "INSTAGRAM":
      return ["reel", "carousel", "static", "story"];
    case "FACEBOOK":
      return ["static", "video", "text"];
    case "YOUTUBE":
      return ["short", "video"];
    case "TIKTOK":
      return ["short", "reel"];
    default:
      return ["static", "text"];
  }
}

function platformFocus(platform: string, ctx: { industry: string | null }): string {
  switch (platform) {
    case "LINKEDIN":
      return "Thought leadership and proof for a professional audience.";
    case "INSTAGRAM":
      return "Visual storytelling, reels and carousels that build affinity.";
    case "FACEBOOK":
      return "Community updates and reach among existing audience.";
    case "YOUTUBE":
      return "Discoverable short-form and educational video.";
    case "TIKTOK":
      return "Native, trend-aware short video.";
    default:
      return `Organic presence for ${ctx.industry ?? "the brand"}.`;
  }
}

export function weekLabel(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
