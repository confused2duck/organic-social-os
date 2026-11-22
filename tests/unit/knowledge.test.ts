import { describe, it, expect } from "vitest";
import { extractKnowledge } from "@/lib/knowledge";

describe("document → knowledge extraction (deterministic, no fabrication)", () => {
  const doc = `Brand Guidelines

We provide same-day analytics dashboards for SMEs.
Our tone is plain-spoken and practical.
Never guarantee revenue increases.
We offer a Weekly Decision Brief with plain-language insights.
Short.`; // "Short." is below the 15-char threshold

  it("extracts substantive statements only", () => {
    const k = extractKnowledge(doc);
    expect(k.length).toBeGreaterThanOrEqual(3);
    // The too-short heading/line is dropped.
    expect(k.some((x) => x.text === "Short.")).toBe(false);
    expect(k.some((x) => x.text === "Brand Guidelines")).toBe(false);
  });

  it("never invents text — every item is a substring of the source", () => {
    const k = extractKnowledge(doc);
    for (const item of k) {
      expect(doc.includes(item.text)).toBe(true);
    }
  });

  it("categorises restrictions, products and guidelines", () => {
    const k = extractKnowledge(doc);
    expect(k.find((x) => x.text.includes("Never guarantee"))?.category).toBe("guideline");
    expect(k.find((x) => x.text.includes("We provide same-day"))?.category).toBe("product");
    expect(k.find((x) => x.text.includes("tone"))?.category).toBe("guideline");
  });

  it("de-duplicates and handles empty input", () => {
    expect(extractKnowledge("")).toEqual([]);
    const dup = extractKnowledge("We provide X services.\nWe provide X services.");
    expect(dup.length).toBe(1);
  });
});
