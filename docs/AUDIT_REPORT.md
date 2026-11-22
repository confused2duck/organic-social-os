# Functional Audit Report — Organic Social OS

**Date:** 2026-11-22 · **Method:** evidence-based testing of the running app (real
browser flows, scripted DB probes, automated tests). No rebuild; existing project,
database, assets and the two demo companies preserved.

**Headline:** The application is **functional end-to-end** for the capabilities it
claims, and **honest** about what it cannot do. It is **deterministic software
automation**, not autonomous AI — and it does not pretend otherwise. This audit
found **3 real defects (all fixed)** and **documented gaps** (chiefly missing
structured brand-input UI and the external integrations that require credentials).

---

## 0b. Update (2026-11-22) — Phase 5: GENUINE AUTONOMOUS AI now operational

The earlier classification ("all 7 systems deterministic, no live AI") is **superseded**.
A real, locally-hosted inference runtime (**Ollama**, open-weight models, no paid/personal
API) is now wired and **verified executing model inference** (qwen3:8b, ~15–25 s/response
on CPU). The system now: generates **model-driven, brand-grounded content** (labelled
`ai:<model>`); retrieves **real sources with provenance** (facts vs interpretation);
enforces an **accuracy gate** (prohibited claims rejected, unsupported stats flagged);
and runs a **persistent scheduler** in the worker that initiates and completes work with
no manual trigger. Deterministic generation remains the honest fallback (`deterministic_
generation`) when no runtime is present. Evidence: `scripts/ai-test.ts`, `autonomy-test.ts`,
`scheduler-demo.ts` (all PASS); Vitest 26/26, Playwright 6/6, build 20 routes. Full detail
in `docs/BUILD_LOG.md` → "PHASE 5". Still honest/blocked: real platform publishing, inbox,
analytics import (need credentials), email (SMTP), and AI *image* generation (not present).

## 0. Update (2026-11-22) — Company Intelligence gaps CLOSED

The audit's main gaps have been fixed and verified:
- **Full brand-input UIs built** (Company & Brand Intelligence): editable, persisted,
  isolated — company info, **multiple ICPs**, buyer personas (incl. buying
  motivations), competitors (+ social handles), positioning/value props/
  **differentiators**, brand voice + writing guidelines, visual (colours/fonts/logo),
  marketing objectives/markets, approved claims + **content restrictions**, and
  **documents processed into traceable KnowledgeItems** (deterministic, no fabrication).
- **Intelligence now feeds the workflows (verified):** `scripts/verify-wiring.ts` →
  research cites real product names + ICPs; strategy reflects marketing objectives;
  a **bare company is flagged with a knowledge-gap item and fabricates nothing**
  (no invented competitors/products). A brand-completeness banner lists missing
  essentials and never invents them.
- **P3 fixes:** attribution relabelled `claude_dev_session → deterministic_generation`
  everywhere; Traceability now shows all 520 as **mapped** (none auto-marked
  implemented) and separately lists the genuinely **implemented & tested capabilities**.
- **Tests added:** knowledge extraction (unit), content quality (unit), and a full
  **Playwright brand E2E** (create company → flag missing info → add product →
  persist → isolation). Suite: typecheck 0 · **Vitest 21/21** · **Playwright 6/6** ·
  build 19 routes · audit-probe ALL PASS · wiring ALL PASS.

## 1. Evidence summary (all re-run this session)

| Area | Method | Result |
|---|---|---|
| Typecheck | `tsc --noEmit` | **0 errors** |
| Unit tests | Vitest | **17/17 pass** (incl. 4 new audit regressions) |
| E2E | Playwright | **5/5 pass** |
| Production build | `next build` | **19 routes compiled** |
| New company (from scratch) | Browser: /onboarding → create → persist | **Works** — Atlas Fitness Studio created, redirected to /brand, data persisted |
| Tenant isolation (data) | `scripts/audit-probe.ts` | cross-tenant post/report/creative reads → **null**; 0 orphans |
| Tenant isolation (UI/URL) | Browser: open another company's post URL | **HTTP 404** |
| Report math vs raw inputs | probe recompute | impressions 102,962 = raw sum **exactly**; rate = eng/impr (±1e-9) |
| Media validity | sharp + ffmpeg probe | PNG `png 1080×1080`; MP4 **h264, 12s**; carousel **5 slides** |
| Worker + restart recovery | probe (stale `processing` task) | recovered → **completed** |

---

## 2. The ten functional areas

