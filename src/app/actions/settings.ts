"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCompany } from "@/lib/tenant";
import { PLATFORMS, CONTENT_FORMATS } from "@/lib/enums";

const schema = z.object({
  platforms: z.array(z.enum(PLATFORMS)).min(1, "Pick at least one platform"),
  postsPerDay: z.record(z.string(), z.number().int().min(0).max(20)),
  publishingDays: z.array(z.number().int().min(0).max(6)),
  preferredTimes: z.record(z.string(), z.array(z.string())),
  contentFormats: z.array(z.enum(CONTENT_FORMATS)),
  timezone: z.string().max(60),
  approvalRequired: z.boolean(),
  autopublish: z.boolean(),
  weeklyReportDay: z.number().int().min(0).max(6),
  weeklyReportTime: z.string().max(10),
  reportRecipients: z.array(z.string().email()).max(10),
});

export type SaveConfigInput = z.infer<typeof schema>;

export async function saveConfigAction(input: SaveConfigInput) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  const company = await requireCompany();
  const d = parsed.data;

  await prisma.companyConfig.update({
    where: { companyId: company.id },
    data: {
      platforms: JSON.stringify(d.platforms),
      postsPerDay: JSON.stringify(d.postsPerDay),
      publishingDays: JSON.stringify(d.publishingDays),
      preferredTimes: JSON.stringify(d.preferredTimes),
      contentFormats: JSON.stringify(d.contentFormats),
      timezone: d.timezone,
      approvalRequired: d.approvalRequired,
      autopublish: d.autopublish,
      weeklyReportDay: d.weeklyReportDay,
      weeklyReportTime: d.weeklyReportTime,
      reportRecipients: JSON.stringify(d.reportRecipients),
    },
  });

  // Ensure a (honest, not-connected) connection row exists for each platform.
  for (const platform of d.platforms) {
    const existing = await prisma.platformConnection.findFirst({ where: { companyId: company.id, platform } });
    if (!existing) {
      await prisma.platformConnection.create({
        data: {
          companyId: company.id,
          platform,
          status: "not_connected",
          capabilities: JSON.stringify({ publish: false, schedule: false, analytics: false, inbox: false }),
        },
      });
    }
  }

  await prisma.company.update({ where: { id: company.id }, data: { timezone: d.timezone } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
