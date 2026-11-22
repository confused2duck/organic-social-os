import { NextResponse, type NextRequest } from "next/server";
import { requireCompany } from "@/lib/tenant";
import { instagramOAuthConfig, buildAuthorizeUrl } from "@/lib/integrations/instagram";
import { signState, secretsConfigured } from "@/lib/integrations/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "ig_oauth_state";

// GET /api/oauth/instagram/start
// Begins the Instagram (Unified Login) authorisation flow for the ACTIVE
// company. The company is resolved server-side — never taken from the client.
export async function GET(req: NextRequest) {
  const base = (process.env.APP_BASE_URL?.trim() || new URL(req.url).origin).replace(/\/+$/, "");
  const back = (path: string) => NextResponse.redirect(`${base}${path}`);

  const cfg = instagramOAuthConfig(base);
  if (!cfg.configured) return back("/connections?ig_error=oauth_not_configured");
  if (!secretsConfigured()) return back("/connections?ig_error=encryption_not_configured");

  let companyId: string;
  try {
    companyId = (await requireCompany()).id;
  } catch {
    return back("/connections?ig_error=no_active_company");
  }

  const { token } = signState(companyId);
  const res = NextResponse.redirect(buildAuthorizeUrl(token, base));
  res.cookies.set(STATE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: base.startsWith("https://"),
    path: "/api/oauth/instagram",
    maxAge: 600,
  });
  return res;
}
