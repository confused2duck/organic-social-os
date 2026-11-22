import { NextResponse, type NextRequest } from "next/server";

// ===========================================================================
// Staging access gate.
//
// When STAGING_ACCESS_PASSWORD is set (staging/preview deployments), the whole
// app is protected by HTTP Basic Auth so only the authorised tester can reach
// it during Instagram verification. When the variable is unset (local dev,
// production with real user auth), the gate is disabled and requests pass
// through unchanged. This protects the deployment; it is NOT per-end-user login.
// ===========================================================================

export const config = {
  // Exclude Next internals and static media from the gate.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|generated/|robots.txt|sitemap.xml).*)"],
};

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Organic Social OS staging"' },
  });
}

export function middleware(req: NextRequest) {
  const password = process.env.STAGING_ACCESS_PASSWORD?.trim();
  if (!password) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return unauthorized();

  let decoded = "";
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }
  // Format "user:pass" — the username is cosmetic; the password must match.
  const pass = decoded.slice(decoded.indexOf(":") + 1);
  const user = process.env.STAGING_ACCESS_USER?.trim();
  const userOk = !user || decoded.slice(0, decoded.indexOf(":")) === user;

  // Edge-safe constant-time comparison (no node:crypto/Buffer in middleware).
  const passOk = timingSafeEqualEdge(pass, password);
  if (!userOk || !passOk) return unauthorized();

  return NextResponse.next();
}

// Edge-safe constant-time string comparison (no node:crypto in middleware).
function timingSafeEqualEdge(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
