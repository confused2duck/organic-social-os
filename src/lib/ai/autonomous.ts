// Autonomous, accuracy-first content cycle. Uses the real AI runtime when
// available (model-driven captions), always runs the deterministic validation
// gate, and NEVER auto-publishes content that fails validation.

import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { loadBrandContext } from "@/lib/agents/context";
import { runResearch, runStrategy, runCalendar, runCreativeSpecs, runWeeklyReport } from "@/lib/agents";
import { renderAllForCompany } from "@/lib/render";
import { getAiStatus } from "@/lib/ai";
import { aiGenerateCaption } from "@/lib/ai/content";
import { validateContent, type ValidationReport } from "@/lib/validation";
import { startOfWeek } from "@/lib/scheduling";

export interface ValidationSummary { total: number; aiGenerated: number; passed: number; flagged: number; rejected: number; model: string | null }

/**
 * For the current week's non-published posts: optionally regenerate the caption
 * with the AI runtime (grounded in brand knowledge), then run the deterministic
 * accuracy gate. Rejected posts are set to `blocked` and never auto-published.
 */
export async function enhanceAndValidateCalendar(companyId: string, opts: { ai?: boolean; limit?: number } = {}): Promise<ValidationSummary> {
  const ctx = await loadBrandContext(companyId);
  const status = await getAiStatus();
  const useAi = Boolean(opts.ai) && status.available;

  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const posts = await prisma.contentPost.findMany({
    where: { companyId, scheduledFor: { gte: weekStart, lt: weekEnd }, status: { in: ["awaiting_approval", "scheduled", "draft"] } },
    orderBy: { scheduledFor: "asc" },
    ...(opts.limit ? { take: opts.limit } : {}),
  });

  const summary: ValidationSummary = { total: posts.length, aiGenerated: 0, passed: 0, flagged: 0, rejected: 0, model: useAi ? status.model : null };

  for (const post of posts) {
    let caption = post.caption ?? "";
    let hashtags = parseJson<string[]>(post.hashtags, []);
    let generatedBy = post.generatedBy || "deterministic_generation";

    if (useAi) {
      const ai = await aiGenerateCaption(ctx, { platform: post.platform, pillar: post.topic.split(":")[0] ?? "", topic: post.topic, format: post.format, audience: post.targetAudience ?? undefined });
      if (ai) {
        caption = ai.caption;
        if (ai.hashtags.length) hashtags = ai.hashtags;
        generatedBy = `ai:${ai.model}`;
        summary.aiGenerated++;
      }
    }

    const report: ValidationReport = validateContent(ctx, { platform: post.platform, caption, hashtags, topic: post.topic });
    summary[report.status]++;

    // Rejected content is blocked (never auto-published); flagged stays for human review.
    const nextStatus = report.status === "rejected" ? "blocked" : post.status;
    await prisma.contentPost.update({
      where: { id: post.id },
      data: {
        caption,
        hashtags: JSON.stringify(hashtags),
        generatedBy,
        validationStatus: report.status,
        validationNotes: JSON.stringify(report.issues),
        status: nextStatus,
      },
    });
  }

  return summary;
}

export interface AutonomousCycleResult {
  companyId: string;
  ai: { available: boolean; model: string | null };
  steps: { step: string; detail: string }[];
  validation: ValidationSummary;
}

/**
 * Full autonomous cycle: Research → Strategy → Calendar → (AI copy + accuracy
 * gate) → Creative render → Report. Deterministic where no model is available;
 * model-driven where it is. Honest labelling throughout.
 */
export async function runAutonomousCycle(companyId: string, opts: { ai?: boolean } = {}): Promise<AutonomousCycleResult> {
  const status = await getAiStatus();
  const useAi = opts.ai !== false && status.available;
  const steps: { step: string; detail: string }[] = [];

  const research = await runResearch(companyId);
  steps.push({ step: "research", detail: `${research.created} items` });

  const strategy = await runStrategy(companyId);
  steps.push({ step: "strategy", detail: strategy.notes ?? "built" });

  const calendar = await runCalendar(companyId);
  steps.push({ step: "calendar", detail: `${calendar.created} posts` });

  const validation = await enhanceAndValidateCalendar(companyId, { ai: useAi });
  steps.push({ step: "ai+validate", detail: `ai=${validation.aiGenerated} passed=${validation.passed} flagged=${validation.flagged} rejected=${validation.rejected}` });

  const creative = await runCreativeSpecs(companyId);
  const render = await renderAllForCompany(companyId);
  steps.push({ step: "creative", detail: `${creative.created} specs, ${render.rendered} rendered` });

  const report = await runWeeklyReport(companyId);
  steps.push({ step: "report", detail: report.notes ?? "generated" });

  return { companyId, ai: { available: status.available, model: useAi ? status.model : null }, steps, validation };
}
