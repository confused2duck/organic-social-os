import { prisma } from "@/lib/db";
import { runCreativeSpecs } from "@/lib/agents";
import { renderAllForCompany } from "@/lib/render";

async function main() {
  const a = await prisma.company.findFirst({ where: { slug: "atlas-fitness-studio" } });
  if (!a) { console.log("Atlas not found"); return; }
  const spec = await runCreativeSpecs(a.id);
  const render = await renderAllForCompany(a.id);
  console.log(`Atlas: specs ${spec.created}, rendered ${render.rendered} (awaiting ${render.awaiting})`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
