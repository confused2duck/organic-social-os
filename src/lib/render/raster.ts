import { promises as fs } from "node:fs";
import { dirname } from "node:path";

// sharp is a native dep; import lazily so the module can load even if the
// binary is unavailable (callers handle the capability state honestly).
type Sharp = typeof import("sharp");
let sharpMod: Sharp | null | undefined;
async function getSharp(): Promise<Sharp | null> {
  if (sharpMod !== undefined) return sharpMod;
  try {
    sharpMod = (await import("sharp")).default as unknown as Sharp;
  } catch {
    sharpMod = null;
  }
  return sharpMod;
}

export async function sharpAvailable(): Promise<boolean> {
  return (await getSharp()) !== null;
}

export interface RasterResult {
  path: string;
  width: number;
  height: number;
  bytes: number;
}

/** Rasterise an SVG string to a PNG file. Throws if sharp is unavailable. */
export async function svgToPng(svg: string, outPath: string): Promise<RasterResult> {
  const sharp = await getSharp();
  if (!sharp) throw new Error("sharp unavailable");
  await fs.mkdir(dirname(outPath), { recursive: true });
  const buf = await sharp(Buffer.from(svg)).png({ quality: 90 }).toBuffer();
  await fs.writeFile(outPath, buf);
  const meta = await sharp(buf).metadata();
  return { path: outPath, width: meta.width ?? 0, height: meta.height ?? 0, bytes: buf.length };
}

/** Rasterise an SVG to a PNG buffer (for video frames). */
export async function svgToPngBuffer(svg: string): Promise<Buffer> {
  const sharp = await getSharp();
  if (!sharp) throw new Error("sharp unavailable");
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Small thumbnail from an existing PNG buffer/file. */
export async function makeThumbnail(srcPng: Buffer, outPath: string, width = 480): Promise<string> {
  const sharp = await getSharp();
  if (!sharp) throw new Error("sharp unavailable");
  await fs.mkdir(dirname(outPath), { recursive: true });
  await sharp(srcPng).resize({ width }).png().toFile(outPath);
  return outPath;
}
