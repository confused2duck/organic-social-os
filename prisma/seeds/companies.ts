import type { PrismaClient } from "@prisma/client";

// Two clearly-labelled illustrative test companies (dataLabel = illustrative_fixture).
// No figures are presented as real performance; analytics are source=test_fixture.

interface DemoSpec {
  slug: string;
  name: string;
  website: string;
  industry: string;
  markets: string[];
  tagline: string;
  description: string;
  positioning: string;
  messaging: { valueProps: string[]; keyMessages: string[] };
  brandVoice: { tone: string[]; doList: string[]; dontList: string[] };
  icp: { summary: string; firmographics: string[]; triggers: string[]; segments: string[] };
  colors: { primary: string; secondary: string; accent: string; neutralDark: string; neutralLight: string };
  fonts: { heading: string; body: string };
  timezone: string;
  config: {
    platforms: string[];
    postsPerDay: Record<string, number>;
    publishingDays: number[];
    preferredTimes: Record<string, string[]>;
    contentFormats: string[];
  };
  personas: { name: string; role: string; description: string; goals: string[]; painPoints: string[]; buyingMotivations?: string[]; channels: string[] }[];
  competitors: { name: string; website: string; handles: Record<string, string>; strengths: string[]; weaknesses: string[] }[];
  claims: { kind: "approved" | "prohibited"; text: string; rationale: string }[];
  products?: { name: string; category: string; description: string; features: string[] }[];
}

