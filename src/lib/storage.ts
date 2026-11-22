import { promises as fs } from "node:fs";
import { extname } from "node:path";

// ===========================================================================
// Media storage abstraction.
//
// Generated creatives (graphics, carousels, posters, video) and uploads are
// produced on a real filesystem by the background worker. Where they are SERVED
// from depends on the deployment:
//
//   STORAGE_DRIVER=local        → files live under /public/generated and are
//                                 served by Next (local dev / self-hosted).
//   STORAGE_DRIVER=vercel-blob  → files are uploaded to Vercel Blob (durable,
//                                 CDN-served) because a Vercel Function / build
//                                 filesystem is ephemeral and read-only.
//
// The renderer always writes a local file first (sharp/ffmpeg need one); this
// layer then returns the durable, servable URL to store on the record.
// ===========================================================================

export type StorageDriver = "local" | "vercel-blob";

export function storageDriver(): StorageDriver {
  const d = (process.env.STORAGE_DRIVER || "local").toLowerCase();
  return d === "vercel-blob" || d === "blob" ? "vercel-blob" : "local";
}

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
};

function contentTypeFor(key: string): string {
  return MIME[extname(key).toLowerCase()] || "application/octet-stream";
}

// Dynamic, bundler-opaque import so the app builds without @vercel/blob present.
// The package is only required when STORAGE_DRIVER=vercel-blob.
async function loadBlob(): Promise<{ put: (k: string, d: Buffer | Uint8Array, o: Record<string, unknown>) => Promise<{ url: string }> } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const mod = (await (Function('return import("@vercel/blob")')() as Promise<unknown>)) as {
      put: (k: string, d: Buffer | Uint8Array, o: Record<string, unknown>) => Promise<{ url: string }>;
    };
    return mod;
  } catch {
    return null;
  }
}

async function putToBlob(key: string, data: Buffer | Uint8Array): Promise<string> {
  const blob = await loadBlob();
  if (!blob) throw new Error("STORAGE_DRIVER=vercel-blob but @vercel/blob is not installed (run: npm i @vercel/blob).");
  const { url } = await blob.put(key, data, {
    access: "public",
    contentType: contentTypeFor(key),
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return url;
}

/**
 * Persist an already-rendered local file and return the durable, servable URL.
 * `publicKey` is the storage path WITHOUT a leading slash, e.g.
 * "generated/<companyId>/<creativeId>/static.png".
 *   local      → "/<publicKey>" (the file is already under /public)
 *   vercel-blob → uploads the file and returns its blob URL
 */
export async function persistRenderedFile(diskPath: string, publicKey: string): Promise<string> {
  const key = publicKey.replace(/^\/+/, "");
  if (storageDriver() === "local") return `/${key}`;
  const buf = await fs.readFile(diskPath);
  return putToBlob(key, buf);
}

/** Persist an in-memory buffer (e.g. an upload) and return its servable URL. */
export async function persistBuffer(data: Buffer | Uint8Array, publicKey: string): Promise<string> {
  const key = publicKey.replace(/^\/+/, "");
  if (storageDriver() === "local") {
    const { join } = await import("node:path");
    const out = join(process.cwd(), "public", key);
    await fs.mkdir(join(out, ".."), { recursive: true });
    await fs.writeFile(out, data);
    return `/${key}`;
  }
  return putToBlob(key, data);
}
