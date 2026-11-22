// Source-verified research. Retrieves REAL content from the public URLs the
// company configured (competitor sites), records full provenance, and — when a
// model runtime is available — separates verifiable facts from interpretation.
// If a URL cannot be retrieved it is recorded as such; nothing is fabricated and
// nothing is presented as current unless it was actually fetched.

import { prisma } from "@/lib/db";
import { loadBrandContext } from "@/lib/agents/context";
import { aiSummariseSource } from "@/lib/ai/content";
import { getAiStatus } from "@/lib/ai";
import type { AgentResult } from "@/lib/agents/types";

interface FetchResult {
  ok: boolean;
  status: number;
  text?: string;
  publisher?: string;
  finalUrl?: string;
  error?: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Retrieve a public URL. Generic UA (no user PII). Returns provenance + text. */
export async function fetchSource(url: string, timeoutMs = 12_000): Promise<FetchResult> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "OrganicSocialOS-Research/1.0 (+local)" }, redirect: "follow" });
    if (!res.ok) return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("text/plain")) return { ok: false, status: res.status, error: `unsupported content-type ${ct}` };
    const html = await res.text();
    const text = stripHtml(html).slice(0, 8000);
    return { ok: true, status: res.status, text, publisher: new URL(res.url).hostname, finalUrl: res.url };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : "fetch failed" };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Run verified research over the company's configured competitor URLs.
 * Adds ResearchItems (category=competitor) with real sources + retrieval status.
 * Returns how many were genuinely retrieved vs unreachable.
 */
export async function runVerifiedResearch(companyId: string, opts: { limit?: number } = {}): Promise<AgentResult & { retrieved: number; unreachable: number }> {
  const ctx = await loadBrandContext(companyId);
  const status = await getAiStatus();
  const competitors = (await prisma.competitor.findMany({ where: { companyId, website: { not: null } } })).slice(0, opts.limit ?? 4);

  let retrieved = 0;
  let unreachable = 0;
  const nowIso = new Date().toISOString();

  for (const comp of competitors) {
    const url = comp.website!;
    const fetched = await fetchSource(url);

    if (!fetched.ok) {
      unreachable++;
      await prisma.researchItem.create({
        data: {
          companyId, category: "competitor",
          title: `Competitor source unreachable — ${comp.name}`,
          summary: `Could not retrieve ${url} (${fetched.error}). No content inferred.`,
          body: `Retrieval of ${comp.name}'s site was attempted at ${nowIso} and failed: ${fetched.error}. No research content is inferred from an unretrieved source.`,
          confidence: "low",
          generatedBy: "imported",
          sources: { create: [{ title: `${comp.name} website (unreachable)`, url, publisher: comp.name, retrievedDate: nowIso, excerpt: `Retrieval failed: ${fetched.error}` }] },
        },
      });
      continue;
    }

    retrieved++;
    const summarised = status.available ? await aiSummariseSource(ctx, fetched.text ?? "", comp.name) : null;
    const facts = summarised?.facts ?? [];
    const interpretation = summarised?.interpretation ?? "";
    const excerpt = (fetched.text ?? "").slice(0, 400);

    await prisma.researchItem.create({
      data: {
        companyId, category: "competitor",
        title: `Verified competitor research — ${comp.name}`,
        summary: facts[0] ?? `Retrieved ${comp.name}'s site (${fetched.publisher}).`,
        body:
          `Source: ${fetched.finalUrl}\nPublisher: ${fetched.publisher}\nRetrieved: ${nowIso}\nVerification: content retrieved (HTTP ${fetched.status}).\n\n` +
          (facts.length ? `VERIFIED FACTS (grounded in the retrieved text):\n${facts.map((f) => `• ${f}`).join("\n")}\n\n` : `RETRIEVED EXCERPT:\n${excerpt}\n\n`) +
          (interpretation ? `INTERPRETATION (opinion, not fact):\n${interpretation}` : ""),
        confidence: facts.length ? "medium" : "low",
        generatedBy: summarised ? `ai:${summarised.model}` : "imported",
        sources: { create: [{ title: `${comp.name} website`, url: fetched.finalUrl, publisher: fetched.publisher, retrievedDate: nowIso, excerpt }] },
      },
    });
  }

  return { agentSystem: "B", created: retrieved + unreachable, retrieved, unreachable, notes: `Verified research: ${retrieved} retrieved, ${unreachable} unreachable. Facts vs interpretation separated; nothing fabricated.` };
}
