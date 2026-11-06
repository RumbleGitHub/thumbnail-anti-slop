# NEXT_STEPS.md — Thumbnail Anti-Slop Task Backlog & Roadmap

> **Destination Agent**: Claude Code / Claude
> **Status**: Verified Backlog & Limitations
> **Date**: November 2026

This document lists real pending tasks, verified limitations, and technical debt found during the development handoff audit.

---

## 1. CONFIRMED BUGS & LINT WARNINGS

### 1.1 Unused Variable Warnings in `src/lib/simpleEngine/engine.ts`
During `npm run lint`, ESLint reports 4 `@typescript-eslint/no-unused-vars` warnings:
- `engine.ts:342`: `hasSceneRef` is assigned a value but never used in `resolveTargetAndSources`.
- `engine.ts:896`: `approachIndex` is assigned a value but never used in `buildScenePlan`.
- `engine.ts:1659`: `reserveSpaceForText` is assigned a value but never used in `planTypography`.
- `engine.ts:2173`: `realismLevel` is assigned a value but never used in `generateSimpleThumbnail`.

**Action**: Prefix with underscore (`_hasSceneRef`, etc.) or safely integrate into relevant branches without altering existing prompt generation behavior.

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
