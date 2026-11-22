import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { loadBrandContext } from "./context";
import type { AgentResult } from "./types";

export interface CreativeSpec {
  kind: "static_graphic" | "carousel" | "video";
  headline: string;
  subhead?: string;
  cta?: string;
  colors: { bg: string; fg: string; accent: string };
  logoText: string;
  width: number;
  height: number;
  slides?: { title: string; body: string }[];
  scenes?: { caption: string; seconds: number }[];
}

const DIMENSIONS: Record<string, { w: number; h: number }> = {
  static: { w: 1080, h: 1080 },
  carousel: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
  reel: { w: 1080, h: 1920 },
  short: { w: 1080, h: 1920 },
  video: { w: 1080, h: 1080 },
  document: { w: 1080, h: 1350 },
  text: { w: 1080, h: 1080 },
  poll: { w: 1080, h: 1080 },
};

/**
 * Agent E — Creative Production (spec stage). Builds a deterministic, on-brand
 * design spec for each post that lacks one. Rendering spec → real PNG/SVG/MP4
 * files is performed by src/lib/render (sharp / ffmpeg), which sets the honest
 * capabilityState (rendered | awaiting_render_runtime).
 */
export async function runCreativeSpecs(companyId: string): Promise<AgentResult> {
  const ctx = await loadBrandContext(companyId);
  const colors = ctx.colors;
  const posts = await prisma.contentPost.findMany({
    where: { companyId, creatives: { none: {} } },
    orderBy: { scheduledFor: "asc" },
  });

  let created = 0;
  for (const post of posts) {
    const hashtags = parseJson<string[]>(post.hashtags, []);
    const dim = DIMENSIONS[post.format] ?? { w: 1080, h: 1080 };
    const isCarousel = post.format === "carousel" || post.format === "document";
    const isVideo = post.format === "reel" || post.format === "short" || post.format === "video";
    const type = isCarousel ? "carousel" : isVideo ? "video" : "static_graphic";

    const spec: CreativeSpec = {
      kind: type as CreativeSpec["kind"],
      headline: headlineFrom(post.topic),
      subhead: post.mainMessage ?? undefined,
      cta: hashtags[0] ?? ctx.tagline ?? undefined,
      colors: { bg: colors.primary ?? "#1f4e79", fg: colors.neutralLight ?? "#f4f7fb", accent: colors.accent ?? "#f4a300" },
      logoText: ctx.name,
      width: dim.w,
      height: dim.h,
      ...(isCarousel ? { slides: carouselSlides(post.topic, post.mainMessage ?? "", post.caption ?? "") } : {}),
      ...(isVideo ? { scenes: videoScenes(post.topic, post.mainMessage ?? "", post.caption ?? "") } : {}),
    };

    await prisma.creativeAsset.create({
      data: {
        companyId,
        postId: post.id,
        type,
        title: `${post.topic} — ${post.format}`,
        spec: JSON.stringify(spec),
        capabilityState: "draft",
        width: dim.w,
        height: dim.h,
      },
    });
    created++;
  }

  return { agentSystem: "E", created, notes: `Built ${created} on-brand creative specs. Rendering produces real files via sharp/ffmpeg.` };
}

function headlineFrom(topic: string): string {
  const parts = topic.split(":");
  return (parts[1] ?? parts[0]).trim().replace(/^./, (c) => c.toUpperCase());
}
function carouselSlides(topic: string, message: string, caption: string): { title: string; body: string }[] {
  return [
    { title: headlineFrom(topic), body: message || caption.split("\n")[0] || "" },
    { title: "Why it matters", body: message || "The context behind the point." },
    { title: "How to apply it", body: "Three concrete steps you can take this week." },
    { title: "Proof", body: "A quick example that shows it working." },
    { title: "Your move", body: caption.split("\n").slice(-1)[0] || "Save this and try it." },
  ];
}
function videoScenes(topic: string, message: string, caption: string): { caption: string; seconds: number }[] {
  return [
    { caption: headlineFrom(topic), seconds: 2 },
    { caption: message || "Here's the idea", seconds: 3 },
    { caption: "The how →", seconds: 3 },
    { caption: caption.split("\n").slice(-1)[0] || "Follow for more", seconds: 2 },
  ];
}
