import { prisma } from "@/lib/db";
import { parseJson, parseStringArray, parseRecord } from "@/lib/json";
import { loadBrandContext } from "./context";
import { generateWeekSlots, startOfWeek, type PublishingConfig } from "@/lib/scheduling";
import { PLATFORM_LABELS, type Platform } from "@/lib/enums";
import type { ContentPillar } from "./strategy";
import type { AgentResult } from "./types";

/**
 * Agent D — Content Calendar. Generates concrete scheduled posts for a target
 * week from the active strategy pillars and the publishing configuration. The
 * number of slots is driven entirely by config (posts/day × platforms × days).
 */
export async function runCalendar(companyId: string, weekStartInput?: Date): Promise<AgentResult> {
  const ctx = await loadBrandContext(companyId);
  const configRow = await prisma.companyConfig.findUnique({ where: { companyId } });
  const strategy = await prisma.strategy.findFirst({
    where: { companyId, status: "active" },
    orderBy: { createdAt: "desc" },
  });

  const config: PublishingConfig = {
    platforms: parseStringArray(configRow?.platforms),
    postsPerDay: parseRecord<number>(configRow?.postsPerDay),
    publishingDays: (parseStringArray(configRow?.publishingDays) as unknown as number[]).map(Number),
    preferredTimes: parseRecord<string[]>(configRow?.preferredTimes),
    timezone: configRow?.timezone ?? "UTC",
  };
  const contentFormats = parseStringArray(configRow?.contentFormats);
  const pillars = parseJson<ContentPillar[]>(strategy?.pillars, [
    { name: "Educate", description: "", weight: 1 },
    { name: "Proof", description: "", weight: 1 },
    { name: "Point of view", description: "", weight: 1 },
    { name: "Community", description: "", weight: 1 },
  ]);
  const platformPlans = parseRecord<{ formats: string[]; focus: string }>(strategy?.platformPlans);
  const approvalRequired = configRow?.approvalRequired ?? true;

  const weekStart = weekStartInput ? startOfWeek(weekStartInput) : startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // Clear non-published posts in the target week (idempotent regeneration).
  await prisma.contentPost.deleteMany({
    where: {
      companyId,
      scheduledFor: { gte: weekStart, lt: weekEnd },
      status: { in: ["draft", "awaiting_approval", "approved", "scheduled", "processing"] },
    },
  });

  const slots = generateWeekSlots(config, weekStart);
  const personas = await prisma.persona.findMany({ where: { companyId } });
  const personaNames = personas.map((p) => p.name);
  // Draw copy from value props + differentiators + product names so posts are
  // specific to this company, not generic.
  const valueProps = [
    ...(ctx.messaging.valueProps ?? []),
    ...ctx.differentiators,
    ...ctx.products.map((p) => p.name),
  ];

  let created = 0;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const pillar = pillars[i % pillars.length];
    const planFormats = platformPlans[slot.platform]?.formats ?? [];
    const allowed = planFormats.filter((f) => contentFormats.length === 0 || contentFormats.includes(f));
    const format = (allowed[i % Math.max(1, allowed.length)] ?? planFormats[0] ?? contentFormats[0] ?? "static") as string;
    const audience = personaNames[i % Math.max(1, personaNames.length)] ?? (ctx.icp.segments?.[0] ?? "Target audience");
    const valueProp = valueProps[i % Math.max(1, valueProps.length)] ?? ctx.tagline ?? ctx.positioning ?? "";

    const topic = `${pillar.name}: ${angleFor(pillar.name, ctx, valueProp)}`;
    const mainMessage = messageFor(pillar.name, ctx, valueProp);
    const caption = captionFor(pillar.name, ctx, valueProp, slot.platform);
    const hashtags = hashtagsFor(ctx, slot.platform);

    const post = await prisma.contentPost.create({
      data: {
        companyId,
        strategyId: strategy?.id ?? null,
        platform: slot.platform,
        format,
        scheduledFor: slot.date,
        slotIndex: slot.slotIndex,
        topic,
        targetAudience: audience,
        objective: pillarObjective(pillar.name),
        mainMessage,
        caption,
        hashtags: JSON.stringify(hashtags),
        creativeRequirements: creativeBrief(format, ctx, pillar.name),
        status: approvalRequired ? "awaiting_approval" : "scheduled",
      },
    });

    if (approvalRequired) {
      await prisma.approval.create({
        data: { companyId, entityType: "post", postId: post.id, entityId: post.id, status: "pending" },
      });
    }
    created++;
  }

  return {
    agentSystem: "D",
    created,
    notes: `Generated ${created} posts for ${weekStart.toISOString().slice(0, 10)} week (config-driven: ${config.platforms.length} platforms × ${config.publishingDays.length} days).`,
  };
}

