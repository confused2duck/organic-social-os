import { prisma } from "@/lib/db";
import { renderAllForCompany } from "@/lib/render";
import { sharpAvailable } from "@/lib/render/raster";
import { videoRenderAvailable } from "@/lib/render/video";

async function main() {
  console.log("sharp available:", await sharpAvailable());
  console.log("ffmpeg/video available:", await videoRenderAvailable());

  const company = await prisma.company.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  console.log(`Rendering creatives for ${company.name} …`);
  const result = await renderAllForCompany(company.id);
  console.log("Render result:", result);

  const rendered = await prisma.creativeAsset.findMany({
    where: { companyId: company.id },
    select: { type: true, capabilityState: true, renderPath: true, bytes: true, durationMs: true },
    take: 8,
  });
  for (const r of rendered) {
    console.log(`  [${r.capabilityState}] ${r.type} -> ${r.renderPath ?? "-"} ${r.bytes ? `(${r.bytes}b)` : ""}${r.durationMs ? ` ${r.durationMs}ms` : ""}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
