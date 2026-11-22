# Organic Social OS — Build Log & Traceability

> Living document. The authoritative record of scope, progress, verification
> evidence, and honest runtime limitations. Update it as features land so the
> build can resume cleanly across Claude Code sessions.

Last updated: **2026-11-21**

---

## 1. Product

An **Autonomous Organic Social Media OS** — a multi-tenant SaaS that takes
responsibility for a company's complete *organic* social media operations across
LinkedIn, Instagram, Facebook, YouTube and TikTok. Continuous workflow:

`Company Understanding → Research → Performance Analysis → Strategy → Content
Calendar → Content Creation → Graphic & Video Production → Validation →
Scheduling → Publishing → Verification → Reporting → Optimisation → repeat.`

### Honesty principles (non-negotiable)
- Never fabricate company info, research, metrics, publishing results or email deliveries.
- No fake "connected" integrations, post IDs/URLs, or live-AI claims.
- Clearly distinguish: **tested local functionality**, **Claude-assisted content
  outputs**, **connected external operations**, and **capabilities awaiting a
  production runtime**.
- Internal AI model names/prompts/orchestration are never shown to client users.

---

## 2. Source of truth — the workbook

`Martech_Meerkat_SME_Operating_System_Automation_Register.xlsx` → sheet
**Automation Register** (2,648 activity rows, 16 columns). Derived deterministically
by `scripts/extract_register.py` into `prisma/data/*.json` (committed).

### Scope decision (traceable to Excel IDs)
The six social-media domains sum to **605** activities — exactly the figure the brief cites:

| Domain | Rows |
|---|---|
| Instagram Marketing | 339 |
| LinkedIn Marketing | 239 |
| TikTok Organic & Paid Marketing | 8 |
| YouTube Marketing & Video SEO | 7 |
| Facebook & Messenger Marketing | 6 |
| Influencer, Creator & UGC Operations | 6 |
| **Total social** | **605** |

Classification within the 605:

| Scope | Count | Decision |
|---|---|---|
| **organic** | **520** | **In scope — build these** |
| paid (advertising) | 64 | Deferred (out of current scope) |
| leadgen (outbound) | 21 | Deferred → separate Lead Generation Agent |

Every activity keeps its original Excel ID (`MM-xxxx`) in `ActivityCatalog` and is
mapped to one of the 7 agent systems. The paid/leadgen rows are retained (not
silently dropped) and shown as **deferred** in the Traceability view.

### 520 organic activities → 7 agent systems
| System | Name | Organic activities |
|---|---|---|
| A | Brand Intelligence | 36 |
| B | Research & Trends | 48 |
| C | Performance Intelligence | 46 |
| D | Strategy & Calendar | 79 |
| E | Creative Production | 123 |
| F | Publishing & Community | 182 |
| G | Reporting & Optimisation | 6 |

25 organic specialist agents roll up into these 7 systems (see `prisma/data/agent-catalog.json`).

---

## 3. Architecture & stack

- **Next.js 14 (App Router) + React 18 + TypeScript + Tailwind** + hand-built
  shadcn-style UI (Radix primitives, CVA).
- **Prisma + SQLite** (local testing DB). No native enums/JSON on SQLite →
  status/type fields are `String` (value sets in `src/lib/enums.ts`); JSON payloads
  are JSON strings (helpers in `src/lib/json.ts`).
- **Multi-tenancy:** every tenant row has an indexed `companyId` + cascade delete;
  all access goes through a company-scoped repository so cross-tenant reads are impossible.
- **Background worker:** durable DB-backed `Task` queue (idempotency keys, retries,
  dependencies) run by a separate `tsx worker/index.ts` process. `npm run dev:all`
  runs web + worker together.
- **Creative rendering:** deterministic SVG → PNG via `sharp`; video via
  `ffmpeg-static` (real MP4) with an honest `awaiting_render_runtime` fallback.
- **AI inference:** a clean inference interface is defined but **no paid LLM API is
  wired** for this testing build. Claude-assisted outputs produced during
  development are persisted and labelled `generated_by = claude_dev_session`.

---

## 4. Phase progress

- [x] **Phase 1 — Inspect workbook; identify organic activities.** Done. 605 social,
      520 organic, mapped A–G. Evidence: `prisma/data/activity-register.json`,
      `scripts/extract_register.py`.
