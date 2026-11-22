import { prisma } from "@/lib/db";

async function main() {
  // Remove the prior audit's throwaway company (the E2E test creates its own).
  const atlas = await prisma.company.findFirst({ where: { slug: { startsWith: "atlas-fitness" } } });
  if (atlas) { await prisma.company.delete({ where: { id: atlas.id } }); console.log("deleted", atlas.slug); }

  // Relabel any remaining stale attribution.
  const r = await prisma.researchItem.updateMany({ where: { generatedBy: "claude_dev_session" }, data: { generatedBy: "deterministic_generation" } });
  const s = await prisma.strategy.updateMany({ where: { generatedBy: "claude_dev_session" }, data: { generatedBy: "deterministic_generation" } });
  const rep = await prisma.report.updateMany({ where: { generatedBy: "claude_dev_session" }, data: { generatedBy: "deterministic_generation" } });
  console.log(`relabelled research=${r.count} strategy=${s.count} report=${rep.count}`);

  const remaining = await prisma.researchItem.count({ where: { generatedBy: "claude_dev_session" } });
  console.log("remaining claude_dev_session research items:", remaining);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
