"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCompany, NotFoundError } from "@/lib/tenant";
import { extractKnowledge } from "@/lib/knowledge";

const j = (v: unknown) => JSON.stringify(v ?? null);
const strArr = z.array(z.string().max(300)).max(40);

/** Guard: fetch an owned child row or throw (tenant isolation). */
async function owned<T>(companyId: string, finder: (w: { id: string; companyId: string }) => Promise<T | null>, id: string): Promise<T> {
  const row = await finder({ id, companyId });
  if (!row) throw new NotFoundError();
  return row;
}

function fail(e: z.ZodError) {
  return { ok: false as const, error: e.issues[0]?.message ?? "Invalid input" };
}

// ---------------------------------------------------------------------------
// 1. Company narrative (info, positioning, value props, differentiators, objectives)
// ---------------------------------------------------------------------------
const narrativeSchema = z.object({
  name: z.string().min(2).max(80),
  website: z.string().max(200).optional(),
  industry: z.string().max(140).optional(),
  tagline: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  positioning: z.string().max(1000).optional(),
  valueProps: strArr.optional(),
  keyMessages: strArr.optional(),
  differentiators: strArr.optional(),
  objectives: strArr.optional(),
  audiencePriorities: strArr.optional(),
  markets: strArr.optional(),
});

export async function updateNarrativeAction(input: z.infer<typeof narrativeSchema>) {
  const p = narrativeSchema.safeParse(input);
  if (!p.success) return fail(p.error);
  const company = await requireCompany();
  const d = p.data;
  await prisma.company.update({
    where: { id: company.id },
    data: {
      name: d.name,
      website: d.website ?? null,
      industry: d.industry ?? null,
      tagline: d.tagline ?? null,
      description: d.description ?? null,
      positioning: d.positioning ?? null,
      messaging: j({ valueProps: d.valueProps ?? [], keyMessages: d.keyMessages ?? [] }),
      differentiators: j(d.differentiators ?? []),
      objectives: j(d.objectives ?? []),
      audiencePriorities: j(d.audiencePriorities ?? []),
      markets: j(d.markets ?? []),
    },
  });
  revalidatePath("/brand");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// 2. Brand voice & writing guidelines
// ---------------------------------------------------------------------------
const voiceSchema = z.object({
  tone: strArr.optional(),
  doList: strArr.optional(),
  dontList: strArr.optional(),
  writingGuidelines: z.string().max(2000).optional(),
});
export async function updateVoiceAction(input: z.infer<typeof voiceSchema>) {
  const p = voiceSchema.safeParse(input);
  if (!p.success) return fail(p.error);
  const company = await requireCompany();
  await prisma.company.update({
    where: { id: company.id },
    data: { brandVoice: j({ tone: p.data.tone ?? [], doList: p.data.doList ?? [], dontList: p.data.dontList ?? [], writingGuidelines: p.data.writingGuidelines ?? "" }) },
  });
  revalidatePath("/brand");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// 3. Visual brand (colours, fonts, logo URL)
// ---------------------------------------------------------------------------
const hex = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a hex colour like #1f4e79");
const visualSchema = z.object({
  colors: z.object({ primary: hex, secondary: hex, accent: hex, neutralDark: hex, neutralLight: hex }),
  fonts: z.object({ heading: z.string().max(60), body: z.string().max(60) }),
  logoUrl: z.string().max(400).optional(),
});
export async function updateVisualAction(input: z.infer<typeof visualSchema>) {
  const p = visualSchema.safeParse(input);
  if (!p.success) return fail(p.error);
  const company = await requireCompany();
  await prisma.company.update({ where: { id: company.id }, data: { colors: j(p.data.colors), fonts: j(p.data.fonts), logoUrl: p.data.logoUrl || null } });
  revalidatePath("/brand");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// 4. Products / services (CRUD)
// ---------------------------------------------------------------------------
const productSchema = z.object({ name: z.string().min(1).max(120), category: z.enum(["product", "service"]).default("product"), description: z.string().max(1000).optional(), features: strArr.optional() });
export async function addProductAction(input: z.infer<typeof productSchema>) {
  const p = productSchema.safeParse(input);
  if (!p.success) return fail(p.error);
  const company = await requireCompany();
  await prisma.product.create({ data: { companyId: company.id, name: p.data.name, category: p.data.category, description: p.data.description ?? null, features: j(p.data.features ?? []) } });
  revalidatePath("/brand");
  return { ok: true as const };
}
export async function deleteProductAction(id: string) {
  const company = await requireCompany();
  await owned(company.id, (w) => prisma.product.findFirst({ where: w }), id);
  await prisma.product.delete({ where: { id } });
  revalidatePath("/brand");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// 5. ICP profiles (multiple, CRUD)
// ---------------------------------------------------------------------------
const icpSchema = z.object({ name: z.string().min(1).max(120), summary: z.string().max(600).optional(), firmographics: strArr.optional(), triggers: strArr.optional(), segments: strArr.optional(), priority: z.number().int().min(1).max(10).default(1) });
export async function addIcpAction(input: z.infer<typeof icpSchema>) {
  const p = icpSchema.safeParse(input);
  if (!p.success) return fail(p.error);
  const company = await requireCompany();
  await prisma.icpProfile.create({ data: { companyId: company.id, name: p.data.name, summary: p.data.summary ?? null, firmographics: j(p.data.firmographics ?? []), triggers: j(p.data.triggers ?? []), segments: j(p.data.segments ?? []), priority: p.data.priority } });
  revalidatePath("/brand");
  return { ok: true as const };
}
export async function deleteIcpAction(id: string) {
  const company = await requireCompany();
  await owned(company.id, (w) => prisma.icpProfile.findFirst({ where: w }), id);
  await prisma.icpProfile.delete({ where: { id } });
  revalidatePath("/brand");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// 6. Personas (CRUD, incl. buying motivations)
// ---------------------------------------------------------------------------
const personaSchema = z.object({ name: z.string().min(1).max(120), role: z.string().max(120).optional(), description: z.string().max(800).optional(), goals: strArr.optional(), painPoints: strArr.optional(), buyingMotivations: strArr.optional(), channels: strArr.optional() });
export async function addPersonaAction(input: z.infer<typeof personaSchema>) {
  const p = personaSchema.safeParse(input);
  if (!p.success) return fail(p.error);
  const company = await requireCompany();
  await prisma.persona.create({ data: { companyId: company.id, name: p.data.name, role: p.data.role ?? null, description: p.data.description ?? null, goals: j(p.data.goals ?? []), painPoints: j(p.data.painPoints ?? []), buyingMotivations: j(p.data.buyingMotivations ?? []), channels: j(p.data.channels ?? []) } });
  revalidatePath("/brand");
  return { ok: true as const };
}
export async function deletePersonaAction(id: string) {
  const company = await requireCompany();
  await owned(company.id, (w) => prisma.persona.findFirst({ where: w }), id);
  await prisma.persona.delete({ where: { id } });
  revalidatePath("/brand");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// 7. Competitors (CRUD, incl. social handles)
// ---------------------------------------------------------------------------
const competitorSchema = z.object({ name: z.string().min(1).max(120), website: z.string().max(200).optional(), handles: z.record(z.string(), z.string().max(80)).optional(), strengths: strArr.optional(), weaknesses: strArr.optional() });
export async function addCompetitorAction(input: z.infer<typeof competitorSchema>) {
  const p = competitorSchema.safeParse(input);
  if (!p.success) return fail(p.error);
  const company = await requireCompany();
  await prisma.competitor.create({ data: { companyId: company.id, name: p.data.name, website: p.data.website ?? null, handles: j(p.data.handles ?? {}), strengths: j(p.data.strengths ?? []), weaknesses: j(p.data.weaknesses ?? []) } });
  revalidatePath("/brand");
  return { ok: true as const };
}
export async function deleteCompetitorAction(id: string) {
  const company = await requireCompany();
  await owned(company.id, (w) => prisma.competitor.findFirst({ where: w }), id);
  await prisma.competitor.delete({ where: { id } });
  revalidatePath("/brand");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// 8. Brand claims / content restrictions (CRUD)
// ---------------------------------------------------------------------------
const claimSchema = z.object({ kind: z.enum(["approved", "prohibited"]), text: z.string().min(1).max(300), rationale: z.string().max(400).optional() });
export async function addClaimAction(input: z.infer<typeof claimSchema>) {
  const p = claimSchema.safeParse(input);
  if (!p.success) return fail(p.error);
  const company = await requireCompany();
  await prisma.brandClaim.create({ data: { companyId: company.id, kind: p.data.kind, text: p.data.text, rationale: p.data.rationale ?? null } });
  revalidatePath("/brand");
  return { ok: true as const };
}
export async function deleteClaimAction(id: string) {
  const company = await requireCompany();
  await owned(company.id, (w) => prisma.brandClaim.findFirst({ where: w }), id);
  await prisma.brandClaim.delete({ where: { id } });
  revalidatePath("/brand");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// 9. Documents → processed into traceable KnowledgeItems (no fabrication)
// ---------------------------------------------------------------------------
const docSchema = z.object({ name: z.string().min(1).max(160), content: z.string().min(1).max(50000), provenance: z.string().max(300).optional(), kind: z.enum(["document", "guideline", "website_page", "note"]).default("note") });
export async function addDocumentAction(input: z.infer<typeof docSchema>) {
  const p = docSchema.safeParse(input);
  if (!p.success) return fail(p.error);
  const company = await requireCompany();
  const extracted = extractKnowledge(p.data.content);
  const doc = await prisma.brandDocument.create({
    data: {
      companyId: company.id,
      name: p.data.name,
      kind: p.data.kind,
      content: p.data.content,
      sizeBytes: Buffer.byteLength(p.data.content, "utf8"),
      provenance: p.data.provenance ?? "pasted",
      processed: extracted.length > 0,
      knowledge: { create: extracted.map((k) => ({ companyId: company.id, category: k.category, text: k.text })) },
    },
  });
  revalidatePath("/brand");
  return { ok: true as const, documentId: doc.id, knowledgeExtracted: extracted.length };
}
export async function deleteDocumentAction(id: string) {
  const company = await requireCompany();
  await owned(company.id, (w) => prisma.brandDocument.findFirst({ where: w }), id);
  await prisma.brandDocument.delete({ where: { id } }); // cascade clears its knowledge
  revalidatePath("/brand");
  return { ok: true as const };
}
