// Deterministic document → knowledge extraction. This does NOT use an LLM and
// does NOT invent anything: it structures the text the user actually provided
// into traceable knowledge statements, each citing its source document.

export interface ExtractedKnowledge {
  category: "fact" | "guideline" | "claim" | "product" | "other";
  text: string;
}

const RESTRICTION_RE = /\b(don't|do not|never|avoid|prohibit|must not|cannot|no\s)\b/i;
const CLAIM_RE = /\b(guarantee|guaranteed|proven|certified|#1|best|award|clinically|patented|trusted by)\b/i;
const PRODUCT_RE = /\b(we offer|we provide|our product|our service|includes|features|plan|pricing|subscription)\b/i;
const GUIDELINE_RE = /\b(tone|voice|style|always|should|use|write|capitalise|capitalize|brand)\b/i;

function categorize(s: string): ExtractedKnowledge["category"] {
  if (RESTRICTION_RE.test(s)) return "guideline";
  if (CLAIM_RE.test(s)) return "claim";
  if (PRODUCT_RE.test(s)) return "product";
  if (GUIDELINE_RE.test(s)) return "guideline";
  return "fact";
}

/**
 * Split provided text into clean, de-duplicated knowledge statements.
 * Keeps substantive lines/sentences (15–320 chars), drops headings and noise.
 */
export function extractKnowledge(text: string, max = 40): ExtractedKnowledge[] {
  if (!text) return [];
  // Split on newlines first (bullets/paragraphs), then sentences within.
  const rawLines = text
    .split(/\r?\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z0-9])/))
    .map((s) => s.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: ExtractedKnowledge[] = [];
  for (const line of rawLines) {
    const clean = line.replace(/\s+/g, " ").trim();
    if (clean.length < 15 || clean.length > 320) continue; // skip noise
    // Skip heading/label lines: few words and no sentence-ending punctuation.
    const words = clean.split(/\s+/);
    if (words.length <= 3 && !/[.!?:]$/.test(clean)) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ category: categorize(clean), text: clean });
    if (out.length >= max) break;
  }
  return out;
}
