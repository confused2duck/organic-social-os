import { prisma } from "@/lib/db";
import { loadBrandContext } from "@/lib/agents/context";
import { validateContent } from "@/lib/validation";
import { enhanceAndValidateCalendar } from "@/lib/ai/autonomous";
import { tickScheduler } from "@/lib/scheduler";
import { runVerifiedResearch } from "@/lib/ai/research-pipeline";
import { getAiStatus } from "@/lib/ai";

let fails = 0;
const check = (n: string, ok: boolean, d = "") => { if (!ok) fails++; console.log(`[${ok ? "PASS" : "FAIL"}] ${n}${d ? " — " + d : ""}`); };

async function main() {
  const ai = await getAiStatus(true);
  console.log("AI runtime:", ai.available, ai.model);
  const nw = await prisma.company.findFirstOrThrow({ where: { slug: "northwind-analytics" } });
  const ctx = await loadBrandContext(nw.id);

  // 1) Accuracy validation gate (deterministic, authoritative).
  const bad = validateContent(ctx, { platform: "LINKEDIN", caption: "We guarantee a revenue increase for every customer, proven and certified.", hashtags: [], topic: "Proof" });
  check("prohibited-claim caption is REJECTED", bad.status === "rejected", bad.issues.map((i) => i.rule).join(","));
  const stat = validateContent(ctx, { platform: "LINKEDIN", caption: "Our tool boosts output by 87% instantly.", hashtags: [], topic: "Proof" });
  check("unsupported statistic is FLAGGED", stat.issues.some((i) => i.rule === "unsupported_statistic"));
  const good = validateContent(ctx, { platform: "LINKEDIN", caption: "Northwind Dashboards gives SMEs same-day analytics dashboards.", hashtags: ["#a"], topic: "Proof" });
  check("clean, grounded caption PASSES", good.status === "passed");

  // 2) Persistent scheduler — enqueues due jobs, idempotent across restarts.
  await prisma.task.deleteMany({ where: { idempotencyKey: { startsWith: "sched:" } } });
  const t1 = await tickScheduler();
  const t2 = await tickScheduler();
  check("scheduler enqueues due jobs on first tick", t1.enqueued.length >= 1, `${t1.enqueued.length} jobs`);
  check("scheduler is idempotent (0 new on second tick)", t2.enqueued.length === 0);

  // 3) Genuine AI content + validation (2 posts, bounded runtime).
  if (ai.available) {
    const sum = await enhanceAndValidateCalendar(nw.id, { ai: true, limit: 2 });
    check("AI generated real captions", sum.aiGenerated >= 1, `ai=${sum.aiGenerated} model=${sum.model}`);
    check("every processed post was validated", sum.passed + sum.flagged + sum.rejected === sum.total, `p=${sum.passed} f=${sum.flagged} r=${sum.rejected}`);
    const aiPost = await prisma.contentPost.findFirst({ where: { companyId: nw.id, generatedBy: { startsWith: "ai:" } } });
    check("post carries real model attribution", Boolean(aiPost), aiPost?.generatedBy ?? "none");
    console.log("   sample AI caption:", aiPost?.caption?.slice(0, 120));
  } else {
    check("AI runtime available for content", false, "no runtime — would fall back to deterministic");
  }

  // 4) Source-verified research against a REAL reachable URL.
  const probe = await prisma.company.create({ data: { slug: `vr-${Date.now()}`, name: "VR Probe", dataLabel: "provided", competitors: { create: [{ name: "Example", website: "https://example.com", handles: "{}", strengths: "[]", weaknesses: "[]" }] }, config: { create: { platforms: JSON.stringify(["LINKEDIN"]) } } } });
  const vr = await runVerifiedResearch(probe.id, { limit: 1 });
  check("verified research RETRIEVED a real source", vr.retrieved >= 1, `retrieved=${vr.retrieved} unreachable=${vr.unreachable}`);
  const src = await prisma.researchSource.findFirst({ where: { item: { companyId: probe.id } } });
  check("source records real URL + retrieval timestamp", Boolean(src?.url && src?.retrievedDate), `${src?.url} @ ${src?.retrievedDate}`);
  await prisma.company.delete({ where: { id: probe.id } });

  console.log(`\nAUTONOMY TEST: ${fails === 0 ? "ALL PASS" : fails + " FAIL"}`);
  await prisma.$disconnect();
  if (fails) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
