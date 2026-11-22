# Deployment & Instagram testing — staging playbook

This prepares a **protected HTTPS staging deployment** on Vercel (connected to
GitHub) with managed Postgres, persistent media storage, and a **read-only**
Instagram integration. LinkedIn is paused. No publishing to Instagram occurs.

Repo: `confused2duck/organic-social-os` (branch `main`).

---

## 1. GitHub

The project is a standard Next.js 14 app. Secrets are excluded by `.gitignore`
(`.env*` except `.env.example`, `*.db`, `*.xlsx`, media, `.vercel`, local Claude
config). A secret scan over tracked files found no tokens or keys.

```bash
git remote add origin https://github.com/confused2duck/organic-social-os.git
git push -u origin main
```

> The repo is **public**. The company workbook (`*.xlsx`) and the local SQLite
> `dev.db` are intentionally **not** committed. The seed reads from
> `prisma/data/*.json`, so the build does not need the workbook.

## 2. Managed Postgres

Create a Postgres database (Vercel Postgres, Neon, or Supabase). You get a
pooled URL and (usually) a direct URL.

- Set `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) in Vercel.
- Migrations run automatically on deploy — `vercel.json` build command is
  `prisma generate && prisma migrate deploy && next build`. The initial
  migration is `prisma/migrations/20260101000000_init`.
- Seed once (reference data + demo workspace) from your machine, pointed at the
  managed DB, or via a one-off job:
  ```bash
  DATABASE_URL="<managed pooled url>" npm run db:seed
  ```

**Local dev parity:** `docker compose up -d` starts Postgres 16 with the
credentials already in `.env.example`'s local line, then `npm run db:push &&
npm run db:seed`.

## 3. Persistent media storage

Vercel's filesystem is ephemeral, so generated media (graphics, carousels,
posters, video) must go to blob storage.

- Create a Vercel Blob store; set `STORAGE_DRIVER=vercel-blob` and
  `BLOB_READ_WRITE_TOKEN`.
- Install the optional package where the worker runs: `npm i @vercel/blob`.
- With `STORAGE_DRIVER=local` (default) media is served from `/public/generated`
  (self-hosted / local only).

## 4. Background worker (separate runtime)

The worker (`npm run worker`) polls the durable task queue and renders creatives.
It must run on an **always-on host** (a small VM / container / Railway / Render),
**not** on Vercel Functions. Point it at the same `DATABASE_URL` and storage env.
Rendering uses `sharp` + `ffmpeg-static`, which need a real filesystem.

## 5. Protected staging gate

Set `STAGING_ACCESS_PASSWORD` (and optionally `STAGING_ACCESS_USER`) in Vercel.
`src/middleware.ts` then requires HTTP Basic Auth for the whole app so only the
authorised tester can reach it. Leave it blank to disable the gate.

## 6. Instagram — environment & read-only test

Set in Vercel:

| Purpose | Variable |
|---|---|
| OAuth consent flow (future customers) | `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` |
| Token encryption | `APP_ENCRYPTION_KEY` (`openssl rand -hex 32`) |
| State signing | `OAUTH_STATE_SECRET` |
| Your test account | `INSTAGRAM_TEST_ACCOUNT_ID`, `INSTAGRAM_TEST_ACCESS_TOKEN` |
| Redirect building | `APP_BASE_URL` |

Register this **exact** redirect URI in the Meta app (Instagram → API setup with
Instagram login → Business login settings → Redirect URLs):

```
${APP_BASE_URL}/api/oauth/instagram/callback
```

**Read-only verification (what the app does, in order):**
1. Validates the token via `GET graph.instagram.com/<version>/me`.
2. Confirms the returned Instagram account id (and, if `INSTAGRAM_TEST_ACCOUNT_ID`
   is set, that it matches — otherwise it refuses and records the mismatch).
3. Reads username / name / account type / media & follower counts.
4. Derives granted permissions (from the OAuth response, or conservatively from
   successful read calls for the test token).
5. Reads recent media and account insights (insights shown only if genuinely
   returned — otherwise reported as unavailable, never estimated).
6. Stores the verified connection scoped to the active company (`PlatformConnection`,
   `status=connected`, `dataSource=env_test_token`), token kept in env (test) or
   encrypted (oauth).
7. Shows the genuine data on **Connected Pages** with a LIVE label.

To run it: open **Connected Pages** and click **Verify & connect test account**
(uses the env token), or **Connect with Instagram** (full OAuth consent).

> Publishing stays disabled. No post, comment or message is sent from the app.

## 7. Customer onboarding (preserved architecture)

Future customers never see your test token. They click **Connect with Instagram**
→ Instagram consent (2FA handled by Instagram) → the callback verifies and stores
**their own** encrypted token scoped to **their** company workspace. The same
read-only verification applies. Company isolation is enforced server-side
(`src/lib/tenant.ts`): the connection is bound to the company in the signed OAuth
`state`, not to anything the client supplies.

---

## Remaining external blockers (needed from you / Meta)

1. **Instagram credentials** — `INSTAGRAM_APP_ID/SECRET` and the test
   `INSTAGRAM_TEST_ACCOUNT_ID/ACCESS_TOKEN` set in Vercel (you supply these).
2. **Meta app config** — the redirect URI above registered; the test account
   added as an Instagram Tester and authorised (you have done this).
3. **Managed Postgres** — provisioned; `DATABASE_URL`/`DIRECT_URL` set.
4. **Vercel project** — repo connected, env vars set, first deploy run.
5. **Blob store** (if using media) — created; `@vercel/blob` installed on the
   worker; `STORAGE_DRIVER`/`BLOB_READ_WRITE_TOKEN` set.
6. **Worker host** — an always-on runtime for `npm run worker`.
7. **App Review** — required before any *publishing* permissions move beyond
   your own test/standard-access accounts (not needed for the read-only test).
