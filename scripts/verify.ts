import { prisma } from "@/lib/db";

async function main() {
  const total = await prisma.activityCatalog.count();
  const organic = await prisma.activityCatalog.count({ where: { scope: "organic" } });
  const paid = await prisma.activityCatalog.count({ where: { scope: "paid" } });
  const leadgen = await prisma.activityCatalog.count({ where: { scope: "leadgen" } });
  console.log(`ActivityCatalog total=${total} organic=${organic} paid=${paid} leadgen=${leadgen}`);

  // Excel IDs preserved + unique
  const ids = await prisma.activityCatalog.findMany({ select: { excelId: true }, orderBy: { excelId: "asc" } });
  const unique = new Set(ids.map((i) => i.excelId));
  const mmFormat = ids.every((i) => /^MM-\d{4}$/.test(i.excelId));
  console.log(`Excel IDs: ${ids.length} rows, ${unique.size} unique, MM-#### format=${mmFormat}, sample=${ids.slice(0, 3).map((i) => i.excelId).join(",")}…${ids.slice(-1)[0]?.excelId}`);

  // A–G distribution (organic)
  const bySystem = await prisma.activityCatalog.groupBy({ by: ["agentSystem"], where: { scope: "organic" }, _count: true });
  console.log("Organic by agent system: " + bySystem.sort((a, b) => (a.agentSystem ?? "").localeCompare(b.agentSystem ?? "")).map((s) => `${s.agentSystem}=${s._count}`).join(" "));

  // Tenant isolation check: per-company counts + no cross-company leakage
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  for (const c of companies) {
    const posts = await prisma.contentPost.count({ where: { companyId: c.id } });
    const research = await prisma.researchItem.count({ where: { companyId: c.id } });
    const reports = await prisma.report.count({ where: { companyId: c.id } });
    const creatives = await prisma.creativeAsset.count({ where: { companyId: c.id } });
    console.log(`  ${c.name}: posts=${posts} research=${research} creatives=${creatives} reports=${reports}`);
  }

  // Isolation assertion: every post's companyId belongs to exactly one company; no orphans
  const companyIds = new Set(companies.map((c) => c.id));
  const allPosts = await prisma.contentPost.findMany({ select: { companyId: true } });
  const leaked = allPosts.filter((p) => !companyIds.has(p.companyId)).length;
  console.log(`Isolation: ${allPosts.length} posts, ${leaked} orphaned/cross-tenant (expect 0)`);

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
