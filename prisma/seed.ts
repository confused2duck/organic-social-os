import { promises as fs } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { parseStringArray } from "@/lib/json";
import { seedCatalog } from "./seeds/catalog";
import { seedCompanies } from "./seeds/companies";
import { runFullCycle } from "@/lib/agents";
import { renderAllForCompany } from "@/lib/render";

// Deterministic pseudo-random in [0,1) from a string seed (stable across runs).
function rand(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

// Baseline analytics: clearly-labelled test fixtures (source=test_fixture),
// 30 days per configured platform, with a gentle upward follower trend.
async function seedBaselineAnalytics(companyId: string) {
  const config = await prisma.companyConfig.findUnique({ where: { companyId } });
  const platforms = parseStringArray(config?.platforms);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (const platform of platforms) {
    const base = 1200 + Math.floor(rand(companyId + platform) * 4000);
    for (let d = 29; d >= 0; d--) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() - d);
      const day = date.toISOString().slice(0, 10);
      const r = rand(companyId + platform + day);
      const followers = base + (29 - d) * (6 + Math.floor(rand(companyId + platform + "g") * 10));
      const impressions = 400 + Math.floor(r * 2600);
      const reach = Math.floor(impressions * (0.6 + r * 0.25));
      const engagements = Math.floor(reach * (0.02 + r * 0.05));
      await prisma.analyticsDaily.upsert({
        where: { companyId_platform_date: { companyId, platform, date } },
        update: { followers, impressions, reach, engagements },
        create: {
          companyId,
          platform,
          date,
          followers,
          impressions,
          reach,
          engagements,
          profileVisits: Math.floor(engagements * (0.3 + r * 0.4)),
          clicks: Math.floor(engagements * (0.1 + r * 0.3)),
          source: "test_fixture",
        },
      });
    }
  }
}

async function main() {
  console.log("Seeding activity register + agent catalogue …");
  const cat = await seedCatalog(prisma);
  console.log(
    `  ActivityCatalog: ${cat.total} social activities (organic=${cat.organic}, paid=${cat.paid}, leadgen=${cat.leadgen}); AgentDefinition: ${cat.agents}`,
  );

  // Clear previously-generated creative files (ids change on reseed).
  await fs.rm(join(process.cwd(), "public", "generated"), { recursive: true, force: true }).catch(() => {});

  console.log("Seeding demo company workspaces …");
  const companies = await seedCompanies(prisma);
  for (const c of companies) {
    await seedBaselineAnalytics(c.id);
    const results = await runFullCycle(c.id, { withHistory: true });
    const summary = results.map((r) => `${r.agentSystem}:${r.created}`).join(" ");
    const render = await renderAllForCompany(c.id);
    console.log(`  ${c.name} — full cycle [${summary}] · rendered ${render.rendered} (awaiting ${render.awaiting})`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
