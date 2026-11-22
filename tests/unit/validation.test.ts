import { describe, it, expect } from "vitest";
import { validateContent } from "@/lib/validation";
import type { CompanyBrandContext } from "@/lib/agents/types";

const ctx = {
  id: "c1", name: "Northwind", industry: "SaaS", positioning: "analytics for operators", tagline: null,
  icp: {}, icps: [], personas: [], products: [{ name: "Dashboards", category: "product", description: "same-day analytics", features: ["connectors"] }],
  messaging: { valueProps: ["same-day dashboards"], keyMessages: [] }, differentiators: ["plain-language briefs"],
  objectives: [], brandVoice: {}, prohibitedClaims: ["Guaranteed revenue increase", "Cures all problems"], markets: [],
  colors: {}, missing: [],
} as unknown as CompanyBrandContext;

describe("accuracy validation gate", () => {
  it("rejects content that makes a prohibited claim", () => {
    const r = validateContent(ctx, { platform: "LINKEDIN", caption: "We offer a guaranteed revenue increase for all.", topic: "" });
    expect(r.status).toBe("rejected");
    expect(r.issues.some((i) => i.rule === "prohibited_claim")).toBe(true);
  });

  it("flags an unsupported statistic (not grounded in brand facts)", () => {
    const r = validateContent(ctx, { platform: "LINKEDIN", caption: "Boost output by 87% today.", topic: "" });
    expect(r.issues.some((i) => i.rule === "unsupported_statistic")).toBe(true);
  });

  it("passes clean, grounded copy", () => {
    const r = validateContent(ctx, { platform: "LINKEDIN", caption: "Northwind Dashboards gives operators same-day analytics.", hashtags: ["#a"], topic: "" });
    expect(r.status).toBe("passed");
  });

  it("rejects an over-length caption (platform spec)", () => {
    const r = validateContent(ctx, { platform: "INSTAGRAM", caption: "x".repeat(2300), topic: "" });
    expect(r.status).toBe("rejected");
    expect(r.issues.some((i) => i.rule === "platform_spec")).toBe(true);
  });

  it("flags too many hashtags for the platform", () => {
    const r = validateContent(ctx, { platform: "LINKEDIN", caption: "Grounded copy about Dashboards.", hashtags: Array.from({ length: 12 }, (_, i) => `#t${i}`), topic: "" });
    expect(r.issues.some((i) => i.rule === "hashtags")).toBe(true);
  });
});
