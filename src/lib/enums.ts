// Fixed value sets for the String-typed status/type fields in the Prisma schema
// (SQLite has no native enums). These are the single source of truth for the
// app + zod validation + UI state rendering.

export const PLATFORMS = ["LINKEDIN", "INSTAGRAM", "FACEBOOK", "YOUTUBE", "TIKTOK"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  LINKEDIN: "LinkedIn",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
};

export const CONTENT_FORMATS = [
  "static",
  "carousel",
  "reel",
  "story",
  "video",
  "text",
  "document",
  "poll",
  "short",
] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number];

// Post lifecycle — drives calendar, approvals and the publishing queue.
export const POST_STATUSES = [
  "draft",
  "processing",
  "awaiting_approval",
  "approved",
  "scheduled",
  "publishing",
  "published",
  "blocked",
  "failed",
  "unavailable",
  "rejected",
] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const POST_STATUS_META: Record<
  PostStatus,
  { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" | "muted" }
> = {
  draft: { label: "Draft", tone: "neutral" },
  processing: { label: "Processing", tone: "info" },
  awaiting_approval: { label: "Awaiting approval", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  scheduled: { label: "Scheduled", tone: "info" },
  publishing: { label: "Publishing", tone: "info" },
  published: { label: "Published", tone: "success" },
  blocked: { label: "Blocked", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
  unavailable: { label: "Unavailable", tone: "muted" },
  rejected: { label: "Rejected", tone: "danger" },
};

export const CONNECTION_STATUSES = ["not_connected", "connected", "blocked", "unavailable"] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export const CREATIVE_TYPES = [
  "static_graphic",
  "carousel",
  "video",
  "image",
  "story",
  "reel",
  "document",
  "text",
] as const;
export type CreativeType = (typeof CREATIVE_TYPES)[number];

export const CAPABILITY_STATES = ["draft", "rendered", "awaiting_render_runtime", "blocked"] as const;
export type CapabilityState = (typeof CAPABILITY_STATES)[number];

export const TASK_STATUSES = [
  "pending",
  "processing",
  "completed",
  "blocked",
  "failed",
  "awaiting_approval",
  "requires_runtime",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// Honest provenance of any number or record shown to the client.
export const DATA_SOURCES = ["test_fixture", "imported", "connected"] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export const GENERATED_BY = ["deterministic_generation", "imported", "pending_runtime"] as const;
export type GeneratedBy = (typeof GENERATED_BY)[number];

export const ACTIVITY_SCOPES = ["organic", "paid", "leadgen"] as const;
export type ActivityScope = (typeof ACTIVITY_SCOPES)[number];

export const IMPLEMENTATION_STATUSES = ["planned", "partial", "implemented", "deferred"] as const;
export type ImplementationStatus = (typeof IMPLEMENTATION_STATUSES)[number];

export const EMAIL_DELIVERY_STATUSES = ["not_configured", "pending", "sent", "failed"] as const;
export type EmailDeliveryStatus = (typeof EMAIL_DELIVERY_STATUSES)[number];

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