- [x] **Phase 2 — Project structure, DB, architecture, execution states.** Done & verified.
- [x] **Phase 3 — Dashboard shell + 14 sections + data flows.** Done (19 routes build).
- [x] **Phase 4 — Brand, research, strategy, calendars, task orchestration.** Done.
- [x] **Phase 5 — Creative production (graphics, carousels, real video).** Done — sharp PNGs + ffmpeg MP4 verified.
- [x] **Phase 6 — Publishing workflows, approvals, honest integrations, failure handling.** Done — publish honestly blocks with no fabricated IDs.
- [x] **Phase 7 — Analytics, weekly reporting, email (honest not_configured), planning.** Done.
- [x] **Phase 8 — Two labelled test company workspaces populated via the agent cycle.** Done.
- [x] **Phase 9 — Tests + typecheck + prod build; defects fixed.** Done (see §7).

---

## 5. Honest runtime limitations (current)
- **Publishing:** no authorised platform credentials → posts reach the honest
  `blocked` / `requires authorised connection` state. No post IDs/URLs fabricated.
- **Email:** no SMTP configured → report delivery stays `not_configured`.
- **Analytics:** seeded as `test_fixture` and labelled as such until real data is
  imported/connected.
- **AI runtime:** not connected; new AI reasoning after a dev session is shown as
  requiring a Claude Code dev/test execution or a production AI runtime.
- **Video:** rendered via bundled ffmpeg when available; otherwise
  `awaiting_render_runtime` (workflow preserved, nothing faked).

---

## 6. How to resume
1. `npm install` (if `node_modules` missing).
2. `npm run db:push` then `npm run db:seed`.
3. `npm run dev:all` (web + worker). App at http://localhost:3000.
4. Continue at the first unchecked Phase in §4. This file + the Traceability view
   (seeded `ActivityCatalog`) are the implementation map.

---

## 7. Verification evidence log
_(Appended as checks run — build output, test runs, Playwright artifacts.)_

### ✅ RESOLVED (2026-11-22): relocated to C:, foundation VERIFIED
The project was relocated from `E:\ASK Agents\Organic Social` to
`C:\Users\Nagashree K S\organic-social-os` (source copied, original kept; the slow
`E:` volume + AV was the bottleneck). A `--prefer-offline` install on the fast C:
disk with the warm cache completed in **~2 min** (611 packages, official registry,
pinned versions, Prisma 5.22 — NOT 8). Verified results:
- `prisma generate` + `db push` → schema valid, SQLite `dev.db` in sync (26 models).
- `db:seed` → ActivityCatalog **605** (organic **520**, paid 64, leadgen 21); 25 agents;
  Northwind full cycle **30 calendar posts** (3/day × 2 platforms × 5 days), Verde **12**.
- `scripts/verify.ts` → Excel IDs **605 unique, all `MM-####`**; organic A–G
  `A=36 B=48 C=46 D=79 E=123 F=182 G=6`; tenant isolation **0 orphaned/cross-tenant**.
- `npm run typecheck` → **0 errors**. `npm run build` → **compiled successfully**.
- `npm run dev` → HTTP **200**; Overview renders seeded Northwind/Verde data.

### ✅ FULL BUILD VERIFIED (2026-11-22)
- **Creative rendering (real files):** `renderAllForCompany` → 30/30 (Northwind) + 12/12
  (Verde) rendered; real branded **PNGs** (40–83 KB), **5-slide carousels**, and a genuine
  **10 s ffmpeg MP4** (174 KB). `sharp` + `ffmpeg-static` both available. 85+ files in `public/generated`.
- **Durable worker:** `scripts/worker-test.ts` → enqueue → `drainQueue` → task **completed**
  (1 attempt, result persisted). Restart-safe (stale `processing` re-queued), idempotent.
- **Vitest unit:** `npm test` → **13/13 passed** (scheduling incl. 30-slot example &
  config recompute; json helpers; agent systems).
- **Playwright e2e:** `npm run test:e2e` → **5/5 passed** (overview seeded data; nav through
  all sections; traceability shows 520 organic; calendar config-driven slots; company switch
  isolation). One initial failure was a test-selector ambiguity (fixed), not an app bug.
