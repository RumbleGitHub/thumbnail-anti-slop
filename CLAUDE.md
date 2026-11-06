# CLAUDE.md — Thumbnail Anti-Slop Development & Operating Guide

> **Primary Development Agent**: Claude Code / Claude
> **Status**: Production Reference & Handoff Baseline
> **Last Updated**: November 2026

Welcome, Claude. Before touching any code, reading any issue, or accepting any development prompt, you **must** review this document and execute the **FIRST SESSION CHECKLIST** in Section G.

---

## A. WHAT THIS PROJECT IS

**Thumbnail Anti-Slop** is a specialized, production-ready Next.js application designed to create, improve, and audit YouTube thumbnail visual prompts for modern AI image generators (OpenAI GPT Image 2.5 Sunburst & Flare, Google Nano Banana 2 & Pro, Midjourney V8.2 & Niji 7, FLUX.2 Max/Pro/Flex/Klein, and neutral general models).

### Product Philosophy
- **User intent is sovereign**: What the creator types and requests is the ultimate guiding anchor.
- **AI organizes and improves without substituting**: The system structures and translates ideas into professional photographic and physical direction; it never replaces the user's concept with a generic algorithm formula.
- **Composition must have a reason**: Visual impact stems from intentional spatial hierarchy, scale, proximity, crop tightness, and foreground priority—not from decorative artificial effects.
- **Visual fidelity matters**: Real hardware (PlayStation 2, handhelds, keyboards, mics) must retain authentic industrial geometry, ports, buttons, and finishes. Real game covers must not be hallucinated into generic artwork.
- **Natural-looking images over artificial spectacle**: The system deliberately prefers motivated real-world lighting, honest human expressions (closed mouth, natural curiosity or frustration), and physical skin textures over plastic waxy smoothing.
- **No generic AI-thumbnail formula**: No neon magenta/cyan rims, no floating fire embers, no gaping mouths ("YouTube shock face"), no arbitrary floating arrows or red circles.
- **No unnecessary interface complexity**: Radical simplicity. All deep reasoning, multi-tier authority, and provenance guarding operate silently in the engine.

### The Three Primary Modes
1. **CRIAR (Create — Main Mode)**:
   - Inputs: Video title, natural conversational idea description, optional thumbnail text (with 4-word alert), reference images with assigned roles (`PESSOA`, `PRODUTO`, `CENÁRIO`, `ESTILO`, `COMPOSIÇÃO`, `TIPOGRAFIA`, `IMAGEM_ALVO`), optional advanced target model & style presets.
   - Outputs: 5 concise visual decisions (`ideia`, `foco`, `composicao`, `expressao`, `visual`), a photographic provider-adapted English prompt, typography plan, approach variant cycling, and full ScenePlan metadata.
2. **MELHORAR PROMPT (Improve / Purify)**:
   - Inputs: Noisy user prompt polluted with AI slop cliches (`"epic gaming thumbnail, 8k, highly detailed, dramatic neon glow, shock face..."`).
   - Outputs: 3 to 6 educational pedagogical change explanations and a purified prompt translated into camera, physical lighting, and focal language.
3. **ANALISAR THUMBNAIL (Analyze — Ethical Optical Audit)**:
   - Inputs: 1 uploaded thumbnail image (+ optional video title).
   - Outputs: "O que está funcionando" (max 3), "O que está deixando com cara de IA" (max 3), "Maior problema" (1 priority issue), and a surgical inpainting/re-render `fixPrompt`. **Refuses fake numerical CTR scores or vanity metrics.**

---

## B. NON-NEGOTIABLE DEVELOPMENT RULES

As the primary development agent, Claude must adhere strictly to these principles:

1. **Inspect existing implementation before editing**: Always read the target files and relevant tests before modifying code.
2. **Preserve working behavior**: Never break existing features, valid prompts, or existing tests.
3. **Make incremental, surgical changes**: Avoid broad rewrites, massive reorganizations, or touching files outside the agreed mission scope.
4. **Reuse existing abstractions**: Extend types in `src/types/simple.ts`, logic in `src/lib/simpleEngine/engine.ts`, and complementary planners rather than inventing ad-hoc structures.
5. **Never create a parallel engine**: Do not build an alternative reasoning pipeline. All generation flows through `buildScenePlan` -> `reconcileDirectorWithLocalRules` -> complementary planners -> `buildPromptFromScenePlan` -> `auditPromptProvenance`.
6. **Preserve reference ownership and provenance**: Reference isolation is sacred. A `PESSOA` reference must never donate room geometry; a `PRODUTO` reference must never donate studio backgrounds; an environment reference in `REFERENCIA_AMBIENTE` mode must never donate physical architecture.
7. **Never weaken existing validation to make tests pass**: Tests in `tests/run-tests.mjs` represent architectural contracts (byte-by-byte snapshots, prompt injection safety, authority order). Fix implementation regressions, never loosen test assertions.
8. **Distinguish implemented, configured, tested, and deployed features**:
   - *Implemented*: Exists in code.
   - *Configured*: Environment variables or credentials are set and active.
   - *Tested*: Validated by automated or explicit manual execution.
   - *Deployed*: Published and live in the production target.
