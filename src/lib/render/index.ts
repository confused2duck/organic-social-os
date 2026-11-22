import { join } from "node:path";
import { promises as fs } from "node:fs";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { staticSvg, type RenderSpec } from "./svg";
import { svgToPng, makeThumbnail, svgToPngBuffer, sharpAvailable } from "./raster";
import { renderVideo } from "./video";
import { persistRenderedFile } from "@/lib/storage";

const PUBLIC_ROOT = join(process.cwd(), "public");
const GEN_SUBDIR = "generated";

function publicUrl(...parts: string[]): string {
  return "/" + [GEN_SUBDIR, ...parts].join("/");
}
function diskPath(...parts: string[]): string {
  return join(PUBLIC_ROOT, GEN_SUBDIR, ...parts);
}
// Persist a rendered local file to durable storage and return its servable URL.
// With STORAGE_DRIVER=local this is identical to publicUrl(); with vercel-blob
// it uploads the file and returns the blob URL.
function durableUrl(...parts: string[]): Promise<string> {
  return persistRenderedFile(diskPath(...parts), [GEN_SUBDIR, ...parts].join("/"));
}

export interface RenderOutcome {
  creativeId: string;
  capabilityState: "rendered" | "awaiting_render_runtime" | "blocked";
  renderPath?: string;
  note?: string;
}

/** Render a single creative asset to real files on disk. Tenant-scoped. */
export async function renderCreative(creativeId: string, companyId: string): Promise<RenderOutcome> {
  const creative = await prisma.creativeAsset.findFirst({ where: { id: creativeId, companyId } });
  if (!creative) return { creativeId, capabilityState: "blocked", note: "not found" };

  const spec = parseJson<RenderSpec | null>(creative.spec, null);
  if (!spec) return { creativeId, capabilityState: "blocked", note: "no spec" };

  if (!(await sharpAvailable())) {
    await prisma.creativeAsset.update({ where: { id: creative.id }, data: { capabilityState: "awaiting_render_runtime" } });
    return { creativeId, capabilityState: "awaiting_render_runtime", note: "image renderer (sharp) unavailable" };
  }

  const base = [creative.companyId, creative.id];

  if (creative.type === "static_graphic" || creative.type === "image" || creative.type === "story") {
    const png = await svgToPng(staticSvg(spec), diskPath(...base, "static.png"));
    await makeThumbnail(await fs.readFile(png.path), diskPath(...base, "thumb.png"));
    const [staticUrl, thumbUrl] = await Promise.all([durableUrl(...base, "static.png"), durableUrl(...base, "thumb.png")]);
    await prisma.creativeAsset.update({
      where: { id: creative.id },
      data: { capabilityState: "rendered", renderPath: staticUrl, thumbnailPath: thumbUrl, width: png.width, height: png.height, bytes: png.bytes },
    });
    return { creativeId, capabilityState: "rendered", renderPath: staticUrl };
  }

  if (creative.type === "carousel" || creative.type === "document") {
    const slides = spec.slides?.length ? spec.slides : [{ title: spec.headline, body: spec.subhead ?? "" }];
    const slidePaths: string[] = [];
    let first: Awaited<ReturnType<typeof svgToPng>> | null = null;
    for (let i = 0; i < slides.length; i++) {
      const svg = staticSvg(spec, { badge: `${i + 1}/${slides.length}`, slideTitle: slides[i].title, slideBody: slides[i].body });
      const res = await svgToPng(svg, diskPath(...base, `slide_${i}.png`));
      if (i === 0) first = res;
      slidePaths.push(await durableUrl(...base, `slide_${i}.png`));
    }
    await makeThumbnail(await svgToPngBuffer(staticSvg(spec, { badge: `1/${slides.length}`, slideTitle: slides[0].title, slideBody: slides[0].body })), diskPath(...base, "thumb.png"));
    const carouselThumb = await durableUrl(...base, "thumb.png");
    await prisma.creativeAsset.update({
      where: { id: creative.id },
      data: {
        capabilityState: "rendered",
        renderPath: slidePaths[0],
        thumbnailPath: carouselThumb,
        width: first?.width,
        height: first?.height,
        spec: JSON.stringify({ ...spec, renderedSlides: slidePaths }),
      },
    });
    return { creativeId, capabilityState: "rendered", renderPath: slidePaths[0], note: `${slides.length} slides` };
  }

  if (creative.type === "video" || creative.type === "reel") {
    // Always render a real poster frame so there is a legitimate visual.
    const poster = await svgToPng(staticSvg(spec, { frameCaption: spec.scenes?.[0]?.caption ?? spec.headline }), diskPath(...base, "poster.png"));
    await makeThumbnail(await fs.readFile(poster.path), diskPath(...base, "thumb.png"));
    const [posterUrl, videoThumb] = await Promise.all([durableUrl(...base, "poster.png"), durableUrl(...base, "thumb.png")]);

    const video = await renderVideo(spec, diskPath(...base, "video.mp4"));
    if (video.available) {
      const videoUrl = await durableUrl(...base, "video.mp4");
      await prisma.creativeAsset.update({
        where: { id: creative.id },
        data: { capabilityState: "rendered", renderPath: videoUrl, thumbnailPath: videoThumb, durationMs: video.durationMs, bytes: video.bytes, width: poster.width, height: poster.height },
      });
      return { creativeId, capabilityState: "rendered", renderPath: videoUrl, note: "mp4 rendered" };
    }
    // Honest fallback: workflow complete, poster real, but no MP4 encoder.
    await prisma.creativeAsset.update({
      where: { id: creative.id },
      data: { capabilityState: "awaiting_render_runtime", renderPath: posterUrl, thumbnailPath: videoThumb, width: poster.width, height: poster.height },
    });
    return { creativeId, capabilityState: "awaiting_render_runtime", renderPath: posterUrl, note: video.reason };
  }

  // text/poll — no visual asset to render.
  await prisma.creativeAsset.update({ where: { id: creative.id }, data: { capabilityState: "rendered" } });
  return { creativeId, capabilityState: "rendered", note: "text format (no raster)" };
}

/** Render every not-yet-rendered creative for a company. */
export async function renderAllForCompany(companyId: string): Promise<{ rendered: number; awaiting: number; blocked: number }> {
  const creatives = await prisma.creativeAsset.findMany({ where: { companyId, capabilityState: { in: ["draft", "awaiting_render_runtime"] } } });
  let rendered = 0, awaiting = 0, blocked = 0;
  for (const c of creatives) {
    const r = await renderCreative(c.id, companyId);
    if (r.capabilityState === "rendered") rendered++;
    else if (r.capabilityState === "awaiting_render_runtime") awaiting++;
    else blocked++;
  }
  return { rendered, awaiting, blocked };
}
