# NEXT_STEPS.md — Thumbnail Anti-Slop Task Backlog & Roadmap

> **Destination Agent**: Claude Code / Claude
> **Status**: Verified Backlog & Limitations
> **Date**: November 2026

This document lists real pending tasks, verified limitations, and technical debt found during the development handoff audit.

---

## 0. CYCLE 1 FINDINGS (measured with `npm run lab`, see `tests/quality-lab/`)

Fixed in cycle 1: negated exclusions rewritten into "no clean neutral background" (OpenAI, Google, FLUX),
explicit bedroom/scenario forbidden by FLUX/Google, archetypes injecting fixture subjects (moss ruin for
food/portraits, retro consoles for any "vs", teardown for any device, Legion Go, "the map", "heavy armor"),
PS2/headset/celular not detected as hardware, offline Analyze presented as a real image inspection.

Fixed in cycle 2 (approved): **single CREATE pipeline.** `POST /api/ai/simple-create` now renders through
`generateSimpleThumbnail(body, { plan })` with its director-reconciled, complementary-enriched plan, so the API
runs the same path as every contract test (suite 32: 60/60 identical with complementary off and on; live API
60/60 identical). Route lab: 58 -> 42 FAIL. The route's error safety net no longer re-reads the consumed body.
`buildPromptFromScenePlan` keeps rendering edit tasks; its NEW_SCENE template is now unused by the app.
`tests/runtime-validation.mjs` expects a server started with `COMPLEMENTARY_ENGINES_ENABLED=true` (case 3 reads `debugInfo.theme`).

Fixed in cycle 3: **adapters receive the engine's new-scene locks** (`NewSceneSubject`). OpenAI, Google and FLUX
render the PESSOA face-only lock; all four render product fidelity (PRODUTO reference geometry only, never its
studio background); object-only scenes no longer get skin/expression/hand instructions. Edit tasks and callers
without `subject` are byte-identical. Lab: 42 -> 10 FAIL (engine, route and complementary modes), 0 regressions.

Fixed in cycle 4: **product names that appear only in the title reach the prompt** (`extractTitleNames`,
`resolveSceneDescription`) in every adapter, e.g. "(featuring iPhone 17 Pro and Galaxy S26 Ultra, as named in
the video title)". Conservative: a name needs a model signal (digits, iPhone-style casing, acronym or known brand
inside a multi-word name); lone brands ("Apple"), generic words ("Unboxing Gamer") and all-caps titles add nothing.
Never applied when a TARGET image locks the composition. Snapshots unchanged. Lab: 10 -> 2 FAIL in all modes.

Open, highest value first:
1. **Spatial Hierarchy Planner invents a creator in object-only scenes** (complementary mode): for
   "iPhone 17 Pro vs Galaxy S26 Ultra / os dois celulares lado a lado" it emits "Creator and Smartphone positioned
   in immediate foreground". The lab's invented-person check does not catch the "Creator and ..." wording yet.
2. **Midjourney has no text instruction for exact overlay text**, and reference images are not mapped to
   `--oref`/image prompts (reference names in text mean nothing to it). These are the 2 remaining lab failures.
3. **No game-cover fidelity instruction** for the flagship "PS2 + recognizable covers" request.
4. **Raw Portuguese idea text, including meta words ("sem cara de IA", "chamativo"), is pasted into English prompts.**
5. Touch targets of 26-30px on mobile (header tabs, history, secondary buttons).

---

## 1. CONFIRMED BUGS & LINT WARNINGS

### 1.1 Unused Variable Warnings — resolved
Verified on `b4f7cc0`: `npm run lint` reports no warnings. The four warnings previously listed here no longer exist.

---

## 2. UNVERIFIED USER FEEDBACK

### 2.1 UI Toggle for `--style raw` in Midjourney
- **Feedback**: Some users requested an explicit UI checkbox for Midjourney `--style raw` rather than relying on typing "use raw style" in extra instructions.
- **Current State**: Midjourney default is clean photographic visual language without forced `--style raw`, adhering to Anti-Slop principles.
- **Verification Needed**: Assess whether adding a discrete toggle in Advanced Settings improves usability without polluting the radical simplicity interface.

### 2.2 Square 1:1 Aspect Ratio Option
- **Feedback**: Creators requested 1:1 aspect ratio for YouTube Community tab posts and podcast thumbnails.
- **Current State**: System currently supports 16:9 (standard YouTube) and 9:16 (Shorts/Reels).
- **Verification Needed**: Verify user demand and ensure model aspect ratio hints support 1:1 across all target models.

---

## 3. MISSING PROVIDER CONFIGURATION

### 3.1 Production Multimodal API Keys
- **Status**: The production repository runs in offline deterministic mode (`AI_DIRECTOR_PROVIDER=auto` falls back to `localEngine: true`).
- **Required for External AI Director**:
  - `OPENAI_API_KEY`: Enables GPT-4o visual analysis of reference photos.
  - `GEMINI_API_KEY`: Enables Gemini 2.5 Flash visual analysis and optional `GeminiAuditor`.
- **Note**: The deterministic engine is 100% operational and passes all test suites without these keys.

### 3.2 Live Research Provider Adapter
- **Status**: `RESEARCH_PROVIDER` is currently set to `local` (or `mock` in test suites).
- **Requirement**: If live web fact retrieval is enabled in the future, implement an authenticated search provider adapter (e.g. Google Search Grounding) conforming to the `ResearchProvider` interface while strictly preserving ADR-05 and ADR-06 security controls.

---

## 4. TECHNICAL DEBT

### 4.1 Transitive `minimatch` Vulnerabilities in `eslint-config-next`
- **Issue**: `npm audit` reports 8 moderate vulnerabilities in `minimatch` via `@typescript-eslint/typescript-estree` inside `eslint-config-next`.
- **Reason Left As-Is**: Resolving via `npm audit fix --force` would downgrade `eslint-config-next` to version 15, breaking Next.js 16 compatibility.
- **Resolution Path**: Monitor Next.js releases for an updated `eslint-config-next` 16 patch that bumps `@typescript-eslint` dependencies.

### 4.2 Prototype Modules Retained in Codebase
- **Issue**: `src/components/layout/` and `src/components/modules/` contain exploratory components from the early design phase. Production exclusively uses `src/components/simple/`.
- **Resolution Path**: Retain for historical reference or safely archive into a dedicated `legacy/` directory during a future cleanup milestone.

### 4.3 Unused API Route `/api/ai/compare-thumbnails`
- **Issue**: Early prototype route for side-by-side thumbnail comparison is not wired into the simple 3-mode UI.
- **Resolution Path**: Either connect to a comparison workflow or document as an experimental endpoint.

---

## 5. OPTIONAL FUTURE IMPROVEMENTS

### 5.1 In-App Toggle for Complementary Engines
- **Concept**: Add an advanced toggle in `ModeCreate.tsx` allowing creators to opt-in to experimental complementary engines without changing server environment variables.
- **Prerequisite**: Ensure server-side authorization and rate limiting.

### 5.2 Direct Inpainting Visual Mask Helper
- **Concept**: In `ANALISAR` mode, allow users to highlight the specific area with AI slop (e.g. glowing shoulder, waxy face) to produce an exact bounding box for inpainting generators.

### 5.3 Copy Feedback Toast
- **Concept**: Add a subtle toast notification when clicking "Copiar Prompt" or "Copiar Direção" to confirm clipboard copy on mobile devices.