9. **Never claim a real provider test based only on a mock**: When API keys are absent, unit tests verify fallback behavior. State clearly when an external provider call was mocked or skipped.
10. **Never claim deployment without independent verification**: Verify live endpoints before claiming production availability.
11. **Every mission must have defined scope and acceptance criteria**: Establish the current Git baseline before starting and verify with `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.

---

## C. EXISTING ARCHITECTURE

The application runs on Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4.

### 1. Intent Router & Task Classification
- **Source**: `src/lib/simpleEngine/engine.ts` (`classifyTask`, `resolveTargetAndSources`)
- **Task Types (`TaskType`)**:
  - `NEW_SCENE`: Generation from scratch based on user description and reference attributes.
  - `IDENTITY_TRANSFER`: Exact face/identity transplanted onto a target image subject.
  - `REPLACE_OBJECT`: Product or object swapped into a target image without touching person or background.
  - `CHANGE_ENVIRONMENT`: Background/scenery modified while locking subject, pose, and lighting.
  - `EXPRESSION_CHANGE`, `LIGHTING_TRANSFER`, `STYLE_TRANSFER`, `COMPOSITION_TRANSFER`, `MULTI_EDIT`.

### 2. Target / Source Resolution & Reference Authority
- **Roles (`SimpleReferenceRole` in `src/types/simple.ts`)**:
  - `IMAGEM_ALVO` (`TARGET_IMAGE`): Structural master anchor for edit tasks. Owns framing, pose, and lighting baseline.
  - `PESSOA` (Person): Locks bone structure, eye shape, age, skin texture.
  - `PRODUTO` (Product): Locks physical geometry, ports, buttons, matte/gloss finish.
  - `CENÁRIO` (Environment):
    - `MEU_AMBIENTE`: User's real room; locks physical architecture, walls, doors, layout.
    - `REFERENCIA_AMBIENTE`: Atmospheric mood reference only; geometry is explicitly discarded.
  - `ESTILO` (Style): Color palette, contrast, and mood only.
  - `COMPOSIÇÃO` (Composition): Scale, framing, and proximity hierarchy only.
  - `TIPOGRAFIA` (Typography): Visual personality anchor for graphic overlays.
- **Attribute Ownership (`AttributeOwner`)**:
  - Independent ownership: `faceOwner`, `hairOwner`, `beardOwner`, `bodyOwner`, `poseOwner`, `headAngleOwner`, `clothingOwner`, `armorOwner`, `propsOwner`, `handsOwner`, `productOwner`, `environmentOwner`, `lightingOwner`, `compositionOwner`, `styleOwner`.
  - Anti-Face-Paste: In `IDENTITY_TRANSFER`, face, hair, and beard are reconciled independently so the subject seamlessly merges with the target neck/lighting without looking like a cutout sticker.

### 3. ScenePlan & Provenance Guard
- **`ScenePlan` Structure (`src/types/simple.ts`)**:
  Central data contract representing the resolved shot: task classification, subjects, reference bindings, attribute owners, physical interaction, spatial hierarchy, change/preserve/avoid arrays, and provenance origin maps.
- **CHANGE / ADAPT / PRESERVE Framework**:
  - `change`: Explicit modifications requested by user or required by task.
  - `adapt`: Necessary physical adjustments (finger grips, light bounce, neckline transition).
  - `preserve`: Elements strictly protected from modification (unrequested lighting changes, reference hardware details).
- **Provenance Guard (`auditPromptProvenance` in `src/lib/simpleEngine/engine.ts`)**:
  Audits the generated prompt before returning it to the user. Strips unsupported defaults (hallucinated bedrooms, sofas, gaming desks) and verifies that every visual fact maps to an authoritative provenance origin (`USER_EXPLICIT`, `TARGET_IMAGE`, `ASSIGNED_REFERENCE`, `WEB_RESEARCH`, `NECESSARY_ADAPTATION`, `JUSTIFIED_INFERENCE`).

### 4. Typography Planning
- **Source**: `src/lib/simpleEngine/engine.ts` (`planTypography`)
- Preserves exact user text casing and spelling.
- Enforces the **4-Word Rule** (warns if text exceeds 4 words for mobile thumbnail readability).
- Recommends font personality, weight, high-contrast positioning (e.g. upper third or reserved side space), and negative space protection.

### 5. Model-Aware Prompt Rendering & Provider Adapters
- **Source**: `src/lib/simpleEngine/engine.ts` (`renderPromptForTargetModel`)
- Adapts prompt structure dynamically per target generator:
  - `OPENAI_GPT_IMAGE_2_5_SUNBURST` & `FLARE`: Structured contract prompt with explicit constraints and JSON-like clarity.
  - `MIDJOURNEY_V8_2` & `NIJI_7`: Photographic descriptors, aspect ratio flag (`--ar 16:9`), `--style raw` applied only when requested or appropriate.
  - `FLUX_2_MAX` / `PRO` / `FLEX` / `KLEIN`: Direct natural positive language without negative clutter.
  - `GOOGLE_NANO_BANANA_2` & `PRO`: Natural multi-reference descriptions emphasizing character and object fidelity.
  - `GERAL`: Clean, provider-agnostic, balanced photographic prompt.

### 6. Multimodal AI Director & Optional Auditor
- **Source**: `src/lib/ai/` (`orchestrator.ts`, `director/openaiDirector.ts`, `director/geminiDirector.ts`, `auditor/geminiAuditor.ts`)
- **Director**: Extracts visual facts from uploaded images when API keys are configured (`AI_DIRECTOR_PROVIDER=auto`).
- **Deterministic Reconciliation**: `reconcileDirectorWithLocalRules` ensures AI Director observations can *never* override local safeguards or user intent.
- **Auditor (Gemini)**: Optional second-pass auditor that inspects the proposed prompt for reference leakage or slop risks without rewriting prompts directly.
- **Deterministic Offline Guarantee**: When no API keys are present, the local deterministic engine runs 100% of workflows with zero latency, zero errors, and full test suite passing.

---

## D. COMPLEMENTARY ENGINES

Located in `src/lib/simpleEngine/`, the four complementary engines enrich missing shot context:

1. **Theme Context Resolver (`themeResolver.ts`)**:
   - Resolves narrative/thematic world context when omitted (e.g. *Crimson Desert* evokes rugged medieval arid terrain instead of defaulting to a suburban gaming room).
   - Rejects spurious domestic clutter.
2. **Grounded Research Broker (`researchBroker.ts`)**:
   - Non-blocking visual fact retrieval for physical products, fictional game worlds, public landmarks, and vehicle models.
   - **Privacy Guarantee**: Blocked unconditionally for `PERSON`, biometric data, personal names, addresses, or private businesses. Never receives user photos or freeform prompts.
   - Strict 240-character limit per fact, entity match validation, prompt injection sanitization, 4-second timeout.
3. **Physical Interaction Planner (`interactionPlanner.ts`)**:
   - Resolves realistic ergonomic hand grips and anatomical interactions for handhelds, controllers, and tools.
   - Prevents "pinching" or floating fingers. Respects explicit user poses or target image poses as absolute authority.
4. **Spatial Hierarchy Planner (`spatialHierarchyPlanner.ts`)**:
   - Establishes scale, proximity, crop tightness, and foreground priority for 120px mobile thumbnail readability.
   - Enforces the 3-tier hierarchy: Primary Subject > Hero Object/Covers > Subordinate Inventory.
   - **Crucial Rule: ZERO authority over lighting.** Never relights or injects cinematic effects.

### Complementary Activation & Gating Flags
- **Master Kill Switch**: `COMPLEMENTARY_ENGINES_ENABLED=false` (in `.env.example`). When `false`, the entire complementary layer is completely bypassed, producing byte-by-byte baseline identical output.
- **Subordinate Research Flag**: `RESEARCH_ENABLED=false`. Research requires BOTH `COMPLEMENTARY_ENGINES_ENABLED=true` AND `RESEARCH_ENABLED=true`.

### Strict Precedence Order (Authority Hierarchy)
$$\text{USER\_EXPLICIT} > \text{TARGET\_IMAGE} > \text{ASSIGNED\_REFERENCE} > \text{WEB\_RESEARCH} > \text{NECESSARY\_ADAPTATION} > \text{JUSTIFIED\_INFERENCE}$$

If any field has been authoritatively resolved by an earlier tier, complementary planners act as a strict **NO-OP**.

---

## E. ANTI-SLOP RULES

The engine strictly rejects:
- **No automatic cinematic lighting**: Motivated, directional, realistic photographic light only.
- **No arbitrary glow, HDR, particles, or volumetric fog**: Keep backgrounds clean for thumbnail readability.
- **No random arrows or circles**: Graphic elements must be purposeful, not clickbait debris.
- **No forced shocked expressions**: Relaxed jaw, closed mouth, authentic engagement.
- **No plastic waxy skin**: Real skin pores, natural subsurface scattering, authentic micro-textures.
- **No fake product geometry**: Authentic buttons, ports, cooling vents, and matte factory textures.
- **No invented game covers**: When multiple covers are present, hero covers are prioritized and secondary covers are subordinated without inventing fake art.
- **No unsupported room/desk/sofa defaults**: Never assume the creator is in a generic bedroom streamer setup.
- **No forced shallow depth of field**: Ensure products and facial expressions remain sharp and readable.
- **Lighting Preservation Rule**: For edits or improvements of existing images, preserve the original lighting baseline unless the user explicitly requests relighting.

---

## F. MODEL CATALOG AND ADAPTERS

Canonical configurations are defined in `src/types/simple.ts` (`TARGET_MODEL_CONFIGS`):

| Canonical ID | Provider | Group | Prompt Style | Key Characteristic |
|---|---|---|---|---|
| `GERAL` | `GENERAL` | `GERAL` | `neutral` | Agnostic, balanced, compatible across generators |
| `OPENAI_GPT_IMAGE_2_5_SUNBURST` | `OPENAI` | `OPENAI` | `structured_contract` | Maximum fidelity, strict preservation, 3840x2160 hint |
| `OPENAI_GPT_IMAGE_2_5_FLARE` | `OPENAI` | `OPENAI` | `structured_contract` | Fast daily iteration, 2048x1152 hint |
| `GOOGLE_NANO_BANANA_2` | `GOOGLE` | `GOOGLE` | `natural_multireference` | Multi-reference consistency, typography |
| `GOOGLE_NANO_BANANA_PRO` | `GOOGLE` | `GOOGLE` | `natural_multireference` | Professional fidelity, editorial lighting |
| `MIDJOURNEY_V8_2` | `MIDJOURNEY` | `MIDJOURNEY` | `concise_visual` | Photographic camera language, `--ar 16:9` |
| `MIDJOURNEY_NIJI_7` | `MIDJOURNEY` | `MIDJOURNEY` | `concise_visual` | Dynamic stylized illustration, `--ar 16:9` |
| `FLUX_2_MAX` | `BLACK_FOREST_LABS` | `FLUX` | `direct_natural_positive` | Uncompromising visual clarity, zero negative clutter |
| `FLUX_2_PRO` | `BLACK_FOREST_LABS` | `FLUX` | `direct_natural_positive` | Production balance, natural framing |
| `FLUX_2_FLEX` | `BLACK_FOREST_LABS` | `FLUX` | `direct_natural_positive` | Responsive composition |
| `FLUX_2_KLEIN` | `BLACK_FOREST_LABS` | `FLUX` | `direct_natural_positive` | Ultra-fast lightweight preview |

### Legacy Aliases
- `OPENAI` -> `OPENAI_GPT_IMAGE_2_5_SUNBURST`
- `GEMINI` / `GOOGLE_IMAGEN` -> `GOOGLE_NANO_BANANA_2`
- `MIDJOURNEY` -> `MIDJOURNEY_V8_2`
- `FLUX` -> `FLUX_2_PRO`

Migration helper `resolveTargetModel` in `src/lib/simpleEngine/history.ts` normalizes legacy aliases automatically.

### Adding a New Model Safely
1. Add identifier to `TargetModel` union in `src/types/simple.ts`.
2. Add metadata record to `TARGET_MODEL_CONFIGS` in `src/types/simple.ts`.
3. Add prompt rendering branch or map to appropriate `promptStyle` in `renderPromptForTargetModel` in `src/lib/simpleEngine/engine.ts`.
4. Add unit test assertions in `tests/run-tests.mjs`.

---

## G. FIRST SESSION CHECKLIST

When Claude starts any session or accepts a task on this repository, execute these steps in order:

```bash
# 1. Verify Git status and current branch
git status
git branch -a

# 2. Check current HEAD commit
git log -n 5 --oneline

# 3. Read the in-depth technical handoff and decision log
# - docs/CLAUDE_HANDOFF.md
# - docs/ARCHITECTURE_DECISIONS.md
# - docs/NEXT_STEPS.md

# 4. Verify test suite baseline before touching any files
npm test

# 5. Verify static typing and linting baseline
npx tsc --noEmit
npm run lint

# 6. Verify production build
npm run build
```

Only proceed with development after all baseline checks pass. If any check fails, resolve the baseline discrepancy first before undertaking new work.
