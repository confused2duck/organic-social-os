"use server";

import { revalidatePath } from "next/cache";
import { requireCompany } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { verifyConnection, testTokenConfigured } from "@/lib/integrations/instagram";
import {
  upsertVerifiedInstagram,
  recordInstagramFailure,
  disconnectInstagram,
  getInstagramToken,
} from "@/lib/integrations/instagram-store";

type Result = { ok: true; username: string } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Connect the developer TEST Instagram account supplied via server env
// (INSTAGRAM_TEST_ACCESS_TOKEN / INSTAGRAM_TEST_ACCOUNT_ID). This performs a
// READ-ONLY verification and attaches the verified account to the active
// company. It never publishes and never fabricates account data.
// ---------------------------------------------------------------------------
export async function connectTestInstagramAction(): Promise<Result> {
  const company = await requireCompany();

  const token = process.env.INSTAGRAM_TEST_ACCESS_TOKEN?.trim();
  if (!token) {
    return { ok: false, error: "No test token configured. Set INSTAGRAM_TEST_ACCESS_TOKEN in the environment." };
  }
  const expectedId = process.env.INSTAGRAM_TEST_ACCOUNT_ID?.trim() || undefined;

  const verify = await verifyConnection(token, { expectedId, withMedia: true, withInsights: true });
  if (!verify.ok || !verify.account) {
    const msg = verify.error || "Token verification failed.";
    await recordInstagramFailure(company.id, msg);
    revalidatePath("/connections");
    return { ok: false, error: msg };
  }
  if (expectedId && verify.idMatches === false) {
    const msg = `The token's account (${verify.account.userId || verify.account.id}) does not match INSTAGRAM_TEST_ACCOUNT_ID (${expectedId}).`;
    await recordInstagramFailure(company.id, msg);
    revalidatePath("/connections");
    return { ok: false, error: msg };
  }

  await upsertVerifiedInstagram({ companyId: company.id, verify, dataSource: "env_test_token" });
  revalidatePath("/connections");
  revalidatePath("/", "layout");
  return { ok: true, username: verify.account.username };
}

// ---------------------------------------------------------------------------
// Re-verify the current connection and refresh the stored snapshot (read-only).
// ---------------------------------------------------------------------------
export async function refreshInstagramAction(): Promise<Result> {
  const company = await requireCompany();
  const conn = await prisma.platformConnection.findUnique({
    where: { companyId_platform: { companyId: company.id, platform: "INSTAGRAM" } },
  });
  if (!conn || conn.status !== "connected") return { ok: false, error: "No connected Instagram account to refresh." };

  const token = getInstagramToken(conn);
  if (!token) return { ok: false, error: "The stored credential is unavailable. Reconnect the account." };

  const scopes = conn.scopes ? (JSON.parse(conn.scopes) as string[]) : undefined;
  const verify = await verifyConnection(token, { grantedScopes: scopes, withMedia: true, withInsights: true });
  if (!verify.ok || !verify.account) {
    const msg = verify.error || "Re-verification failed.";
    await recordInstagramFailure(company.id, msg);
    revalidatePath("/connections");
    return { ok: false, error: msg };
  }
  await upsertVerifiedInstagram({
    companyId: company.id,
    verify,
    dataSource: conn.dataSource === "oauth" ? "oauth" : "env_test_token",
    scopes,
  });
  revalidatePath("/connections");
  return { ok: true, username: verify.account.username };
}

export async function disconnectInstagramAction(): Promise<{ ok: true }> {
  const company = await requireCompany();
  await disconnectInstagram(company.id);
  revalidatePath("/connections");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Lightweight status used by the UI to decide which controls to show. */
export async function instagramEnvStatus(): Promise<{ testToken: boolean }> {
  return { testToken: testTokenConfigured() };
}