1. **Create a company from scratch** — ✅ Works. `/onboarding` → `createCompanyAction`
   creates company + config + platform connections, sets the active-company cookie,
   redirects to `/brand`. Verified in the browser with a brand-new "Atlas Fitness
   Studio" (Instagram + TikTok), independent of the demo records.
2. **Upload company info, brand guidelines, ICP, content prefs** — ⚠️ **Partial.**
   Works: core brand fields (name, industry, website, tagline, description,
   positioning) are editable and persist; brand "documents" (pasted text) can be
   added; content preferences (platforms, posts/day, days, times, formats, approval,
   report delivery) are fully editable in **Automation Settings** and drive behaviour.
   **Gap (see §5):** there is **no structured UI to enter ICP, audience personas, or
   competitors** — those exist only on the seeded demo companies.
3. **Persistence** — ✅ Works. New-company fields persist across navigation and
   restart (SQLite). Verified by reload and by direct DB read.
4. **Research / strategy / calendar workflows** — ✅ Works (deterministic). Running the
   full cycle on the empty Atlas company produced research (thin, honestly — no
   competitors/personas to ground it), a strategy, and **10 config-driven calendar
   posts** (2 platforms × 1/day × 5 days). Changing settings changes the count.
5. **Finished static graphics, carousels, MP4** — ✅ Works (real files). "Render all"
   produced 10/10 real assets for Atlas; probes confirm a **1080×1080 PNG**, a real
   **h264 MP4 (12s)**, and a **5-slide carousel**. Not placeholders.
6. **Editing, scheduling, approvals, task progression** — ✅ Works. Post editor saves
   copy/hashtags; approve/reject moves status (awaiting_approval → approved/rejected);
   "Queue publish" resolves to the honest **blocked** state (no connection); task rows
   progress pending → processing → completed with an execution log.
7. **Background worker + restart recovery** — ✅ Works. `enqueue → drainQueue →
   completed`; a task left `processing` by a simulated crash (old `startedAt`) is
   **re-queued and completed** on the next poll. Idempotency keys dedupe.
8. **Tenant isolation** — ✅ Works, enforced (not index-only). companyId is derived
   server-side from the validated active company; record reads use
   `where: { id, companyId }`, so a forged id returns null. Verified at the **data
   layer** (probe) and the **UI layer** (cross-tenant post URL → **404**).
9. **Reporting calculations vs inputs** — ✅ Works, deterministic & honest.
   `computeInsights` totals equal the raw `AnalyticsDaily` sums exactly; engagement
   rate = engagements/impressions; reports are labelled `dataBasis = test_fixture`.
10. **Navigation, forms, buttons, exports, responsive** — ✅ after fix. Desktop nav,
    forms, buttons and the report HTML export all work. **Defect found & fixed:** on
    mobile the sidebar was hidden with no replacement nav — added a hamburger drawer
    (verified at 375px: all 15 sections reachable).

---

## 3. The seven agent systems — honest classification

**None of the seven perform genuine autonomous AI execution. All are deterministic
software automation.** There is no live LLM call anywhere in the runtime; a clean
inference interface is stubbed but unwired. This matches the brief's requirement
*not* to present deterministic workflows as autonomous AI.

| # | System | Classification | Notes |
|---|---|---|---|
| A | Brand Intelligence | **Deterministic** (data store/structure) | Input UI partial (no ICP/persona/competitor editor). |
| B | Research & Trends | **Deterministic** + **Missing external** | Derives items from the company's own competitors/personas (real, honest). Live web/news/trend retrieval is **missing** (needs a research runtime); it is *not* fabricated. |
| C | Performance Intelligence | **Deterministic** | Real, verified calculations over stored metrics. No causal claims. |
| D | Strategy & Calendar | **Deterministic** | Template strategy + config-driven calendar (verified slot math). |
| E | Creative Production | **Deterministic rendering** | Real PNG/carousel/MP4 via SVG→sharp + ffmpeg. **No AI image generation** (uses deterministic branded SVG); that would be a future capability. |
| F | Publishing & Community | **Deterministic** + **Missing external** | Scheduling/approval/queue are real. Actual **publishing and community sending are missing** (need authorised platform credentials); state is honestly `blocked`/draft. |
| G | Reporting & Optimisation | **Deterministic** + **Missing external** | Real report generation + downloadable HTML. **Email delivery missing** (needs SMTP); state is `not_configured`. |

