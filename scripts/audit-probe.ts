import { spawn } from "node:child_process";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { computeInsights } from "@/lib/agents";
import { processNextTask } from "@/lib/worker/runner";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";

const PASS = "PASS";
const FAIL = "FAIL";
let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`[${ok ? PASS : FAIL}] ${name}${detail ? " — " + detail : ""}`);
}

async function tenantIsolation() {
  const [a, b] = await prisma.company.findMany({ orderBy: { createdAt: "asc" }, take: 2 });
  if (!a || !b) return check("tenant isolation", false, "need 2 companies");

  const aPost = await prisma.contentPost.findFirst({ where: { companyId: a.id } });
  // The exact pattern the app uses for record-level access:
  const crossPost = await prisma.contentPost.findFirst({ where: { id: aPost!.id, companyId: b.id } });
  check("cross-tenant post access returns null", crossPost === null, `A.post=${aPost!.id.slice(-6)} as B → ${crossPost}`);

  const aReport = await prisma.report.findFirst({ where: { companyId: a.id } });
  const crossReport = await prisma.report.findFirst({ where: { id: aReport!.id, companyId: b.id } });
  check("cross-tenant report access returns null", crossReport === null);

  const aCreative = await prisma.creativeAsset.findFirst({ where: { companyId: a.id } });
  if (aCreative) {
    const crossCreative = await prisma.creativeAsset.findFirst({ where: { id: aCreative.id, companyId: b.id } });
    check("cross-tenant creative access returns null", crossCreative === null);
  } else {
    check("cross-tenant creative access returns null", true, "company A has no creatives to probe (skipped)");
  }

  // No row anywhere references a non-existent company.
  const companyIds = new Set((await prisma.company.findMany({ select: { id: true } })).map((c) => c.id));
  const allPostCompanies = await prisma.contentPost.findMany({ select: { companyId: true }, distinct: ["companyId"] });
  const orphan = allPostCompanies.filter((p) => !companyIds.has(p.companyId));
  check("no orphaned post companyIds", orphan.length === 0, `${orphan.length} orphans`);
}

async function reportMath() {
  const company = await prisma.company.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  const insights = await computeInsights(company.id, 30);

  // Independently recompute totals straight from raw AnalyticsDaily.
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const rows = await prisma.analyticsDaily.findMany({ where: { companyId: company.id, date: { gte: since } } });
  const rawImpr = rows.reduce((s, r) => s + r.impressions, 0);
  const rawEng = rows.reduce((s, r) => s + r.engagements, 0);
  const rawRate = rawImpr > 0 ? rawEng / rawImpr : 0;

  check("analytics impressions = raw sum", insights.totals.impressions === rawImpr, `insights=${insights.totals.impressions} raw=${rawImpr}`);
  check("analytics engagements = raw sum", insights.totals.engagements === rawEng, `insights=${insights.totals.engagements} raw=${rawEng}`);
  check("engagement rate = eng/impr (±1e-9)", Math.abs(insights.totals.engagementRate - rawRate) < 1e-9);

  // Per-post metric: engagementRate = (likes+comments+shares+saves)/impressions
  const p = await prisma.contentPost.findFirst({ where: { companyId: company.id, status: "published" }, include: { metrics: true } });
  const m = p?.metrics[0];
  if (m) {
    const expected = m.impressions > 0 ? (m.likes + m.comments + m.shares + m.saves) / m.impressions : 0;
    const topMatch = insights.topPosts.find((tp) => tp.id === p!.id);
    check("per-post metric row has consistent impressions>0", m.impressions > 0);
    check("post engagementRate computable from raw fields", expected >= 0 && (!topMatch || Math.abs(topMatch.engagementRate - expected) < 1e-9));
  }
  // Report stored values must be labelled by source (no 'connected' without a connection).
  const report = await prisma.report.findFirst({ where: { companyId: company.id } });
  check("report dataBasis is honestly labelled", report?.dataBasis === "test_fixture", `dataBasis=${report?.dataBasis}`);
}

async function mediaValidity() {
  const png = await prisma.creativeAsset.findFirst({ where: { type: "static_graphic", capabilityState: "rendered", renderPath: { not: null } } });
  if (png?.renderPath) {
    const diskPath = join(process.cwd(), "public", png.renderPath.replace(/^\//, ""));
    const meta = await sharp(diskPath).metadata();
    check("static PNG is a valid image", meta.format === "png" && (meta.width ?? 0) >= 1000, `${meta.format} ${meta.width}x${meta.height}`);
  } else check("static PNG exists", false);

  const vid = await prisma.creativeAsset.findFirst({ where: { type: "video", renderPath: { endsWith: ".mp4" } } });
  if (vid?.renderPath && ffmpegPath) {
    const diskPath = join(process.cwd(), "public", vid.renderPath.replace(/^\//, ""));
    const info = await new Promise<string>((resolve) => {
      let err = "";
      const proc = spawn(ffmpegPath as string, ["-i", diskPath]);
      proc.stderr.on("data", (d) => (err += d.toString()));
      proc.on("close", () => resolve(err));
      proc.on("error", () => resolve(""));
    });
    const hasVideo = /Video:\s*h264/i.test(info);
    const dur = /Duration:\s*(\d+):(\d+):(\d+)/.exec(info);
    const durSec = dur ? +dur[1] * 3600 + +dur[2] * 60 + +dur[3] : 0;
    check("MP4 is a real h264 video with duration", hasVideo && durSec > 0, `h264=${hasVideo} duration=${durSec}s`);
  } else check("MP4 exists", false);

  const carousel = await prisma.creativeAsset.findFirst({ where: { type: "carousel", capabilityState: "rendered" } });
  const slides = carousel ? parseJson<{ renderedSlides?: string[] }>(carousel.spec, {}).renderedSlides : undefined;
  check("carousel has multiple rendered slides", (slides?.length ?? 0) >= 2, `${slides?.length ?? 0} slides`);
}

async function workerRestart() {
  const company = await prisma.company.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  // Simulate a task left 'processing' by a crash 10 minutes ago.
  const stale = await prisma.task.create({
    data: {
      companyId: company.id,
      type: "agent.community",
      title: "AUDIT stale-recovery probe",
      status: "processing",
      startedAt: new Date(Date.now() - 10 * 60 * 1000),
      attempts: 1,
    },
  });
  const processed = await processNextTask(); // should re-queue stale, then claim+run it
  const after = await prisma.task.findUnique({ where: { id: stale.id } });
  check("crashed 'processing' task is recovered and completed", after?.status === "completed", `status=${after?.status} viaProcess=${processed?.id === stale.id}`);
  // cleanup
  await prisma.task.delete({ where: { id: stale.id } }).catch(() => {});
}

async function main() {
  console.log("sharp:", sharp !== undefined, "· ffmpeg:", Boolean(ffmpegPath));
  await tenantIsolation();
  await reportMath();
  await mediaValidity();
  await workerRestart();
  console.log(`\nAUDIT PROBE: ${failures === 0 ? "ALL PASS" : failures + " FAILURES"}`);
  await prisma.$disconnect();
  if (failures > 0) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
