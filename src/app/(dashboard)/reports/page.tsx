import { resolveActiveCompany } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { parseStringArray, parseJson } from "@/lib/json";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { RunWorkflowButton } from "@/components/actions/run-workflow-button";
import { Download, Mail } from "lucide-react";
import { formatDate, formatNumber, pct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const company = await resolveActiveCompany();
  if (!company) return <EmptyState title="No workspace selected" />;

  const reports = await prisma.report.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    include: { delivery: true },
  });
  const latest = reports[0];

  return (
    <div>
      <PageHeader title="Weekly Reports" description="Professional organic performance reports from genuine stored data. Scheduled email delivery runs only when an authorised SMTP integration is configured.">
        <RunWorkflowButton step="report" label="Generate report" size="sm" />
      </PageHeader>

      {!latest ? (
        <EmptyState title="No reports yet" description="Generate a weekly report from your performance data." action={<RunWorkflowButton step="report" label="Generate report" />} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>{latest.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={latest.dataBasis} />
                    <a href={`/reports/${latest.id}/download`} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-secondary">
                      <Download className="size-3.5" /> Download
                    </a>
                  </div>
                </div>
                <p className="pt-1 text-xs text-muted-foreground">{formatDate(latest.startDate)} → {formatDate(latest.endDate)}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ReportList title="Findings" items={parseStringArray(latest.findings)} />
                <ReportList title="Recommendations" items={parseStringArray(latest.recommendations)} />
                <ReportList title="Next week's plan" items={parseStringArray(latest.nextWeekPlan)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Platform results</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-muted-foreground">
                      <th className="py-2">Platform</th><th>Followers</th><th>Δ</th><th>Impressions</th><th>Eng. rate</th>
                    </tr></thead>
                    <tbody>
                      {parseJson<{ platform: string; followers: number; followerDelta: number; impressions: number; engagementRate: number }[]>(latest.platformResults, []).map((r) => (
                        <tr key={r.platform} className="border-b last:border-0">
                          <td className="py-2 font-medium">{r.platform}</td>
                          <td>{formatNumber(r.followers)}</td>
                          <td className="text-success">+{formatNumber(r.followerDelta)}</td>
                          <td>{formatNumber(r.impressions)}</td>
                          <td>{pct(r.engagementRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle className="text-base">Email delivery</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" /><StatusBadge status={latest.delivery?.status ?? "not_configured"} /></div>
                <p className="text-xs text-muted-foreground">
                  {latest.delivery?.status === "sent"
                    ? `Delivered to ${parseStringArray(latest.delivery.recipients).join(", ")}`
                    : "Email delivery is not configured. Set SMTP credentials and report recipients in Automation Settings to enable authorised delivery. Delivery results are recorded truthfully."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Report history</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {reports.map((r) => (
                  <a key={r.id} href={`/reports/${r.id}/download`} className="flex items-center justify-between rounded-lg border p-2.5 text-sm hover:bg-secondary">
                    <span>{r.period}</span>
                    <Badge tone="muted">{formatDate(r.createdAt)}</Badge>
                  </a>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{title}</p>
      <ul className="space-y-1 text-sm">
        {items.map((i, idx) => (
          <li key={idx} className="flex gap-2"><span className="text-primary">•</span><span>{i}</span></li>
        ))}
      </ul>
    </div>
  );
}
