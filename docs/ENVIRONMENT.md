# Environment variables

Every variable the application, worker and deployment actually read. Names are
consistent across the app, the worker and `.env.example`. **Secrets must only be
set in the Vercel project settings / the worker host — never committed.**

"Where":
- **Web** — the Next.js app on Vercel (and local `next dev`).
- **Worker** — the always-on background worker (renders creatives, runs the
  scheduler/queue). Runs on a separate host, **not** on Vercel Functions.
- **Build** — needed at `vercel build` / `prisma migrate deploy` time.

| Variable | Where | Secret | Source | Purpose |
|---|---|---|---|---|
| `DATABASE_URL` | Web, Worker, Build | **Yes** | Managed Postgres (Vercel Postgres / Neon / Supabase) — pooled URL | Runtime database connection |
| `DIRECT_URL` | Migrations only (local / CI) | **Yes** | Same provider — direct / session-pooler URL | `prisma migrate deploy`. **Not required at Vercel runtime** (the build does not migrate). Set equal to `DATABASE_URL` if the provider has one endpoint |
| `APP_BASE_URL` | Web | No | Your deployment's HTTPS origin | Builds the exact OAuth redirect URI; must match the value registered in Meta |
| `APP_NAME` | Web, Worker | No | You | Display name |
| `NODE_ENV` | Web, Worker | No | Platform (`production` on Vercel) | Runtime mode |
| `APP_ENCRYPTION_KEY` | Web (Worker if it decrypts) | **Yes** | `openssl rand -hex 32` | AES-256-GCM encryption of stored Instagram tokens at rest |
| `OAUTH_STATE_SECRET` | Web | **Yes** | Any long random string | HMAC signing of the OAuth `state` (CSRF protection). Falls back to `APP_ENCRYPTION_KEY` |
| `STAGING_ACCESS_USER` | Web | No | You | Username for the staging Basic-Auth gate (optional) |
| `STAGING_ACCESS_PASSWORD` | Web | **Yes** | You | Password gate for the whole staging deployment. **Blank disables the gate** (local/prod) |
| `INSTAGRAM_APP_ID` | Web | No | Meta app → Instagram product → *Instagram app ID* | OAuth authorize + token exchange |
| `INSTAGRAM_APP_SECRET` | Web | **Yes** | Meta app → Instagram product → *Instagram app secret* | OAuth token exchange |
| `META_GRAPH_VERSION` | Web, Worker | No | You (default `v21.0`) | Graph API version |
| `INSTAGRAM_TEST_ACCOUNT_ID` | Web (Worker if it reads) | No | Meta (your test account's Instagram user id) | Asserts the test token belongs to the expected account |
| `INSTAGRAM_TEST_ACCESS_TOKEN` | Web (Worker if it reads) | **Yes** | Meta (long-lived token for your test account) | Read-only verification of the test account without the OAuth flow. Never stored in the DB |
| `META_APP_ID` / `META_APP_SECRET` | Web | **Yes** | Meta app | Optional — only for the Facebook-Login path / `/debug_token` |
| `STORAGE_DRIVER` | Web, Worker | No | You (`local` or `vercel-blob`) | Where generated media is served from |
| `BLOB_READ_WRITE_TOKEN` | Web, Worker | **Yes** | Vercel Blob store | Uploads/serves media when `STORAGE_DRIVER=vercel-blob` |
| `GENERATED_ASSETS_DIR` | Worker | No | You (default `public/generated`) | Local render output directory |
| `ENABLE_VIDEO_RENDER` | Worker | No | You | `0` forces the honest "render runtime unavailable" state |
| `WORKER_POLL_MS` | Worker | No | You (default `2000`) | Task queue poll interval |
| `SCHEDULER_TICK_MS` | Worker | No | You (default `60000`) | Scheduler tick interval |
| `INTEGRATION_TIMEOUT_MS` | Web, Worker | No | You (default `12000`) | Outbound API timeout |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASSWORD` `SMTP_FROM` | Worker | **Yes** (password) | Your SMTP provider | Weekly report email. Blank = honest "not configured" |
| `AI_RUNTIME_URL` / `AI_RUNTIME_KEY` / `OLLAMA_*` | Worker | Maybe | Your inference runtime | AI assist (separate runtime; blank = deterministic fallback) |

## Exact Instagram OAuth redirect URI

The callback route is `src/app/api/oauth/instagram/callback/route.ts`. The URI to
register in the Meta app is:

```
${APP_BASE_URL}/api/oauth/instagram/callback
```

For a Vercel staging domain that is, for example:

```
https://organic-social-os.vercel.app/api/oauth/instagram/callback
```

It must be registered **exactly** (scheme, host, path) under:
Meta app → Instagram → API setup with Instagram login → Business login settings →
*Redirect URLs*. The authorize step requests scopes:
`instagram_business_basic, instagram_business_manage_insights,
instagram_business_manage_comments, instagram_business_content_publish`.
(Publishing is requested for future use but is **blocked in-app** until explicitly
authorised.)
