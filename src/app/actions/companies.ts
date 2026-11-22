"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setActiveCompany } from "@/lib/tenant";
import { PLATFORMS } from "@/lib/enums";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || "company";
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.company.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${++n}`;
  }
  return slug;
}

const createSchema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  industry: z.string().max(120).optional().default(""),
  website: z.string().max(200).optional().default(""),
  timezone: z.string().max(60).optional().default("UTC"),
  platforms: z.array(z.enum(PLATFORMS)).min(1, "Pick at least one platform"),
});

export type CreateCompanyInput = z.infer<typeof createSchema>;

export async function createCompanyAction(input: CreateCompanyInput) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const slug = await uniqueSlug(slugify(data.name));

  const company = await prisma.company.create({
    data: {
      slug,
      name: data.name,
      website: data.website || null,
      industry: data.industry || null,
      timezone: data.timezone || "UTC",
      dataLabel: "provided",
      config: {
        create: {
          platforms: JSON.stringify(data.platforms),
          postsPerDay: JSON.stringify(Object.fromEntries(data.platforms.map((p) => [p, 1]))),
          publishingDays: JSON.stringify([1, 2, 3, 4, 5]),
          preferredTimes: JSON.stringify(Object.fromEntries(data.platforms.map((p) => [p, ["09:00"]]))),
          timezone: data.timezone || "UTC",
          contentFormats: JSON.stringify(["text", "static", "carousel"]),
          approvalRequired: true,
          autonomy: JSON.stringify({ research: "A0", drafting: "A1", publishing: "A2" }),
          reportRecipients: JSON.stringify([]),
        },
      },
      connections: {
        create: data.platforms.map((p) => ({
          platform: p,
          status: "not_connected",
          capabilities: JSON.stringify({ publish: false, schedule: false, analytics: false, inbox: false }),
        })),
      },
    },
  });

  await setActiveCompany(company.id);
  revalidatePath("/", "layout");
  return { ok: true as const, id: company.id, slug: company.slug };
}

export async function switchCompanyAction(companyId: string) {
  await setActiveCompany(companyId);
  revalidatePath("/", "layout");
  return { ok: true as const };
}
