import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyState } from "@/lib/integrations/crypto";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  verifyConnection,
  instagramOAuthConfig,
} from "@/lib/integrations/instagram";
import { upsertVerifiedInstagram, recordInstagramFailure } from "@/lib/integrations/instagram-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "ig_oauth_state";

// GET /api/oauth/instagram/callback?code=...&state=...
// Completes the Instagram authorisation. Validates state (CSRF), exchanges the
// code for a long-lived token, performs a READ-ONLY verification, and stores an
// encrypted, company-scoped connection. No publishing occurs.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const base = (process.env.APP_BASE_URL?.trim() || url.origin).replace(/\/+$/, "");
  const done = (qs: string) => {
    const res = NextResponse.redirect(`${base}/connections?${qs}`);
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/oauth/instagram" });
    return res;
  };

  const err = url.searchParams.get("error") || url.searchParams.get("error_type");
  const errMsg = url.searchParams.get("error_description") || url.searchParams.get("error_message");
  if (err) return done(`ig_error=${encodeURIComponent(errMsg || err)}`);

  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const stateCookie = req.cookies.get(STATE_COOKIE)?.value;

  // CSRF: the returned state must match the cookie AND carry a valid signature.
  if (!code || !stateParam || !stateCookie || stateParam !== stateCookie) {
    return done("ig_error=invalid_state");
  }
  const state = verifyState(stateParam);
  if (!state) return done("ig_error=state_expired");

  // The company is taken from the signed state, and must still exist.
  const company = await prisma.company.findUnique({ where: { id: state.companyId }, select: { id: true } });
  if (!company) return done("ig_error=company_missing");

  if (!instagramOAuthConfig(base).configured) return done("ig_error=oauth_not_configured");

  try {
    const short = await exchangeCodeForToken(code, base);
    const long = await exchangeForLongLivedToken(short.access_token);
    const verify = await verifyConnection(long.access_token, {
      grantedScopes: short.permissions,
      withMedia: true,
      withInsights: true,
    });
    if (!verify.ok || !verify.account) {
      await recordInstagramFailure(company.id, verify.error || "Verification failed after authorisation.");
      return done(`ig_error=${encodeURIComponent(verify.error || "verification_failed")}`);
    }
    await upsertVerifiedInstagram({
      companyId: company.id,
      verify,
      dataSource: "oauth",
      scopes: short.permissions,
      longLivedToken: long.access_token,
      tokenExpiresInSec: long.expires_in,
    });
    return done(`ig_connected=1&ig_user=${encodeURIComponent(verify.account.username)}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Authorisation failed.";
    await recordInstagramFailure(company.id, msg).catch(() => {});
    return done(`ig_error=${encodeURIComponent(msg)}`);
  }
}
