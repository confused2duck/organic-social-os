import { prisma } from "@/lib/db";
import { parseJson, parseStringArray } from "@/lib/json";
import type { CompanyBrandContext, IcpSummary, PersonaSummary, ProductSummary } from "./types";

/**
 * Load the full, structured brand context the deterministic agents consume.
 * Pulls Products, IcpProfiles, Personas, Competitors-derived data, differentiators
 * and objectives, and computes `missing` — essential knowledge the user has NOT
 * provided. Agents use `missing` to flag gaps rather than inventing information.
 */
export async function loadBrandContext(companyId: string): Promise<CompanyBrandContext> {
  const [c, icpProfiles, personas, products] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
    prisma.icpProfile.findMany({ where: { companyId }, orderBy: [{ priority: "asc" }, { createdAt: "asc" }] }),
    prisma.persona.findMany({ where: { companyId } }),
    prisma.product.findMany({ where: { companyId } }),
  ]);
  const prohibited = await prisma.brandClaim.findMany({ where: { companyId, kind: "prohibited" } });

  const messaging = parseJson<{ valueProps?: string[]; keyMessages?: string[] }>(c.messaging, {});
  const brandVoice = parseJson<{ tone?: string[]; doList?: string[]; dontList?: string[]; writingGuidelines?: string }>(c.brandVoice, {});
  const legacyIcp = parseJson<IcpSummary>(c.icp, {});

  // Prefer structured IcpProfiles; fall back to the legacy single icp JSON.
  const icps: IcpSummary[] = icpProfiles.length
    ? icpProfiles.map((p) => ({ name: p.name, summary: p.summary ?? undefined, segments: parseStringArray(p.segments), triggers: parseStringArray(p.triggers), firmographics: parseStringArray(p.firmographics), priority: p.priority }))
    : legacyIcp.summary || legacyIcp.segments?.length
      ? [legacyIcp]
      : [];

  const personaSummaries: PersonaSummary[] = personas.map((p) => ({
    name: p.name,
    role: p.role ?? undefined,
    goals: parseStringArray(p.goals),
    painPoints: parseStringArray(p.painPoints),
    buyingMotivations: parseStringArray(p.buyingMotivations),
  }));

  const productSummaries: ProductSummary[] = products.map((p) => ({ name: p.name, category: p.category ?? undefined, description: p.description ?? undefined, features: parseStringArray(p.features) }));

  const differentiators = parseStringArray(c.differentiators);
  const objectives = parseStringArray(c.objectives);
  const valueProps = messaging.valueProps ?? [];

  // Essential knowledge gaps (never fabricated — surfaced for the user to fill).
  const missing: string[] = [];
  if (!c.positioning) missing.push("positioning statement");
  if (valueProps.length === 0) missing.push("value propositions");
  if (icps.length === 0) missing.push("at least one Ideal Customer Profile");
  if (personaSummaries.length === 0) missing.push("at least one buyer persona");
  if (productSummaries.length === 0) missing.push("products or services");
  if ((brandVoice.tone ?? []).length === 0) missing.push("brand voice / tone");

  return {
    id: c.id,
    name: c.name,
    industry: c.industry,
    positioning: c.positioning,
    tagline: c.tagline,
    icp: icps[0] ?? {},
    icps,
    personas: personaSummaries,
    products: productSummaries,
    messaging,
    differentiators,
    objectives,
    brandVoice,
    prohibitedClaims: prohibited.map((p) => p.text),
    markets: parseStringArray(c.markets),
    colors: parseJson(c.colors, { primary: "#1f4e79", secondary: "#2e8b8b", accent: "#f4a300", neutralDark: "#172033", neutralLight: "#f4f7fb" }),
    missing,
  };
}
