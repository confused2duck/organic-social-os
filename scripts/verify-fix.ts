import { prisma } from "@/lib/db";
import { runCalendar } from "@/lib/agents";
import { parseJson } from "@/lib/json";

async function main() {
  const a = await prisma.company.findFirst({ where: { slug: "atlas-fitness-studio" } });
  if (!a) { console.log("Atlas company not found (create it via onboarding first)"); return; }
  await runCalendar(a.id);
  const posts = await prisma.contentPost.findMany({ where: { companyId: a.id }, take: 4, orderBy: { scheduledFor: "desc" } });
  for (const p of posts) {
    const h = parseJson<string[]>(p.hashtags, []);
    console.log(`topic: ${p.topic} | tags: ${h.join(" ")}`);
  }
  const all = await prisma.contentPost.findMany({ where: { companyId: a.id }, select: { topic: true, hashtags: true } });
  const emptyQuote = all.filter((p) => p.topic.includes('""')).length;
  const weakTag = all.filter((p) => parseJson<string[]>(p.hashtags, []).some((t) => t.length <= 2)).length;
  console.log(`DEFECT CHECK → empty-quote topics: ${emptyQuote}, weak(<=2char) hashtags: ${weakTag} (expect 0, 0)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
