import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { resolveActiveCompany } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { parseJson, parseStringArray, parseRecord } from "@/lib/json";
import { loadBrandContext } from "@/lib/agents/context";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NarrativeEditor } from "@/components/brand/narrative-editor";
import { ProductsEditor, IcpEditor, PersonasEditor, CompetitorsEditor } from "@/components/brand/entity-editors";
import { VoiceEditor, VisualEditor, ClaimsEditor, DocumentsEditor } from "@/components/brand/extras-editors";

export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const company = await resolveActiveCompany();
  if (!company) return <EmptyState title="No workspace selected" />;

  const [products, icps, personas, competitors, claims, documents, ctx] = await Promise.all([
    prisma.product.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "asc" } }),
    prisma.icpProfile.findMany({ where: { companyId: company.id }, orderBy: [{ priority: "asc" }] }),
    prisma.persona.findMany({ where: { companyId: company.id } }),
    prisma.competitor.findMany({ where: { companyId: company.id } }),
    prisma.brandClaim.findMany({ where: { companyId: company.id } }),
    prisma.brandDocument.findMany({ where: { companyId: company.id }, include: { knowledge: true }, orderBy: { createdAt: "desc" } }),
    loadBrandContext(company.id),
  ]);

  const messaging = parseJson<{ valueProps?: string[]; keyMessages?: string[] }>(company.messaging, {});
  const voice = parseJson<{ tone?: string[]; doList?: string[]; dontList?: string[]; writingGuidelines?: string }>(company.brandVoice, {});
  const colors = parseJson<Record<string, string>>(company.colors, {});
  const fonts = parseJson<{ heading: string; body: string }>(company.fonts, { heading: "Inter", body: "Inter" });

  return (
    <div>
      <PageHeader title="Company & Brand Intelligence" description="The brand knowledge that grounds every output. Fully editable, persisted, and strictly isolated per company.">
        {company.dataLabel === "illustrative_fixture" && <Badge tone="muted">Demo fixture</Badge>}
      </PageHeader>

      {/* Brand completeness — flags missing essentials (never fabricated). */}
      <Card className={ctx.missing.length ? "mb-5 border-warning/40 bg-warning/5" : "mb-5 border-success/40 bg-success/5"}>
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          {ctx.missing.length ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />}
          <div>
            <p className="font-medium">{ctx.missing.length ? `${ctx.missing.length} essential item(s) missing` : "Brand knowledge is complete"}</p>
            <p className="text-muted-foreground">
              {ctx.missing.length
                ? `Add the following so research, strategy and content are specific — they will not be invented: ${ctx.missing.join(", ")}.`
                : "Research, strategy, calendar and creative will use this company's real information."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="company">
        <TabsList className="flex-wrap">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="audience">ICP & Personas</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="voice">Voice & Claims</TabsTrigger>
          <TabsTrigger value="visual">Visual</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card><CardContent className="p-5">
            <NarrativeEditor initial={{
              name: company.name, website: company.website ?? "", industry: company.industry ?? "",
              tagline: company.tagline ?? "", description: company.description ?? "", positioning: company.positioning ?? "",
              valueProps: messaging.valueProps ?? [], keyMessages: messaging.keyMessages ?? [],
              differentiators: parseStringArray(company.differentiators), objectives: parseStringArray(company.objectives),
              audiencePriorities: parseStringArray(company.audiencePriorities), markets: parseStringArray(company.markets),
            }} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="products">
          <Card><CardContent className="p-5"><ProductsEditor items={products.map((p) => ({ id: p.id, name: p.name, category: p.category, description: p.description, features: parseStringArray(p.features) }))} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="audience" className="space-y-5">
          <Card><CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Ideal Customer Profiles</h3>
            <IcpEditor items={icps.map((p) => ({ id: p.id, name: p.name, summary: p.summary, firmographics: parseStringArray(p.firmographics), triggers: parseStringArray(p.triggers), segments: parseStringArray(p.segments), priority: p.priority }))} />
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Buyer personas</h3>
            <PersonasEditor items={personas.map((p) => ({ id: p.id, name: p.name, role: p.role, description: p.description, goals: parseStringArray(p.goals), painPoints: parseStringArray(p.painPoints), buyingMotivations: parseStringArray(p.buyingMotivations), channels: parseStringArray(p.channels) }))} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="competitors">
          <Card><CardContent className="p-5"><CompetitorsEditor items={competitors.map((c) => ({ id: c.id, name: c.name, website: c.website, handles: parseRecord<string>(c.handles), strengths: parseStringArray(c.strengths), weaknesses: parseStringArray(c.weaknesses) }))} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="voice" className="space-y-5">
          <Card><CardContent className="p-5"><h3 className="mb-3 text-sm font-semibold">Brand voice & writing guidelines</h3><VoiceEditor initial={{ tone: voice.tone ?? [], doList: voice.doList ?? [], dontList: voice.dontList ?? [], writingGuidelines: voice.writingGuidelines ?? "" }} /></CardContent></Card>
          <Card><CardContent className="p-5"><h3 className="mb-3 text-sm font-semibold">Approved claims & content restrictions</h3><ClaimsEditor items={claims.map((c) => ({ id: c.id, kind: c.kind, text: c.text, rationale: c.rationale }))} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="visual">
          <Card><CardContent className="p-5"><VisualEditor initial={{ colors, fonts, logoUrl: company.logoUrl ?? "" }} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card><CardContent className="p-5"><DocumentsEditor documents={documents.map((d) => ({ id: d.id, name: d.name, kind: d.kind, processed: d.processed, content: d.content, knowledge: d.knowledge.map((k) => ({ id: k.id, category: k.category, text: k.text })) }))} /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
