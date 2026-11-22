import { prisma } from "@/lib/db";
import { parseStringArray } from "@/lib/json";
import { loadBrandContext } from "./context";
import type { AgentResult } from "./types";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Agent B — Research & Trends.
 * COMPANY-SPECIFIC research derived from the brand knowledge the user supplied:
 * products, ICPs, personas (incl. buying motivations), differentiators and the
 * real competitor URLs they entered. No external citations are fabricated, and
 * where essential knowledge is missing it is flagged — never invented.
 */
export async function runResearch(companyId: string): Promise<AgentResult> {
  const ctx = await loadBrandContext(companyId);
  const competitors = await prisma.competitor.findMany({ where: { companyId } });

  await prisma.researchItem.deleteMany({ where: { companyId } });

  interface Item { category: string; title: string; summary: string; body: string; confidence: string; sources: { title: string; url?: string; publisher?: string; retrievedDate?: string; excerpt?: string }[] }
  const items: Item[] = [];

  // Knowledge-gap item FIRST (honesty): list exactly what's missing, no fabrication.
  if (ctx.missing.length > 0) {
    items.push({
      category: "opportunity",
      title: "Knowledge gaps to close before deeper research",
      summary: `Research is limited by missing brand knowledge: ${ctx.missing.join(", ")}.`,
      body: `To produce specific, grounded research and content for ${ctx.name}, the following essential information is required and has NOT been provided (it will not be invented):\n\n` +
        ctx.missing.map((m) => `• ${m}`).join("\n") +
        `\n\nAdd these in Company & Brand Intelligence, then re-run research.`,
      confidence: "high",
      sources: [{ title: `${ctx.name} brand configuration`, retrievedDate: today(), excerpt: "Derived from the company's own brand record." }],
    });
  }

  // Competitor analysis — grounded in the real URLs/handles the company provided.
  for (const comp of competitors) {
    const strengths = parseStringArray(comp.strengths);
    const weaknesses = parseStringArray(comp.weaknesses);
    const diff = ctx.differentiators[0];
    items.push({
      category: "competitor",
      title: `Competitor positioning — ${comp.name}`,
      summary: `Lean into ${weaknesses[0] ?? "their gaps"}${diff ? ` using our differentiator: ${diff}` : ""}.`,
      body: `${comp.name} is a tracked competitor for ${ctx.name}.\n\nStrengths: ${strengths.join(", ") || "n/a"}.\nWeaknesses / openings: ${weaknesses.join(", ") || "n/a"}.\n\n` +
        `Organic response: content that proves ${ctx.name}'s edge${diff ? ` ("${diff}")` : ""} on "${weaknesses[0] ?? "clarity"}", anchored to the positioning: ${ctx.positioning ?? "(set positioning)"}.`,
      confidence: comp.website ? "medium" : "low",
      sources: comp.website ? [{ title: `${comp.name} website`, url: comp.website, publisher: comp.name, retrievedDate: today(), excerpt: "Company-supplied competitor reference." }] : [],
    });
  }

  // Persona-led content research (incl. buying motivations).
  for (const p of ctx.personas) {
    items.push({
      category: "audience",
      title: `Audience interests — ${p.name}`,
      summary: `Themes for ${p.name}: ${(p.goals.slice(0, 2).join(", ") || p.buyingMotivations.slice(0, 2).join(", ")) || "goal-led topics"}.`,
      body: `Persona: ${p.name}${p.role ? ` (${p.role})` : ""}.\nGoals: ${p.goals.join(", ") || "n/a"}.\nPain points: ${p.painPoints.join(", ") || "n/a"}.\nBuying motivations: ${p.buyingMotivations.join(", ") || "n/a"}.\n\n` +
        `Opportunity: proof-led content that moves ${p.name} from "${p.painPoints[0] ?? "uncertainty"}" to "${p.goals[0] ?? "confidence"}", speaking to why they buy (${p.buyingMotivations[0] ?? "value"}).`,
      confidence: "medium",
      sources: [{ title: `${ctx.name} persona: ${p.name}`, retrievedDate: today(), excerpt: "Derived from company-provided persona." }],
    });
  }

  // Product/service angle research.
  for (const prod of ctx.products) {
    items.push({
      category: "opportunity",
      title: `Content angle — ${prod.name}`,
      summary: `Show ${prod.name} solving a real problem for ${ctx.icp.segments?.[0] ?? "the ICP"}.`,
      body: `${prod.name}${prod.category ? ` (${prod.category})` : ""}: ${prod.description ?? "—"}.\nKey features: ${prod.features.join(", ") || "n/a"}.\n\n` +
        `Organic angle: demonstrate ${prod.features[0] ?? "the core benefit"} in use, tied to a persona pain point.`,
      confidence: prod.description ? "medium" : "low",
      sources: [{ title: `${ctx.name} product: ${prod.name}`, retrievedDate: today(), excerpt: "Derived from company-provided product data." }],
    });
  }

  // ICP-level opportunity per profile.
  for (const icp of ctx.icps) {
    const vp = ctx.messaging.valueProps?.[0];
    items.push({
      category: "opportunity",
      title: `ICP opportunity — ${icp.name ?? "Primary ICP"}`,
      summary: `Lead with "${vp ?? ctx.tagline ?? "your core value"}" for ${icp.segments?.[0] ?? "this ICP"}.`,
      body: `ICP: ${icp.summary ?? icp.name ?? "—"}.\nSegments: ${icp.segments?.join(", ") ?? "n/a"}.\nBuying triggers: ${icp.triggers?.join(", ") ?? "n/a"}.\n\n` +
        `Strongest organic play: content proving "${vp ?? ctx.tagline ?? "the core value"}" to ${icp.segments?.join(", ") ?? "this audience"}.`,
      confidence: vp ? "medium" : "low",
      sources: [{ title: `${ctx.name} ICP: ${icp.name ?? "primary"}`, retrievedDate: today(), excerpt: "Derived from company-provided ICP." }],
    });
  }

  for (const it of items) {
    await prisma.researchItem.create({ data: { companyId, category: it.category, title: it.title, summary: it.summary, body: it.body, confidence: it.confidence, generatedBy: "deterministic_generation", sources: { create: it.sources } } });
  }

  return { agentSystem: "B", created: items.length, notes: `Company-specific research from provided brand/products/ICP/personas/competitors.${ctx.missing.length ? ` ${ctx.missing.length} knowledge gap(s) flagged (not fabricated).` : ""} Live web/news retrieval requires a research runtime.` };
}
