// The 7 agent systems that make up the Autonomous Organic Social Media OS.
// Specialist agents (from the Martech Meerkat register) roll up into these.
// The client UI only ever sees these product-level systems — never internal
// model names, prompts, or orchestration details.

export type AgentSystemId = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export interface AgentSystem {
  id: AgentSystemId;
  key: string;
  name: string;
  tagline: string;
  /** Continuous-workflow stage order. */
  order: number;
}

export const AGENT_SYSTEMS: Record<AgentSystemId, AgentSystem> = {
  A: { id: "A", key: "brand_intelligence", name: "Brand Intelligence", tagline: "Understands and maintains company, brand, ICP and claims", order: 1 },
  B: { id: "B", key: "research_trends", name: "Research & Trends", tagline: "Company-specific research, competitor and trend signals with sources", order: 2 },
  C: { id: "C", key: "performance_intelligence", name: "Performance Intelligence", tagline: "Deterministic analysis of connected or imported platform data", order: 3 },
  D: { id: "D", key: "strategy_calendar", name: "Strategy & Calendar", tagline: "Platform-specific strategy and editorial calendars", order: 4 },
  E: { id: "E", key: "creative_production", name: "Creative Production", tagline: "Branded graphics, carousels, images and video", order: 5 },
  F: { id: "F", key: "publishing_community", name: "Publishing & Community", tagline: "Scheduling, approval-gated publishing, verification and community ops", order: 6 },
  G: { id: "G", key: "reporting_optimisation", name: "Reporting & Optimisation", tagline: "Weekly reports, findings and next-cycle planning", order: 7 },
};

export const AGENT_SYSTEM_LIST: AgentSystem[] = Object.values(AGENT_SYSTEMS).sort(
  (a, b) => a.order - b.order,
);

// The continuous operating workflow (Section 3 of the brief).
export const WORKFLOW_STAGES = [
  "Company Understanding",
  "Research",
  "Performance Analysis",
  "Strategy",
  "Content Calendar",
  "Content Creation",
  "Graphic & Video Production",
  "Validation",
  "Scheduling",
  "Publishing",
  "Verification",
  "Reporting",
  "Optimisation",
] as const;

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];
