// Shared types for the deterministic agent engine.
//
// IMPORTANT (honesty): these agents run DETERMINISTIC generation during the
// Claude Code development/test session. Outputs are persisted and labelled
// `generated_by = deterministic_generation` (produced by this application's
// deterministic code, NOT authored by a live model). They do NOT call an LLM at runtime,
// and they never fabricate external research citations, platform metrics, post
// IDs, or email deliveries. Anything that genuinely needs a live runtime is
// recorded in a truthful `requires_runtime` / `pending_runtime` state instead.

export interface AgentResult {
  agentSystem: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  created: number;
  updated?: number;
  notes?: string;
}

export interface IcpSummary {
  name?: string;
  summary?: string;
  segments?: string[];
  triggers?: string[];
  firmographics?: string[];
  priority?: number;
}

export interface PersonaSummary {
  name: string;
  role?: string;
  goals: string[];
  painPoints: string[];
  buyingMotivations: string[];
}

export interface ProductSummary {
  name: string;
  category?: string;
  description?: string;
  features: string[];
}

export interface CompanyBrandContext {
  id: string;
  name: string;
  industry: string | null;
  positioning: string | null;
  tagline: string | null;
  /** Primary ICP (first by priority), kept for back-compat. */
  icp: IcpSummary;
  /** All ICP profiles (multi-ICP), highest priority first. */
  icps: IcpSummary[];
  personas: PersonaSummary[];
  products: ProductSummary[];
  messaging: { valueProps?: string[]; keyMessages?: string[] };
  differentiators: string[];
  objectives: string[];
  brandVoice: { tone?: string[]; doList?: string[]; dontList?: string[]; writingGuidelines?: string };
  prohibitedClaims: string[];
  markets: string[];
  colors: { primary?: string; secondary?: string; accent?: string; neutralDark?: string; neutralLight?: string };
  /** Essential knowledge that is missing — agents flag, never fabricate it. */
  missing: string[];
}
