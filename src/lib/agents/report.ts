import { prisma } from "@/lib/db";
import { loadBrandContext } from "./context";
import { computeInsights } from "./analytics";
import { weekLabel } from "./strategy";
import { formatNumber, pct } from "@/lib/utils";
import { PLATFORM_LABELS, type Platform } from "@/lib/enums";
import type { AgentResult } from "./types";

/**
 * Agent G — Reporting & Optimisation. Generates a weekly organic performance
 * report from GENUINE stored data (labelled by source). Email delivery is only
 * attempted when SMTP is configured; otherwise it stays `not_configured`.
 */
export async function runWeeklyReport(companyId: string): Promise<AgentResult> {
  const ctx = await loadBrandContext(companyId);
  const insights = await computeInsights(companyId, 7);

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);

  const findings: string[] = [];
  if (insights.bestPlatform) findings.push(`${insights.bestPlatform} had the strongest engagement rate (${pct(insights.byPlatform[0]?.engagementRate ?? 0)}).`);
  if (insights.totals.followerDelta !== 0) findings.push(`Followers moved ${insights.totals.followerDelta >= 0 ? "+" : ""}${formatNumber(insights.totals.followerDelta)} over the period.`);
  if (insights.byFormat[0]) findings.push(`Best-performing format: ${insights.byFormat[0].format} (avg ${pct(insights.byFormat[0].avgEngagementRate)}).`);
  if (insights.topPosts[0]) findings.push(`Top post: "${insights.topPosts[0].topic}" (${pct(insights.topPosts[0].engagementRate)} eng.).`);
  if (findings.length === 0) findings.push("Not enough connected/imported data yet to draw performance conclusions.");

  const recommendations: string[] = [];
  if (insights.byFormat[0]) recommendations.push(`Shift more slots toward ${insights.byFormat[0].format}; it is outperforming.`);
  if (insights.worstPlatform) recommendations.push(`Test new hooks on ${insights.worstPlatform} to lift its engagement rate.`);
  recommendations.push("Reinforce the top-performing pillar in next week's calendar.");

  const nextWeekPlan = [
    `Publish the config-driven calendar for ${weekLabel(end)}.`,
    `Prioritise ${insights.byFormat[0]?.format ?? "proven"} formats.`,
    "Review approvals daily; keep the queue clear.",
  ];

  const platformResults = insights.byPlatform.map((p) => ({
    platform: PLATFORM_LABELS[p.platform as Platform] ?? p.platform,
    followers: p.followers,
    followerDelta: p.followerDelta,
    impressions: p.impressions,
    engagementRate: p.engagementRate,
  }));

  const title = `${ctx.name} — Weekly Organic Report (${weekLabel(end)})`;
  const html = renderReportHtml({ title, ctx: ctx.name, insights, findings, recommendations, nextWeekPlan });

  const report = await prisma.report.create({
    data: {
      companyId,
      title,
      period: weekLabel(end),
      startDate: start,
      endDate: end,
      summary: JSON.stringify({ headline: findings[0], highlights: findings.slice(1) }),
      platformResults: JSON.stringify(platformResults),
      findings: JSON.stringify(findings),
      recommendations: JSON.stringify(recommendations),
      nextWeekPlan: JSON.stringify(nextWeekPlan),
      dataBasis: insights.dataSource,
      html,
      status: "generated",
      generatedBy: "deterministic_generation",
    },
  });

  // Honest email state: not_configured unless SMTP env is present.
  const smtpConfigured = Boolean(process.env.SMTP_HOST);
  await prisma.emailDelivery.create({
    data: {
      companyId,
      reportId: report.id,
      recipients: JSON.stringify([]),
      status: smtpConfigured ? "pending" : "not_configured",
    },
  });

  return { agentSystem: "G", created: 1, notes: `Weekly report generated from ${insights.dataSource} data. Email: ${smtpConfigured ? "pending" : "not configured"}.` };
}

function renderReportHtml(args: {
  title: string;
  ctx: string;
  insights: Awaited<ReturnType<typeof computeInsights>>;
  findings: string[];
  recommendations: string[];
  nextWeekPlan: string[];
}): string {
  const { title, insights, findings, recommendations, nextWeekPlan } = args;
  const row = (label: string, value: string) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${label}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right"><b>${value}</b></td></tr>`;
  const list = (items: string[]) => `<ul>${items.map((i) => `<li style="margin:4px 0">${i}</li>`).join("")}</ul>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:Inter,Arial,sans-serif;color:#172033;max-width:760px;margin:0 auto;padding:28px">
<div style="background:#1f4e79;color:#fff;padding:20px 24px;border-radius:12px">
  <h1 style="margin:0;font-size:20px">${title}</h1>
  <p style="margin:6px 0 0;opacity:.85">Period ${insights.period.start} → ${insights.period.end} · Data source: ${insights.dataSource}</p>
</div>
<h2 style="font-size:15px;margin-top:24px">Totals</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px">
${row("Total followers", formatNumber(insights.totals.followers))}
${row("Follower change", (insights.totals.followerDelta >= 0 ? "+" : "") + formatNumber(insights.totals.followerDelta))}
${row("Impressions", formatNumber(insights.totals.impressions))}
${row("Engagement rate", pct(insights.totals.engagementRate))}
</table>
<h2 style="font-size:15px;margin-top:24px">Findings</h2>${list(findings)}
<h2 style="font-size:15px;margin-top:24px">Recommendations</h2>${list(recommendations)}
<h2 style="font-size:15px;margin-top:24px">Next week</h2>${list(nextWeekPlan)}
<p style="color:#8a94a6;font-size:12px;margin-top:28px">Generated by Organic Social OS. Figures are labelled by source; no results are fabricated.</p>
</body></html>`;
}
