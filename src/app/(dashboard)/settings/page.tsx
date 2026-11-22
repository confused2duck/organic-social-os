import { resolveActiveCompany } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { parseStringArray, parseRecord } from "@/lib/json";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { SettingsForm, type SettingsValue } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const company = await resolveActiveCompany();
  if (!company) return <EmptyState title="No workspace selected" />;

  const config = await prisma.companyConfig.findUnique({ where: { companyId: company.id } });

  const initial: SettingsValue = {
    platforms: parseStringArray(config?.platforms),
    postsPerDay: parseRecord<number>(config?.postsPerDay),
    publishingDays: parseStringArray(config?.publishingDays).map(Number),
    preferredTimes: parseRecord<string[]>(config?.preferredTimes),
    contentFormats: parseStringArray(config?.contentFormats),
    timezone: config?.timezone ?? "UTC",
    approvalRequired: config?.approvalRequired ?? true,
    autopublish: config?.autopublish ?? false,
    weeklyReportDay: config?.weeklyReportDay ?? 1,
    weeklyReportTime: config?.weeklyReportTime ?? "08:00",
    reportRecipients: parseStringArray(config?.reportRecipients),
  };

  return (
    <div>
      <PageHeader title="Automation Settings" description="Configure platforms, publishing frequency, approval rules, autonomy and report delivery. These settings control real application behaviour." />
      <SettingsForm initial={initial} />
    </div>
  );
}