export function angleFor(pillar: string, ctx: { industry: string | null }, vp: string): string {
  const base = ctx.industry ?? "your category";
  switch (pillar) {
    case "Educate": return `a practical lesson about ${base}`;
    case "Proof": { const v = trim(vp); return v ? `evidence for "${v}"` : `the results we deliver`; }
    case "Point of view": return `an honest take on ${base}`;
    default: return `spotlighting the community`;
  }
}
function messageFor(pillar: string, ctx: { name: string; positioning: string | null }, vp: string): string {
  switch (pillar) {
    case "Educate": return `A useful, specific insight your audience can apply today.`;
    case "Proof": return `Concrete proof that ${trim(vp) || ctx.name} delivers.`;
    case "Point of view": return ctx.positioning ?? `A clear, opinionated stance.`;
    default: return `We see you — answering questions and celebrating the community.`;
  }
}
function captionFor(pillar: string, ctx: { name: string; tagline: string | null }, vp: string, platform: string): string {
  const hook = {
    Educate: `Most people get this wrong about ${ctx.name ? "our space" : "it"} —`,
    Proof: `Here's the proof, not the promise:`,
    "Point of view": `An unpopular opinion we'll stand behind:`,
    Community: `Your question, answered 👇`,
  }[pillar] ?? "";
  const body = trim(vp) || ctx.tagline || "the difference we make";
  const cta = platform === "LINKEDIN" ? "What's your take? 👇" : "Save this for later ✨";
  return `${hook} ${body}\n\n${cta}`.trim();
}
export function hashtagsFor(ctx: { industry: string | null }, platform: string): string[] {
  // Pick a meaningful word (>=4 chars) from the industry, preferring the most
  // specific trailing word; avoids weak tags like "#b" from "B2C …".
  const words = (ctx.industry ?? "").split(/[^a-zA-Z]+/).filter((w) => w.length >= 4);
  const industryTag = (words[words.length - 1] ?? words[0] ?? "social").toLowerCase();
  const common = [`#${industryTag}`, "#organicgrowth"];
  if (platform === "INSTAGRAM" || platform === "TIKTOK") return [...common, "#reels", "#smallbusiness", "#howto"];
  if (platform === "LINKEDIN") return [...common, "#thoughtleadership", "#b2b"];
  return common;
}
function pillarObjective(pillar: string): string {
  return { Educate: "Awareness / saves", Proof: "Consideration / trust", "Point of view": "Reach / engagement", Community: "Engagement / loyalty" }[pillar] ?? "Engagement";
}
function creativeBrief(format: string, ctx: { name: string; colors: { primary?: string } }, pillar: string): string {
  return `${format} for ${ctx.name}. Pillar: ${pillar}. On-brand colours, legible type, logo lockup. ${format === "carousel" ? "3–5 slides with a clear narrative." : format === "reel" || format === "short" || format === "video" ? "Hook in first 2s, captions on-screen." : "Single strong visual with headline + CTA."}`;
}
function trim(s: string): string {
  return (s ?? "").length > 90 ? `${s.slice(0, 87)}…` : s ?? "";
}