- **Typecheck:** `npm run typecheck` → **0 errors**.
- **Production build:** `npm run build` → **19 routes compiled** (14 sections + onboarding +
  content detail + report-download route).

### Honest capability states (verified, not faked)
- Publishing → `blocked` (no authorised connection; no post IDs/URLs fabricated).
- Email delivery → `not_configured` (no SMTP).
- Analytics/metrics → labelled `test_fixture`.
- AI inference → interface defined; no paid LLM wired; agent outputs are DETERMINISTIC and
  labelled `claude_dev_session` (not presented as live autonomous AI).
- Video → real MP4 when ffmpeg present, else `awaiting_render_runtime` with a real poster frame.

### ✅ FUNCTIONAL AUDIT (2026-11-22) — see docs/AUDIT_REPORT.md
Evidence-based audit of the running app (browser flows + scripted probes + tests).
- Verified: new-company-from-scratch (Atlas Fitness Studio, via UI), persistence,
  research/strategy/calendar, real PNG/carousel/MP4 rendering, editing/approvals/
  scheduling, worker + crash recovery, tenant isolation (data + UI 404), report math
  (= raw sums exactly), responsive.
- **3 defects found & fixed:** (1) empty `""` in content when brand data sparse →
  fallback copy; (2) weak `#b` hashtag → meaningful-word derivation; (3) no mobile nav
  → hamburger drawer. Regression tests added (`tests/unit/content-quality.test.ts`).
- Honest classification: all 7 agent systems are **deterministic automation** (no live
  AI); 520 activity IDs are **mapped (traceability), not individually implemented**
  (`implementationStatus = planned`). Labelling nuance flagged (`generated_by =
  claude_dev_session` means dev-session code output, not Claude-authored per item).
- Post-fix verification: typecheck 0, Vitest **17/17**, Playwright **5/5**, build 19 routes.

