import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";
import { svgToPngBuffer } from "./raster";
import { staticSvg, type RenderSpec } from "./svg";

// ffmpeg-static exports the path to a bundled ffmpeg binary (or null).
async function ffmpegPath(): Promise<string | null> {
  if (process.env.ENABLE_VIDEO_RENDER === "0") return null;
  try {
    const mod = await import("ffmpeg-static");
    const p = (mod.default ?? (mod as unknown as string)) as string | null;
    if (!p) return null;
    await fs.access(p);
    return p;
  } catch {
    return null;
  }
}

export async function videoRenderAvailable(): Promise<boolean> {
  return (await ffmpegPath()) !== null;
}

export interface VideoResult {
  available: boolean;
  path?: string;
  bytes?: number;
  durationMs?: number;
  reason?: string;
}

/**
 * Render a real MP4 from the spec's scenes using the bundled ffmpeg binary.
 * Each scene becomes a held frame (rasterised from SVG) for its duration.
 * If ffmpeg is unavailable, returns { available: false } so the caller can set
 * the honest `awaiting_render_runtime` state — nothing is faked.
 */
export async function renderVideo(spec: RenderSpec, outPath: string): Promise<VideoResult> {
  const ffmpeg = await ffmpegPath();
  if (!ffmpeg) return { available: false, reason: "ffmpeg binary unavailable (ENABLE_VIDEO_RENDER off or ffmpeg-static not installed)" };

  const scenes = spec.scenes?.length ? spec.scenes : [{ caption: spec.headline, seconds: 3 }];
  const tmp = await fs.mkdtemp(join(os.tmpdir(), "osos-vid-"));
  try {
    const listLines: string[] = [];
    for (let i = 0; i < scenes.length; i++) {
      const svg = staticSvg(spec, { frameCaption: scenes[i].caption, badge: i === 0 ? undefined : undefined });
      const png = await svgToPngBuffer(svg);
      const frameName = `frame_${String(i).padStart(3, "0")}.png`;
      await fs.writeFile(join(tmp, frameName), png);
      listLines.push(`file '${frameName}'`, `duration ${Math.max(1, scenes[i].seconds)}`);
    }
    // concat demuxer requires the last file repeated with no duration.
    listLines.push(`file 'frame_${String(scenes.length - 1).padStart(3, "0")}.png'`);
    await fs.writeFile(join(tmp, "list.txt"), listLines.join("\n"));

    await fs.mkdir(dirname(outPath), { recursive: true });
    const args = ["-y", "-f", "concat", "-safe", "0", "-i", "list.txt", "-r", "30", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-movflags", "+faststart", outPath];

    const code = await new Promise<number>((resolve) => {
      const proc = spawn(ffmpeg, args, { cwd: tmp });
      proc.on("error", () => resolve(-1));
      proc.on("close", (c) => resolve(c ?? -1));
    });
    if (code !== 0) return { available: false, reason: `ffmpeg exited with code ${code}` };

    const stat = await fs.stat(outPath);
    const durationMs = scenes.reduce((s, sc) => s + Math.max(1, sc.seconds), 0) * 1000;
    return { available: true, path: outPath, bytes: stat.size, durationMs };
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
