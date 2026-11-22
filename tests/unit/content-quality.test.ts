import { describe, it, expect } from "vitest";
import { angleFor, hashtagsFor } from "@/lib/agents/calendar";

// Regression tests for audit defects: sparse brand data must not produce
// empty quotes or weak single-letter hashtags.

describe("content generation with sparse brand data (audit regression)", () => {
  it('Proof pillar never emits empty quotes when value prop is missing', () => {
    expect(angleFor("Proof", { industry: "B2C — Boutique Fitness" }, "")).toBe("the results we deliver");
    expect(angleFor("Proof", { industry: "B2C — Boutique Fitness" }, "")).not.toContain('""');
  });

  it("Proof pillar uses the value prop when present", () => {
    expect(angleFor("Proof", { industry: "SaaS" }, "we save you 10 hours")).toContain("we save you 10 hours");
  });

  it('hashtags derive a meaningful word, never "#b" from "B2C"', () => {
    const tags = hashtagsFor({ industry: "B2C — Boutique Fitness" }, "INSTAGRAM");
    expect(tags).toContain("#fitness");
    expect(tags.some((t) => t.length <= 2)).toBe(false); // no "#b"
  });

  it("falls back to #social when industry has no usable word", () => {
    expect(hashtagsFor({ industry: "B2C" }, "TIKTOK")).toContain("#social");
    expect(hashtagsFor({ industry: null }, "INSTAGRAM")).toContain("#social");
  });
});