const DEMOS: DemoSpec[] = [
  {
    slug: "northwind-analytics",
    name: "Northwind Analytics",
    website: "https://northwind-analytics.example.com",
    industry: "B2B SaaS — Data Analytics for SMEs",
    markets: ["United Kingdom", "Ireland", "Benelux"],
    tagline: "Clear numbers. Confident decisions.",
    description:
      "Northwind Analytics is a self-serve analytics platform that helps small and mid-sized businesses turn messy operational data into plain-language dashboards and weekly decision briefs — without a data team.",
    positioning:
      "The analytics platform for operators, not analysts: opinionated defaults, plain-language insights, and a weekly brief that tells you what changed and what to do.",
    messaging: {
      valueProps: [
        "Connect your tools in minutes, see dashboards the same day",
        "Plain-language weekly brief instead of raw charts",
        "Benchmarks tuned for SMEs, not enterprises",
      ],
      keyMessages: [
        "You don't need a data team to be data-driven",
        "Decisions, not dashboards",
        "Every metric comes with a 'so what'",
      ],
    },
    brandVoice: {
      tone: ["Plain-spoken", "Practical", "Quietly confident"],
      doList: ["Lead with the decision", "Use concrete numbers", "Explain the 'so what'"],
      dontList: ["Hype or buzzwords", "Fearmongering about data", "Jargon without a plain-language gloss"],
    },
    icp: {
      summary: "Operations and growth leads at 10–200 person SMEs who own outcomes but have no analyst.",
      firmographics: ["10–200 employees", "£1M–£30M revenue", "Services, ecommerce, SaaS"],
      triggers: ["New ops/growth hire", "Board asking for metrics", "Outgrew spreadsheets"],
      segments: ["Ops leaders", "Founder-operators", "Growth marketers"],
    },
    colors: { primary: "#1f4e79", secondary: "#2e8b8b", accent: "#f4a300", neutralDark: "#172033", neutralLight: "#f4f7fb" },
    fonts: { heading: "Inter", body: "Inter" },
    timezone: "Europe/London",
    // 3 posts/day × 2 platforms × 5 publishing days = 30 weekly slots (brief's example).
    config: {
      platforms: ["LINKEDIN", "INSTAGRAM"],
      postsPerDay: { LINKEDIN: 3, INSTAGRAM: 3 },
      publishingDays: [1, 2, 3, 4, 5],
      preferredTimes: { LINKEDIN: ["08:30", "12:30", "17:00"], INSTAGRAM: ["09:00", "13:00", "18:00"] },
      contentFormats: ["text", "carousel", "static", "video"],
    },
    personas: [
      {
        name: "Operations Olivia",
        role: "Head of Operations",
        description: "Owns efficiency and reporting at a 60-person services firm; lives in spreadsheets she doesn't trust.",
        goals: ["Trusted weekly numbers", "Spot problems early", "Spend less time in spreadsheets"],
        painPoints: ["No analyst to lean on", "Data scattered across tools", "Reports are stale by the time they're made"],
        channels: ["LinkedIn", "Email newsletters", "Peer communities"],
      },
      {
        name: "Founder Farah",
        role: "Founder / CEO",
        description: "Runs a 25-person ecommerce brand; wants board-ready metrics without hiring.",
        goals: ["Board-ready metrics", "Understand what's driving growth", "Delegate reporting"],
        painPoints: ["Time-poor", "Distrusts vanity metrics", "Can't justify a data hire yet"],
        channels: ["LinkedIn", "Instagram", "Founder Slack groups"],
      },
    ],
    competitors: [
      {
        name: "DashGrid",
        website: "https://dashgrid.example.com",
        handles: { LINKEDIN: "dashgrid", INSTAGRAM: "dashgrid.io" },
        strengths: ["Polished visuals", "Large template library"],
        weaknesses: ["Steep setup", "Enterprise-priced", "No plain-language briefs"],
      },
      {
        name: "MetricMate",
        website: "https://metricmate.example.com",
        handles: { LINKEDIN: "metricmate" },
        strengths: ["Cheap", "Simple"],
        weaknesses: ["Thin integrations", "No benchmarks", "Weak support"],
      },
    ],
    claims: [
      { kind: "approved", text: "See dashboards the same day you connect your tools", rationale: "Supported by onboarding median time-to-first-dashboard." },
      { kind: "prohibited", text: "Guaranteed revenue increase", rationale: "Outcome claims we cannot substantiate." },
    ],
    products: [
      { name: "Northwind Dashboards", category: "product", description: "Same-day dashboards from your connected tools.", features: ["One-click connectors", "SME benchmarks", "No data team needed"] },
      { name: "Weekly Decision Brief", category: "product", description: "A plain-language weekly brief of what changed and what to do.", features: ["Plain-language insights", "'So what' on every metric", "Delivered weekly"] },
    ],
  },
  {
    slug: "verde-botanicals",
    name: "Verde Botanicals",
    website: "https://verdebotanicals.example.com",
    industry: "B2C — Sustainable Skincare",
    markets: ["United States", "Canada"],
    tagline: "Honest botanicals. Visible results.",
    description:
      "Verde Botanicals makes small-batch, refillable skincare from traceable botanical ingredients, with transparent sourcing and dermatologist-reviewed formulations.",
    positioning:
      "The refillable skincare brand for people who want proof, not promises: traceable ingredients, visible results, and packaging that doesn't cost the earth.",
    messaging: {
      valueProps: ["Traceable, named botanical sources", "Refillable, low-waste packaging", "Dermatologist-reviewed formulas"],
      keyMessages: ["Know exactly what's in it and where it's from", "Refill, don't rebuy", "Gentle enough, proven effective"],
    },
    brandVoice: {
      tone: ["Warm", "Honest", "Grounded"],
      doList: ["Name ingredients and sources", "Show real texture and results", "Celebrate refills"],
      dontList: ["Greenwashing", "Fear-based skincare claims", "Before/after exaggeration"],
    },
    icp: {
      summary: "Values-driven skincare buyers, 25–45, who research ingredients and care about sustainability.",
      firmographics: ["Individuals", "Household income $60k+", "Urban/suburban US & Canada"],
      triggers: ["Switching to clean beauty", "Sustainability goals", "Sensitive skin"],
      segments: ["Ingredient-conscious", "Sustainability-first", "Sensitive-skin"],
    },
    colors: { primary: "#2f5d3a", secondary: "#8bae7a", accent: "#e8b04b", neutralDark: "#1d2a21", neutralLight: "#f3f6ee" },
    fonts: { heading: "Fraunces", body: "Inter" },
    timezone: "America/New_York",
    // Different mix: (2 + 1 + 1) × 3 publishing days = 12 weekly slots.
    config: {
      platforms: ["INSTAGRAM", "FACEBOOK", "TIKTOK"],
      postsPerDay: { INSTAGRAM: 2, FACEBOOK: 1, TIKTOK: 1 },
      publishingDays: [1, 3, 5],
      preferredTimes: { INSTAGRAM: ["11:00", "19:00"], FACEBOOK: ["12:00"], TIKTOK: ["18:30"] },
      contentFormats: ["reel", "carousel", "static", "story"],
    },
    personas: [
      {
        name: "Conscious Chloe",
        role: "Ingredient-conscious buyer",
        description: "Reads every label, follows clean-beauty creators, willing to pay for traceability.",
        goals: ["Trust what she applies", "Reduce waste", "Visible results"],
        painPoints: ["Greenwashing fatigue", "Sensitive skin", "Too many vague claims"],
        channels: ["Instagram", "TikTok", "YouTube reviews"],
      },
      {
        name: "Refill Riley",
        role: "Sustainability-first shopper",
        description: "Prioritizes low-waste packaging and brands that make refills easy.",
        goals: ["Lower footprint", "Easy refills", "Support honest brands"],
        painPoints: ["Hard-to-find refills", "Plastic guilt", "Confusing eco-labels"],
        channels: ["Instagram", "TikTok", "Facebook groups"],
      },
    ],
    competitors: [
      {
        name: "PureLeaf Skincare",
        website: "https://pureleaf.example.com",
        handles: { INSTAGRAM: "pureleaf", TIKTOK: "pureleaf" },
        strengths: ["Strong aesthetic", "Influencer reach"],
        weaknesses: ["Opaque sourcing", "No refills", "Premium price"],
      },
      {
        name: "BareBotany",
        website: "https://barebotany.example.com",
        handles: { INSTAGRAM: "barebotany", FACEBOOK: "barebotany" },
        strengths: ["Affordable", "Wide retail presence"],
        weaknesses: ["Synthetic-heavy", "Weak sustainability story"],
      },
    ],
    claims: [
      { kind: "approved", text: "Refillable packaging across the core range", rationale: "True for the launch range." },
      { kind: "prohibited", text: "Cures eczema / medical skin conditions", rationale: "Unsubstantiated medical claim." },
    ],
    products: [
      { name: "Daily Botanical Serum", category: "product", description: "Small-batch serum from traceable botanicals.", features: ["Traceable sourcing", "Dermatologist-reviewed", "Refillable bottle"] },
      { name: "Refill Programme", category: "service", description: "Low-waste refills for the core range.", features: ["Mail-back refills", "Lower footprint", "Subscription option"] },
    ],
  },
];

