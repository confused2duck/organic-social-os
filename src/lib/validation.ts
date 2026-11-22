// Accuracy-first validation gate. Deterministic checks are authoritative; a
// model review may ADD flags but never proves a claim true. Content that is
// rejected must not be auto-published — it is blocked or escalated for review.

import type { CompanyBrandContext } from "@/lib/agents/types";
import { aiJson } from "@/lib/ai";

export interface ValidationIssue {
  severity: "reject" | "flag";
  rule: string;
  message: string;
}
export interface ValidationReport {
  status: "passed" | "flagged" | "rejected";
  issues: ValidationIssue[];
}

const PLATFORM_CAPTION_MAX: Record<string, number> = { LINKEDIN: 3000, INSTAGRAM: 2200, FACEBOOK: 63206, YOUTUBE: 5000, TIKTOK: 2200 };
const PLATFORM_HASHTAG_MAX: Record<string, number> = { LINKEDIN: 8, INSTAGRAM: 30, FACEBOOK: 10, YOUTUBE: 15, TIKTOK: 10 };
const STOPWORDS = new Set(["with", "that", "this", "your", "from", "have", "will", "about", "into", "their"]);

function words(s: string): string[] {
  return (s.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !STOPWORDS.has(w));
}

function factsCorpus(ctx: CompanyBrandContext): string {
  return [
    ctx.positioning ?? "",
    ...(ctx.messaging.valueProps ?? []),
    ...(ctx.messaging.keyMessages ?? []),
    ...ctx.differentiators,
    ...ctx.products.flatMap((p) => [p.name, p.description ?? "", ...p.features]),
  ].join(" ").toLowerCase();
}

/** Deterministic accuracy + compliance validation. Authoritative. */
export function validateContent(
  ctx: CompanyBrandContext,
  input: { platform: string; caption: string; hashtags?: string[]; topic?: string },
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const caption = (input.caption ?? "").trim();

  if (!caption) issues.push({ severity: "reject", rule: "empty", message: "Caption is empty." });

  const max = PLATFORM_CAPTION_MAX[input.platform] ?? 2200;
  if (caption.length > max) issues.push({ severity: "reject", rule: "platform_spec", message: `Caption ${caption.length} chars exceeds ${input.platform} max ${max}.` });

  // Prohibited claims: match if the caption contains most of a claim's content words.
  const hay = `${caption} ${input.topic ?? ""}`.toLowerCase();
  const hayWords = new Set(words(hay));
  for (const claim of ctx.prohibitedClaims) {
    const cw = [...new Set(words(claim))];
    if (cw.length === 0) continue;
    const hit = cw.filter((w) => hayWords.has(w)).length;
    if (hit >= Math.max(1, Math.ceil(cw.length * 0.6))) {
      issues.push({ severity: "reject", rule: "prohibited_claim", message: `Content appears to make a prohibited claim: "${claim}".` });
    }
  }

  // Unsupported statistics: a percentage/multiplier not present in the brand facts.
  const facts = factsCorpus(ctx);
  const stats = caption.match(/\d+(?:\.\d+)?\s?(?:%|x\b)/gi) ?? [];
  for (const s of stats) {
    const norm = s.toLowerCase().replace(/\s/g, "");
    if (!facts.replace(/\s/g, "").includes(norm)) {
      issues.push({ severity: "flag", rule: "unsupported_statistic", message: `Statistic "${s.trim()}" is not grounded in brand facts — verify before publishing.` });
    }
  }

  // Hashtag count vs platform recommendation.
  const hmax = PLATFORM_HASHTAG_MAX[input.platform] ?? 10;
  if ((input.hashtags?.length ?? 0) > hmax) {
    issues.push({ severity: "flag", rule: "hashtags", message: `${input.hashtags!.length} hashtags exceeds the recommended ${hmax} for ${input.platform}.` });
  }

  const hasReject = issues.some((i) => i.severity === "reject");
  const hasFlag = issues.some((i) => i.severity === "flag");
  return { status: hasReject ? "rejected" : hasFlag ? "flagged" : "passed", issues };
}

/**
 * OPTIONAL model review — an ADDITIONAL check only. Any concern it raises is a
 * `flag` (never a `reject` and never proof of truth). Returns [] if no runtime.
 */
export async function aiReviewContent(ctx: CompanyBrandContext, input: { platform: string; caption: string }): Promise<ValidationIssue[]> {
  const system = `You review social copy for ${ctx.name} for factual/brand risk. List concerns only. Return ONLY JSON.`;
  const prohibited = ctx.prohibitedClaims.join("; ") || "none";
  const user = `Prohibited claims: ${prohibited}.\nCaption: "${input.caption}"\nReturn JSON: { "concerns": string[] } — anything that might be an unverified claim, off-brand, or a prohibited claim. Empty array if none.`;
  const res = await aiJson<{ concerns: string[] }>(system, user, { maxTokens: 200, temperature: 0.2 });
  if (!res.ok || !Array.isArray(res.data?.concerns)) return [];
  return res.data.concerns.slice(0, 5).map((c) => ({ severity: "flag" as const, rule: "model_review", message: String(c) }));
}
