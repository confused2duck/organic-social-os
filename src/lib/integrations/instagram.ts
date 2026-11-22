// ===========================================================================
// Instagram integration — "Instagram API with Instagram Login" (Unified Login).
//
// This module is READ-ONLY with respect to the Instagram account. It verifies a
// token, reads the authorised account's identity, media and insights, and never
// publishes. Publishing remains blocked until explicitly authorised.
//
// It is credential-source agnostic: callers pass the access token + account id.
//  - A developer TEST account uses a long-lived token supplied via server env
//    (INSTAGRAM_TEST_ACCESS_TOKEN / INSTAGRAM_TEST_ACCOUNT_ID).
//  - A CUSTOMER account obtains its own token through the OAuth consent flow
//    (src/app/api/oauth/instagram/*), stored encrypted per company.
// No account data is ever fabricated. Every failure is surfaced truthfully.
// ===========================================================================

const GRAPH = "https://graph.instagram.com";
const OAUTH_AUTHORIZE = "https://www.instagram.com/oauth/authorize";
const OAUTH_TOKEN = "https://api.instagram.com/oauth/access_token";

const TIMEOUT_MS = Number(process.env.INTEGRATION_TIMEOUT_MS ?? 12_000);

// Scopes for the Instagram API with Instagram Login. Read + (reserved) publish
// scope requested so the same connection can later be upgraded to publishing
// *after* explicit authorisation — publishing itself stays disabled in-app.
export const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
  "instagram_business_manage_comments",
  "instagram_business_content_publish",
] as const;

export function graphVersion(): string {
  return process.env.META_GRAPH_VERSION?.trim() || "v21.0";
}

export interface InstagramOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  configured: boolean;
}