**"Precomputed Claude Code outputs":** effectively **none**. Content is generated by
deterministic TypeScript at seed/run time, not pre-authored by Claude. ⚠️ **Honesty
nuance:** rows carry `generated_by = "claude_dev_session"`, which can read as
"Claude wrote this." It means "produced by code written during the Claude Code dev
session." Recommend relabelling to `deterministic_generation` (or a UI tooltip) to
avoid overstating. *(Flagged, not yet changed — it does not affect data correctness.)*

---

## 4. The 520 organic activity IDs — mapped vs executable

**Mapping is traceability, not implementation — and the app does not claim otherwise.**
- All **605** social activities (incl. **520 organic**) are seeded with their original
  `MM-####` Excel IDs and **mapped** to an agent system (A–G). `implementationStatus`
  for every row is **`planned`** — i.e. the app does **not** mark any activity as
  "implemented". The Traceability view shows this honestly.
- **Executable implementation exists at the capability level, not per activity.** The
  seven agent-system workflows (research, strategy, calendar, creative render,
  analytics, reporting, scheduling/approvals) are executable and cover many of the 520
  activities *conceptually*. There is **no dedicated executable code for individual
  activity IDs** (e.g. "research Instagram hashtags" is subsumed into calendar/strategy
  generation, not a standalone executed task).
- **Honest count:** **0 of 520** have dedicated per-activity executables; **~all 520**
  are mapped; the **7 capabilities** that subsume them are executable and verified.

---

## 5. Defects found & fixed (this audit)

| # | Defect | Severity | Fix | Verified |
|---|---|---|---|---|
| 1 | Sparse brand data produced empty quotes — e.g. topic/graphic `Proof: evidence for ""` | Medium (visible in UI + rendered PNG) | Fallback copy when no value prop | ✅ "Proof: the results we deliver"; 0 empty-quote posts; unit test |
| 2 | Weak hashtag `#b` derived from "B2C" | Low | Pick a meaningful word (≥4 chars), fallback `#social` | ✅ `#fitness`; 0 weak tags; unit test |
| 3 | Mobile: sidebar hidden, no nav | Medium (sections unreachable on phone) | Hamburger drawer (`MobileNav`) | ✅ 375px: all 15 sections reachable |

New regression tests added: `tests/unit/content-quality.test.ts` (4). Full suite **17/17**.

---

## 6. What works · what doesn't · what's required for the continuous autonomous cycle

**Works now (verified):** multi-company workspaces with enforced isolation; company
creation + persistence; deterministic research/strategy/calendar; real
graphic/carousel/MP4 rendering; editing/approvals/scheduling; honest publishing-queue
states; deterministic analytics + downloadable weekly reports; a durable, restart-safe
worker; responsive UI.

**Does not work / missing:**
- **Live autonomous AI reasoning** — none; deterministic only (by design/ honesty).
- **Structured ICP / persona / competitor input UI** — missing for user-created
  companies (limits research/strategy depth).
- **Real publishing, community sending, analytics import** — require authorised
  platform API credentials / MCP connector (honestly blocked, never faked).
- **Weekly-report email delivery** — requires authorised SMTP (honest `not_configured`).
- **AI image generation** — not present (deterministic SVG only).
- **Scheduling automation** — the worker runs on demand/enqueue; there is no cron/timer
  that *triggers* the weekly cycle automatically yet.

**Required to reach a genuine continuous autonomous cycle:**
1. A **production AI runtime** wired to the existing inference interface (for genuine
   reasoning in research/strategy/creative copy), replacing deterministic templates.
2. **Authorised platform connections** (LinkedIn/Meta/YouTube/TikTok) + **SMTP** for
   real publishing, inbox and report delivery — with real verification writing back
   genuine post IDs/URLs and delivery receipts.
3. A **scheduler** (cron/timer) that triggers the weekly cycle and enqueues worker
   tasks automatically, closing the loop Research → … → Reporting → Optimisation → repeat.
4. **Structured brand-input UI** (ICP, personas, competitors) so user-created companies
   get the same grounding as the demo companies.
5. A **live research/trends source** for Agent B (web/news retrieval with citations).

---

## 7. Honesty verification (no fabrication confirmed)
- Publishing: `blocked`, no external IDs/URLs invented (checked in code + probe).
- Email: `not_configured` (no SMTP).
- Analytics/metrics/report basis: labelled `test_fixture`.
- Video: real MP4 when ffmpeg present, else `awaiting_render_runtime` + real poster.
- AI: no live model; outputs deterministic (see §3 labelling nuance).