### ✅ COMPANY INTELLIGENCE COMPLETED (2026-11-22) — see docs/AUDIT_REPORT.md §0
- **P1 — Brand-input UIs:** full editable/persisted/isolated editors for company info,
  multiple **ICPs**, personas (+ buying motivations), competitors (+ social handles),
  positioning/value props/**differentiators**, voice + writing guidelines, visual
  (colours/fonts/logo), objectives/markets, claims + **content restrictions**, and
  **documents → traceable KnowledgeItems** (deterministic `src/lib/knowledge.ts`).
  Schema: added Product, IcpProfile, KnowledgeItem + Persona/Company fields.
- **P2 — Wiring:** research/strategy/calendar now consume the saved brand data;
  a brand-completeness banner flags missing essentials; nothing is fabricated.
  Verified by `scripts/verify-wiring.ts` (ALL PASS) incl. a bare-company no-fabrication test.
- **P3 — Honesty:** `claude_dev_session → deterministic_generation` everywhere;
  Traceability distinguishes **mapped** (all 520) from **implemented & tested capabilities**;
  no activity auto-marked implemented.
- **P4 — Tests:** knowledge + content-quality unit tests; Playwright brand E2E.
  Full suite: typecheck 0 · **Vitest 21/21** · **Playwright 6/6** · build 19 routes ·
  audit-probe ALL PASS · wiring ALL PASS.

### ✅ PHASE 5 — GENUINE AUTONOMOUS AI EXECUTION (2026-11-22)
**1. Runtime/model selected.** Local **Ollama** (open-weight, server-side, no paid API,
no personal subscription credentials). Default **qwen3:8b** (balanced), **qwen2.5:14b**
available for max accuracy, **llama3.2:1b** for fast checks. Chosen because they are
already installed, run locally, and produce reliable structured JSON.
**2. Hardware + observed performance.** i5-1235U (12 threads), 23.7 GB RAM, **no NVIDIA
GPU** (CPU inference), 18 GB free disk. qwen3:8b: ~2.4 tok/s, **~15–25 s per short
structured response** on CPU — workable for async/background, not real-time.
**3. Inference interface.** `src/lib/ai/` — provider abstraction (`ollama.ts`) + capability
detection (`getAiStatus`) + `aiText`/`aiJson` with defensive JSON parsing. Unavailable →
`{ok:false}` → deterministic fallback (labelled `deterministic_generation`); AI output
labelled `ai:<model>`. **Real inference verified** (`scripts/ai-test.ts`).
**4. Source-verified research.** `src/lib/ai/research-pipeline.ts` — fetches the real
competitor URLs, records URL/publisher/retrieved-timestamp/HTTP status, AI-separates
**verified facts vs interpretation**; unreachable URLs recorded as such (no fabrication).
Verified against a live URL in `scripts/autonomy-test.ts`.
**5. Model-driven content.** `src/lib/ai/content.ts` + `autonomous.ts` — grounded,
no-fabrication prompts; produced e.g. *"Operations Olivia … Northwind's plain-language
briefs…"* (real persona + product). Connected to the existing PNG/carousel/MP4 renderer.
Branded templated graphics are kept distinct from (absent) AI image generation.
**6. Accuracy gate.** `src/lib/validation.ts` — deterministic (prohibited claims →
REJECT, unsupported statistics → FLAG, platform specs, hashtags) is authoritative;
optional model review adds flags only. Rejected content is `blocked`, never auto-published.
**7. Scheduler + recovery.** `src/lib/scheduler.ts` runs inside `worker/index.ts` (no
browser). Per-company, config-driven, period-idempotent → restart-safe, no duplicates.
Demonstrated scheduler→worker completion with NO manual trigger (`scripts/scheduler-demo.ts`).
**8. Tests.** typecheck 0 · **Vitest 26/26** (added validation tests) · **Playwright 6/6** ·
build (20 routes) · `ai-test` PASS · `autonomy-test` ALL PASS · `scheduler-demo` PASS.
**9. Honest external integrations.** Publishing/inbox/analytics-import still require
authorised platform credentials; email needs SMTP — all kept in blocked/not_configured.
**10. To run continuously:** `ollama serve` (running) + `npm run worker` (ticks the
scheduler, processes cycles with AI + validation). For max accuracy set
`OLLAMA_MODEL=qwen2.5:14b`. A GPU would cut latency ~10–20×.

### Blockers requiring an external dependency / credential (by design)
- Real publishing + community sending + analytics import: need authorised platform API
  credentials or a verified MCP connector.
- Weekly report email delivery: needs authorised SMTP (`SMTP_HOST` …).
- New AI reasoning after the dev session: needs a production AI runtime (the inference
  interface is ready; no paid API is wired in this build).

### Original blocker (for the record): `npm install` on E: could not complete
- The connection to `registry.npmjs.org` is severely throttled — the npm debug log
  shows individual tarball fetches taking **tens of minutes to ~2 hours each**.
  After ~2 hours the install had still not produced `package-lock.json` or the
  `node_modules/.bin` binaries.
- The `E:` filesystem is also very slow for many-small-files (a `find` over a
  partial `node_modules` took >2 min) and AV file-locking caused an `EPERM/EBUSY`
  ("file already in use by a text editor or antivirus") failure on a retry.
- Net effect: dependencies are not installed, so **nothing has been verified**
  (no `prisma generate`, `db push`, seed, typecheck, build, or run yet).
- **To unblock (any one):** (a) install on a faster/unthrottled network or via a
  faster registry mirror; (b) relocate the project to a fast local disk (C:) away
  from the slow volume/AV; then run `npm install` → `npm run db:push` →
  `npm run db:seed` → `npm run dev:all`.

### Built so far (code complete, PENDING verification)
- Config + schema (26 models) + seed (catalog 605 incl. 520 organic, 2 demo companies, full agent cycle).
- Tenant isolation layer (enforced scoping, not just indexes).
- Agent engine A–G (research, strategy, calendar, creative specs, analytics, report, community, orchestrator) — deterministic, honesty-constrained.
- Server actions: workflow run, approvals, post edit, publish (honest-blocked), settings save, company create/switch.
- UI kit + dashboard shell (sidebar, topbar, company switcher) + pages: Overview, Strategy, Research, Calendar.
- NOT yet built: remaining pages (content/creative/brand/connections/analytics/reports/tasks/approvals/inbox/settings/traceability/onboarding), creative render pipeline (sharp/ffmpeg), background worker, tests.
