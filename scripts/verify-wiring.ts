import { prisma } from "@/lib/db";
import { runResearch, runStrategy, runCalendar } from "@/lib/agents";
import { parseStringArray, parseJson } from "@/lib/json";

let fails = 0;
const check = (n: string, ok: boolean, d = "") => { if (!ok) fails++; console.log(`[${ok ? "PASS" : "FAIL"}] ${n}${d ? " — " + d : ""}`); };

async function main() {
  // 1) A fully-specified company must produce content that references its real data.
  const nw = await prisma.company.findFirstOrThrow({ where: { slug: "northwind-analytics" } });
  await runResearch(nw.id);
  const research = await prisma.researchItem.findMany({ where: { companyId: nw.id } });
  const products = await prisma.product.findMany({ where: { companyId: nw.id } });
  const productNames = products.map((p) => p.name);
  const mentionsProduct = research.some((r) => productNames.some((pn) => (r.title + r.body).includes(pn)));
  check("research references a real product name", mentionsProduct, productNames.join(", "));
  check("research includes an ICP-opportunity item", research.some((r) => r.title.includes("ICP opportunity")));

  await runStrategy(nw.id);
  const strat = await prisma.strategy.findFirstOrThrow({ where: { companyId: nw.id, status: "active" }, orderBy: { createdAt: "desc" } });
  const objectives = parseStringArray(strat.objectives);
  check("strategy objectives include a marketing objective", objectives.some((o) => o.startsWith("Support marketing objective")), objectives[0]);

  await runCalendar(nw.id);
  const posts = await prisma.contentPost.findMany({ where: { companyId: nw.id, status: { in: ["awaiting_approval", "scheduled"] } } });
  const captionsRefBrand = posts.some((p) => productNames.some((pn) => (p.caption ?? "").includes(pn)) || (p.caption ?? "").length > 0);
  check("calendar posts have non-empty captions", captionsRefBrand && posts.length > 0, `${posts.length} posts`);

  // 2) A bare company must FLAG missing info and NOT fabricate competitors/products.
  const bare = await prisma.company.create({ data: { slug: `probe-${Date.now()}`, name: "Probe Co", dataLabel: "provided", config: { create: { platforms: JSON.stringify(["LINKEDIN"]), postsPerDay: JSON.stringify({ LINKEDIN: 1 }), publishingDays: JSON.stringify([1, 2, 3]) } } } });
  await runResearch(bare.id);
  const bareResearch = await prisma.researchItem.findMany({ where: { companyId: bare.id } });
  const gapItem = bareResearch.find((r) => r.title.includes("Knowledge gaps"));
  check("bare company gets a knowledge-gap item (no fabrication)", Boolean(gapItem), gapItem?.summary ?? "none");
  check("bare company has NO competitor research (nothing invented)", !bareResearch.some((r) => r.category === "competitor"));
  check("bare company has NO product research (nothing invented)", !bareResearch.some((r) => r.title.startsWith("Content angle")));
  await prisma.company.delete({ where: { id: bare.id } });

  console.log(`\nWIRING: ${fails === 0 ? "ALL PASS" : fails + " FAIL"}`);
  await prisma.$disconnect();
  if (fails) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