function j(v: unknown) {
  return JSON.stringify(v);
}

export async function seedCompanies(prisma: PrismaClient) {
  const created: { id: string; slug: string; name: string }[] = [];

  for (const d of DEMOS) {
    // Rebuild each demo company from scratch (cascade clears dependents).
    await prisma.company.deleteMany({ where: { slug: d.slug } });

    const company = await prisma.company.create({
      data: {
        slug: d.slug,
        name: d.name,
        isDemo: true,
        dataLabel: "illustrative_fixture",
        website: d.website,
        industry: d.industry,
        markets: j(d.markets),
        tagline: d.tagline,
        description: d.description,
        positioning: d.positioning,
        messaging: j(d.messaging),
        differentiators: j(d.messaging.valueProps.slice(0, 2)),
        objectives: j(["Build organic brand awareness with the ICP", "Generate qualified inbound interest from content", "Grow engaged following on core platforms"]),
        audiencePriorities: j(d.icp.segments),
        brandVoice: j(d.brandVoice),
        icp: j(d.icp),
        colors: j(d.colors),
        fonts: j(d.fonts),
        timezone: d.timezone,
        config: {
          create: {
            platforms: j(d.config.platforms),
            postsPerDay: j(d.config.postsPerDay),
            publishingDays: j(d.config.publishingDays),
            preferredTimes: j(d.config.preferredTimes),
            timezone: d.timezone,
            contentFormats: j(d.config.contentFormats),
            approvalRequired: true,
            autonomy: j({ research: "A0", drafting: "A1", publishing: "A2" }),
            autopublish: false,
            weeklyReportDay: 1,
            weeklyReportTime: "08:00",
            reportRecipients: j([]),
          },
        },
        personas: {
          create: d.personas.map((p) => ({
            name: p.name,
            role: p.role,
            description: p.description,
            goals: j(p.goals),
            painPoints: j(p.painPoints),
            buyingMotivations: j(p.buyingMotivations ?? p.goals.slice(0, 2)),
            channels: j(p.channels),
          })),
        },
        icpProfiles: {
          create: [{ name: `${d.name} primary ICP`, summary: d.icp.summary, firmographics: j(d.icp.firmographics), triggers: j(d.icp.triggers), segments: j(d.icp.segments), priority: 1 }],
        },
        products: {
          create: (d.products ?? []).map((p) => ({ name: p.name, category: p.category, description: p.description, features: j(p.features) })),
        },
        competitors: {
          create: d.competitors.map((c) => ({
            name: c.name,
            website: c.website,
            handles: j(c.handles),
            strengths: j(c.strengths),
            weaknesses: j(c.weaknesses),
          })),
        },
        claims: { create: d.claims.map((c) => ({ kind: c.kind, text: c.text, rationale: c.rationale })) },
        // Honest connection state: created but NOT connected (no credentials).
        connections: {
          create: d.config.platforms.map((p) => ({
            platform: p,
            handle: d.slug,
            displayName: d.name,
            status: "not_connected",
            capabilities: j({ publish: false, schedule: false, analytics: false, inbox: false }),
          })),
        },
      },
    });

    created.push({ id: company.id, slug: company.slug, name: company.name });
  }

  return created;
}
