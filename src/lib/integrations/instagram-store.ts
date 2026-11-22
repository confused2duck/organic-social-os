import type { PlatformConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/integrations/crypto";
import type { InstagramAccount, InstagramInsights, VerifyResult } from "@/lib/integrations/instagram";

// ===========================================================================
// Persistence for a VERIFIED Instagram connection, scoped to a company.
//
// Honesty guarantees:
//  - status is set to "connected" ONLY after a real read-only verification.
//  - the access token is stored encrypted (oauth) or kept only in server env
//    (test). It is never persisted in plaintext and never returned to a client.
//  - the stored `meta` snapshot contains only genuine values from the provider.
// ===========================================================================

export type InstagramDataSource = "env_test_token" | "oauth";

export interface StoredInstagramProfile {
  username: string;
  name?: string;
  accountType?: string;
  followersCount?: number;
  followsCount?: number;
  mediaCount?: number;
  profilePictureUrl?: string;
  biography?: string;
  website?: string;
}

function toProfile(a: InstagramAccount): StoredInstagramProfile {
  return {
    username: a.username,
    name: a.name,
    accountType: a.accountType,
    followersCount: a.followersCount,
    followsCount: a.followsCount,
    mediaCount: a.mediaCount,
    profilePictureUrl: a.profilePictureUrl,
    biography: a.biography,
    website: a.website,
  };
}

export interface UpsertInstagramParams {
  companyId: string;
  verify: VerifyResult; // must be ok with an account
  dataSource: InstagramDataSource;
  scopes?: string[];
  longLivedToken?: string; // oauth only — encrypted before storage
  tokenExpiresInSec?: number;
}

/** Create/update the company's verified Instagram connection. Returns the row. */
export async function upsertVerifiedInstagram(p: UpsertInstagramParams): Promise<PlatformConnection> {
  const { account, capabilities, insights } = p.verify;
  if (!account) throw new Error("upsertVerifiedInstagram requires a verified account");

  const stableId = account.userId || account.id;
  const meta = {
    profile: toProfile(account),
    insights: insights ?? null,
    provenance: p.dataSource,
    verifiedAt: new Date().toISOString(),
  };

  const tokenCipher = p.longLivedToken ? encryptSecret(p.longLivedToken) : undefined;
  const tokenExpiresAt =
    p.tokenExpiresInSec && p.tokenExpiresInSec > 0
      ? new Date(Date.now() + p.tokenExpiresInSec * 1000)
      : undefined;

  const common = {
    handle: account.username,
    displayName: account.name || account.username,
    status: "connected" as const,
    externalId: stableId,
    accountType: account.accountType ?? null,
    scopes: p.scopes ? JSON.stringify(p.scopes) : null,
    dataSource: p.dataSource,
    capabilities: JSON.stringify(capabilities),
    meta: JSON.stringify(meta),
    connectedAt: new Date(),
    lastVerifiedAt: new Date(),
    lastError: null as string | null,
    // Only overwrite the stored cipher when we actually have a new token.
    ...(tokenCipher ? { tokenCipher } : {}),
    ...(tokenExpiresAt ? { tokenExpiresAt } : {}),
  };

  return prisma.platformConnection.upsert({
    where: { companyId_platform: { companyId: p.companyId, platform: "INSTAGRAM" } },
    update: common,
    create: { companyId: p.companyId, platform: "INSTAGRAM", ...common },
  });
}

/** Record a verification/connection failure truthfully (does not fake a connection). */
export async function recordInstagramFailure(companyId: string, message: string): Promise<void> {
  await prisma.platformConnection.upsert({
    where: { companyId_platform: { companyId, platform: "INSTAGRAM" } },
    update: { status: "blocked", lastError: message.slice(0, 500), lastVerifiedAt: new Date() },
    create: {
      companyId,
      platform: "INSTAGRAM",
      status: "blocked",
      dataSource: "none",
      lastError: message.slice(0, 500),
      lastVerifiedAt: new Date(),
    },
  });
}

/** Reset the connection to not_connected and clear the stored token. */
export async function disconnectInstagram(companyId: string): Promise<void> {
  await prisma.platformConnection
    .update({
      where: { companyId_platform: { companyId, platform: "INSTAGRAM" } },
      data: {
        status: "not_connected",
        dataSource: "none",
        tokenCipher: null,
        tokenExpiresAt: null,
        scopes: null,
        externalId: null,
        accountType: null,
        connectedAt: null,
        lastError: null,
        meta: null,
      },
    })
    .catch(() => {});
}

/**
 * Resolve the usable access token for a connected Instagram row, server-side
 * only. Returns null when unavailable. NEVER call this from client code.
 */
export function getInstagramToken(conn: Pick<PlatformConnection, "dataSource" | "tokenCipher">): string | null {
  if (conn.dataSource === "env_test_token") {
    return process.env.INSTAGRAM_TEST_ACCESS_TOKEN?.trim() || null;
  }
  if (conn.dataSource === "oauth" && conn.tokenCipher) {
    try {
      return decryptSecret(conn.tokenCipher);
    } catch {
      return null;
    }
  }
  return null;
}

export function parseStoredProfile(conn: Pick<PlatformConnection, "meta">): {
  profile?: StoredInstagramProfile;
  insights?: InstagramInsights | null;
  verifiedAt?: string;
  provenance?: string;
} {
  if (!conn.meta) return {};
  try {
    return JSON.parse(conn.meta);
  } catch {
    return {};
  }
}