/** Resolve the OAuth redirect URI from the configured base URL. Single source of truth. */
export function instagramRedirectUri(baseUrl?: string): string {
  const base = (baseUrl || process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/api/oauth/instagram/callback`;
}

export function instagramOAuthConfig(baseUrl?: string): InstagramOAuthConfig {
  const appId = process.env.INSTAGRAM_APP_ID?.trim() ?? "";
  const appSecret = process.env.INSTAGRAM_APP_SECRET?.trim() ?? "";
  return {
    appId,
    appSecret,
    redirectUri: instagramRedirectUri(baseUrl),
    configured: Boolean(appId && appSecret),
  };
}

/** Whether a server-provided developer TEST token is available. */
export function testTokenConfigured(): boolean {
  return Boolean(process.env.INSTAGRAM_TEST_ACCESS_TOKEN?.trim());
}

export function buildAuthorizeUrl(state: string, baseUrl?: string): string {
  const cfg = instagramOAuthConfig(baseUrl);
  const u = new URL(OAUTH_AUTHORIZE);
  u.searchParams.set("client_id", cfg.appId);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", INSTAGRAM_SCOPES.join(","));
  u.searchParams.set("state", state);
  return u.toString();
}

// --- Low-level Graph helper -------------------------------------------------

export class InstagramApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: number, readonly type?: string) {
    super(message);
    this.name = "InstagramApiError";
  }
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const u = new URL(`${GRAPH}/${path.replace(/^\/+/, "")}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(u, { signal: ctrl.signal, cache: "no-store" });
  } catch (e) {
    throw new InstagramApiError(
      e instanceof Error && e.name === "AbortError"
        ? `Instagram API timed out after ${TIMEOUT_MS}ms`
        : `Network error reaching Instagram API: ${e instanceof Error ? e.message : String(e)}`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new InstagramApiError(`Non-JSON response (HTTP ${res.status})`, res.status);
  }
  if (!res.ok) {
    const err = (body as { error?: { message?: string; code?: number; type?: string } }).error;
    throw new InstagramApiError(err?.message ?? `Instagram API error (HTTP ${res.status})`, res.status, err?.code, err?.type);
  }
  return body as T;
}

// --- Token exchange (OAuth flow) --------------------------------------------

export interface ShortLivedToken {
  access_token: string;
  user_id: string;
  permissions?: string[];
}

/** Exchange an authorisation code for a short-lived token + granted permissions. */
export async function exchangeCodeForToken(code: string, baseUrl?: string): Promise<ShortLivedToken> {
  const cfg = instagramOAuthConfig(baseUrl);
  const form = new URLSearchParams({
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    grant_type: "authorization_code",
    redirect_uri: cfg.redirectUri,
    code,
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(OAUTH_TOKEN, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
      signal: ctrl.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    user_id?: string | number;
    permissions?: string[];
    error_message?: string;
    error_type?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new InstagramApiError(body.error_message ?? `Token exchange failed (HTTP ${res.status})`, res.status, undefined, body.error_type);
  }
  return {
    access_token: body.access_token,
    user_id: String(body.user_id ?? ""),
    permissions: Array.isArray(body.permissions) ? body.permissions : undefined,
  };
}

export interface LongLivedToken {
  access_token: string;
  expires_in: number; // seconds
}

/** Exchange a short-lived token for a long-lived (~60 day) token. */
export async function exchangeForLongLivedToken(shortToken: string): Promise<LongLivedToken> {
  const cfg = instagramOAuthConfig();
  const body = await graphGet<{ access_token: string; expires_in: number }>("access_token", {
    grant_type: "ig_exchange_token",
    client_secret: cfg.appSecret,
    access_token: shortToken,
  });
  return { access_token: body.access_token, expires_in: body.expires_in };
}

// --- Read-only account data -------------------------------------------------

export interface InstagramAccount {
  id: string; // app-scoped id
  userId: string; // instagram-scoped user_id (stable account id)
  username: string;
  name?: string;
  accountType?: string;
  mediaCount?: number;
  followersCount?: number;
  followsCount?: number;
  profilePictureUrl?: string;
  biography?: string;
  website?: string;
}

const ACCOUNT_FIELDS = [
  "id",
  "user_id",
  "username",
  "name",
  "account_type",
  "media_count",
  "followers_count",
  "follows_count",
  "profile_picture_url",
  "biography",
  "website",
].join(",");

export async function fetchAccount(token: string, igUserId?: string): Promise<InstagramAccount> {
  const node = igUserId && igUserId.length > 0 ? igUserId : "me";
  const raw = await graphGet<Record<string, unknown>>(`${graphVersion()}/${node}`, {
    fields: ACCOUNT_FIELDS,
    access_token: token,
  });
  return {
    id: String(raw.id ?? ""),
    userId: String(raw.user_id ?? raw.id ?? ""),
    username: String(raw.username ?? ""),
    name: raw.name ? String(raw.name) : undefined,
    accountType: raw.account_type ? String(raw.account_type) : undefined,
    mediaCount: typeof raw.media_count === "number" ? raw.media_count : undefined,
    followersCount: typeof raw.followers_count === "number" ? raw.followers_count : undefined,
    followsCount: typeof raw.follows_count === "number" ? raw.follows_count : undefined,
    profilePictureUrl: raw.profile_picture_url ? String(raw.profile_picture_url) : undefined,
    biography: raw.biography ? String(raw.biography) : undefined,
    website: raw.website ? String(raw.website) : undefined,
  };
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  mediaType?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  timestamp?: string;
  likeCount?: number;
  commentsCount?: number;
}

const MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_url",
  "thumbnail_url",
  "permalink",
  "timestamp",
  "like_count",
  "comments_count",
].join(",");

export async function fetchMedia(token: string, igUserId: string, limit = 9): Promise<InstagramMedia[]> {
  const raw = await graphGet<{ data?: Record<string, unknown>[] }>(`${graphVersion()}/${igUserId}/media`, {
    fields: MEDIA_FIELDS,
    limit: String(limit),
    access_token: token,
  });
  return (raw.data ?? []).map((m) => ({
    id: String(m.id ?? ""),
    caption: m.caption ? String(m.caption) : undefined,
    mediaType: m.media_type ? String(m.media_type) : undefined,
    mediaUrl: m.media_url ? String(m.media_url) : undefined,
    thumbnailUrl: m.thumbnail_url ? String(m.thumbnail_url) : undefined,
    permalink: m.permalink ? String(m.permalink) : undefined,
    timestamp: m.timestamp ? String(m.timestamp) : undefined,
    likeCount: typeof m.like_count === "number" ? m.like_count : undefined,
    commentsCount: typeof m.comments_count === "number" ? m.comments_count : undefined,
  }));
}

export interface InstagramInsights {
  available: boolean;
  reason?: string; // when unavailable — honest explanation, never faked numbers
  metrics: { name: string; value: number; period?: string }[];
}

/**
 * Account-level insights (best-effort). Insights require a Business/Creator
 * account and the manage_insights permission; when unavailable we report that
 * truthfully instead of inventing numbers.
 */
export async function fetchAccountInsights(token: string, igUserId: string): Promise<InstagramInsights> {
  try {
    const raw = await graphGet<{
      data?: { name: string; period?: string; total_value?: { value?: number }; values?: { value?: number }[] }[];
    }>(`${graphVersion()}/${igUserId}/insights`, {
      metric: "reach",
      period: "day",
      metric_type: "total_value",
      access_token: token,
    });
    const metrics = (raw.data ?? []).map((d) => ({
      name: d.name,
      period: d.period,
      value:
        typeof d.total_value?.value === "number"
          ? d.total_value.value
          : typeof d.values?.[0]?.value === "number"
            ? d.values![0]!.value!
            : 0,
    }));
    return { available: metrics.length > 0, metrics, reason: metrics.length ? undefined : "No insight values returned for the period." };
  } catch (e) {
    return {
      available: false,
      metrics: [],
      reason: e instanceof InstagramApiError ? e.message : "Insights unavailable.",
    };
  }
}

// --- Verification orchestration --------------------------------------------

export interface VerifyResult {
  ok: boolean;
  error?: string;
  account?: InstagramAccount;
  idMatches?: boolean; // whether the token's account matches the expected id
  capabilities: { publish: boolean; schedule: boolean; analytics: boolean; inbox: boolean };
  insights?: InstagramInsights;
  recentMedia?: InstagramMedia[];
}

/**
 * Read-only verification used both by the OAuth callback and the test-account
 * connect action. Validates the token, resolves the account, optionally checks
 * it matches an expected id, and probes capabilities WITHOUT publishing.
 */
export async function verifyConnection(
  token: string,
  opts: { expectedId?: string; grantedScopes?: string[]; withMedia?: boolean; withInsights?: boolean } = {},
): Promise<VerifyResult> {
  let account: InstagramAccount;
  try {
    account = await fetchAccount(token);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Token validation failed.",
      capabilities: { publish: false, schedule: false, analytics: false, inbox: false },
    };
  }

  const stableId = account.userId || account.id;
  const idMatches = opts.expectedId ? stableId === String(opts.expectedId) : undefined;

  let recentMedia: InstagramMedia[] | undefined;
  if (opts.withMedia !== false) {
    try {
      recentMedia = await fetchMedia(token, stableId, 9);
    } catch {
      recentMedia = undefined;
    }
  }

  let insights: InstagramInsights | undefined;
  if (opts.withInsights !== false) {
    insights = await fetchAccountInsights(token, stableId);
  }

  // Capabilities are derived from actually-granted scopes when known, otherwise
  // conservatively inferred from successful read calls. Publishing is reported
  // as a *granted scope* only; the app still blocks publishing regardless.
  const scopes = opts.grantedScopes ?? [];
  const has = (s: string) => scopes.includes(s);
  const capabilities = {
    publish: scopes.length ? has("instagram_business_content_publish") : false,
    schedule: false, // the app schedules internally; no provider scope implies it
    analytics: scopes.length ? has("instagram_business_manage_insights") : Boolean(insights?.available),
    inbox: scopes.length ? has("instagram_business_manage_comments") : false,
  };

  return {
    ok: true,
    account,
    idMatches,
    capabilities,
    insights,
    recentMedia,
  };
}
