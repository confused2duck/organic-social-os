import crypto from "node:crypto";

// ===========================================================================
// Secret handling for platform integrations.
//
//  - Access tokens are encrypted at rest with AES-256-GCM (authenticated).
//    They are NEVER written to the database in plaintext and NEVER sent to the
//    browser. Only server-side code with APP_ENCRYPTION_KEY can decrypt them.
//  - OAuth `state` is an HMAC-signed, time-boxed payload so the callback can
//    prove the request originated from this server and bind it to a company,
//    defeating CSRF / mix-up attacks.
//
// APP_ENCRYPTION_KEY: 32 bytes, provided as 64 hex chars or base64. In the
// absence of a key the helpers throw rather than silently storing plaintext.
// ===========================================================================

function loadKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      "APP_ENCRYPTION_KEY is not set. Generate one with: openssl rand -hex 32",
    );
  }
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) key = Buffer.from(raw, "hex");
  else key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must decode to exactly 32 bytes (hex-64 or base64).");
  }
  return key;
}

function stateSecret(): Buffer {
  const raw = process.env.OAUTH_STATE_SECRET?.trim() || process.env.APP_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("OAUTH_STATE_SECRET (or APP_ENCRYPTION_KEY) is not set.");
  return Buffer.from(raw);
}

/** AES-256-GCM encrypt. Returns `v1:<iv>:<tag>:<ciphertext>` (all base64url). */
export function encryptSecret(plaintext: string): string {
  const key = loadKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    enc.toString("base64url"),
  ].join(":");
}

/** Decrypt a value produced by encryptSecret(). Throws if tampered or wrong key. */
export function decryptSecret(payload: string): string {
  const key = loadKey();
  const [v, ivB64, tagB64, dataB64] = payload.split(":");
  if (v !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted secret.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** True when encryption is configured (used to gate the OAuth connect flow). */
export function secretsConfigured(): boolean {
  try {
    loadKey();
    return true;
  } catch {
    return false;
  }
}

export interface OAuthState {
  companyId: string;
  nonce: string;
  ts: number;
}

/** Build an HMAC-signed state token binding the flow to a company. */
export function signState(companyId: string): { token: string; nonce: string } {
  const nonce = crypto.randomBytes(16).toString("base64url");
  const body: OAuthState = { companyId, nonce, ts: Date.now() };
  const json = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto.createHmac("sha256", stateSecret()).update(json).digest("base64url");
  return { token: `${json}.${sig}`, nonce };
}

/**
 * Verify a state token: signature valid, not older than maxAgeMs. Returns the
 * decoded payload or null. Constant-time signature comparison.
 */
export function verifyState(token: string | undefined | null, maxAgeMs = 10 * 60 * 1000): OAuthState | null {
  if (!token) return null;
  const [json, sig] = token.split(".");
  if (!json || !sig) return null;
  const expected = crypto.createHmac("sha256", stateSecret()).update(json).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(Buffer.from(json, "base64url").toString("utf8")) as OAuthState;
    if (typeof body.ts !== "number" || Date.now() - body.ts > maxAgeMs) return null;
    if (!body.companyId || !body.nonce) return null;
    return body;
  } catch {
    return null;
  }
}
