// Model-driven content generation, grounded strictly in the company's own brand
// knowledge. Prompts forbid inventing facts and forbid prohibited claims. Each
// function returns null when no runtime is available so the caller falls back to
// deterministic generation (and labels it honestly).

import { aiJson, aiText } from "./index";
import type { CompanyBrandContext } from "@/lib/agents/types";
import { PLATFORM_LABELS, type Platform } from "@/lib/enums";

function brandBrief(ctx: CompanyBrandContext): string {
  const lines = [
    `Company: ${ctx.name}${ctx.industry ? ` (${ctx.industry})` : ""}`,
    ctx.positioning ? `Positioning: ${ctx.positioning}` : "",
    ctx.messaging.valueProps?.length ? `Value props: ${ctx.messaging.valueProps.join("; ")}` : "",
    ctx.differentiators.length ? `Differentiators: ${ctx.differentiators.join("; ")}` : "",
    ctx.products.length ? `Products: ${ctx.products.map((p) => `${p.name} — ${p.description ?? ""}`).join(" | ")}` : "",
    ctx.icps.length ? `ICPs: ${ctx.icps.map((i) => i.name ?? i.summary).join("; ")}` : "",
    ctx.personas.length ? `Personas: ${ctx.personas.map((p) => `${p.name} (motivations: ${p.buyingMotivations.join(", ") || "n/a"})`).join("; ")}` : "",
    ctx.brandVoice.tone?.length ? `Tone: ${ctx.brandVoice.tone.join(", ")}` : "",
    ctx.brandVoice.writingGuidelines ? `Writing guidelines: ${ctx.brandVoice.writingGuidelines}` : "",
    ctx.prohibitedClaims.length ? `NEVER make these prohibited claims: ${ctx.prohibitedClaims.join("; ")}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

const GUARDRAILS =
  "Rules: Use ONLY the facts in the brand brief. Do NOT invent statistics, features, or claims. " +
  "Do NOT make any prohibited claim. Match the brand tone. If a fact is not in the brief, do not assert it.";

export interface AiCaption {
  caption: string;
  hashtags: string[];
  model: string;
}

/** Generate a platform-specific caption grounded in the brand. null → fallback. */
export async function aiGenerateCaption(
  ctx: CompanyBrandContext,
  input: { platform: string; pillar: string; topic: string; format: string; audience?: string },
): Promise<AiCaption | null> {
  const system = `You are an expert organic social copywriter for ${ctx.name}. ${GUARDRAILS} Return ONLY JSON.`;
  const user =
    `BRAND BRIEF:\n${brandBrief(ctx)}\n\n` +
    `TASK: Write a ${PLATFORM_LABELS[input.platform as Platform] ?? input.platform} ${input.format} caption for the "${input.pillar}" pillar about: ${input.topic}. ` +
    `Audience: ${input.audience ?? ctx.icps[0]?.segments?.[0] ?? "the ICP"}. ` +
    `Keep it ${input.platform === "LINKEDIN" ? "professional, <=60 words" : "punchy, <=40 words"}. ` +
    `Return JSON: { "caption": string, "hashtags": string[] (3-5, no spaces) }.`;

  const res = await aiJson<{ caption: string; hashtags: string[] }>(system, user, { maxTokens: 220, temperature: 0.5 });
  if (!res.ok || !res.data?.caption) return null;
  const hashtags = Array.isArray(res.data.hashtags) ? res.data.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).slice(0, 5) : [];
  return { caption: String(res.data.caption).trim(), hashtags, model: res.model };
}

export interface AiPillar { name: string; description: string; weight: number }

/** Model-driven content pillars from the brand. null → deterministic fallback. */
export async function aiGenerateStrategyPillars(ctx: CompanyBrandContext): Promise<{ pillars: AiPillar[]; model: string } | null> {
  const system = `You are a social media strategist for ${ctx.name}. ${GUARDRAILS} Return ONLY JSON.`;
  const user =
    `BRAND BRIEF:\n${brandBrief(ctx)}\n\n` +
    `TASK: Propose exactly 4 organic content pillars tailored to this company and its ICP. ` +
    `Return JSON: { "pillars": [ { "name": string (<=3 words), "description": string (one sentence), "weight": number (sums to 100) } ] }.`;
  const res = await aiJson<{ pillars: AiPillar[] }>(system, user, { maxTokens: 400, temperature: 0.5 });
  if (!res.ok || !Array.isArray(res.data?.pillars) || res.data.pillars.length === 0) return null;
  const pillars = res.data.pillars.slice(0, 5).map((p) => ({ name: String(p.name ?? "Pillar").slice(0, 40), description: String(p.description ?? ""), weight: Number(p.weight) || 25 }));
  return { pillars, model: res.model };
}

/**
 * Summarise retrieved source text into grounded research (used by the research
 * pipeline AFTER real retrieval). Returns facts vs interpretation separately.
 * null → caller keeps the raw retrieved text without AI interpretation.
 */
export async function aiSummariseSource(ctx: CompanyBrandContext, sourceText: string, sourceLabel: string): Promise<{ facts: string[]; interpretation: string; model: string } | null> {
  const clipped = sourceText.slice(0, 6000);
  const system = `You analyse a retrieved web source for ${ctx.name}. Summarise ONLY what the text says. Do NOT add outside facts. Separate verifiable facts from your interpretation. Return ONLY JSON.`;
  const user =
    `SOURCE (${sourceLabel}):\n"""${clipped}"""\n\n` +
    `Return JSON: { "facts": string[] (verbatim-grounded statements from the text, max 6), "interpretation": string (your reading of what it means for ${ctx.name}'s organic social, clearly your opinion) }.`;
  const res = await aiJson<{ facts: string[]; interpretation: string }>(system, user, { maxTokens: 500, temperature: 0.3 });
  if (!res.ok) return null;
  return { facts: Array.isArray(res.data.facts) ? res.data.facts.map(String).slice(0, 6) : [], interpretation: String(res.data.interpretation ?? ""), model: res.model };
}

export { aiText };
