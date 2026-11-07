# CLAUDE_HANDOFF.md — Thumbnail Anti-Slop Comprehensive Technical Handoff

> **Destination Agent**: Claude Code / Claude
> **Status**: Production Reference Baseline
> **Repository**: `https://github.com/RumbleGitHub/thumbnail-anti-slop.git`
> **Default Branch**: `main`
> **Date**: November 2026

---

## 1. PROJECT PURPOSE & PRODUCT PHILOSOPHY

Thumbnail Anti-Slop is an operational Next.js application that produces, purifies, and audits YouTube thumbnail visual prompts for modern AI image generators.

### The Problem It Solves
Modern generative image models default to saturated, artificial clichés ("AI slop") when generating thumbnails:
- Exaggerated open-mouth gasping/screaming expressions ("YouTube face").
- Plastic/waxy skin smoothing ("beauty filters" and same-face syndrome).
- Unmotivated neon cyan/magenta rim lighting and lens flares.
- Floating fire embers, sparks, and particle clutter.
- Melted buttons, deformed handhelds, and extra fingers.
- Hallucinated domestic rooms (gaming bedrooms, RGB desks, sofas) when not requested.

### Sovereign Design Principles
1. **User intent is sovereign**: The creator's vision is the core anchor; AI never swaps it for an algorithmic template.
2. **AI organizes, clarifies, and guides**: It translates informal language into physical photography directives (aperture, lighting motivation, framing) without imposing unwanted tropes.
3. **Reasoned composition**: Visual impact is achieved through spatial hierarchy, scale, proximity, and foreground isolation—not decorative effects.
4. **Authentic visual fidelity**: Physical devices retain accurate ports, seams, and matte textures. Real game covers are preserved rather than replaced with AI hallucinations.
5. **Natural realism**: Motivated real-world lighting, honest human expressions (closed mouth, engaged gaze), and natural skin textures.
6. **No interface clutter (Radical Simplicity)**: Three intuitive modes (`CRIAR`, `MELHORAR`, `ANALISAR`). Complex authority reconciliation and provenance tracking operate entirely under the hood.

---

## 2. CURRENT IMPLEMENTATION STATUS

| Subsystem | File Path | Implementation Status | Test Coverage |
|---|---|---|---|
| **Intent Router & Task Classifier** | `src/lib/simpleEngine/engine.ts` | Complete & Deployed | Test Suite 15, 28 |
| **Reference Authority & Isolation** | `src/lib/simpleEngine/engine.ts` | Complete & Deployed | Test Suite 7, 19, 28 |
| **Provenance Guard & Anti-Slop Audit** | `src/lib/simpleEngine/engine.ts` | Complete & Deployed | Test Suite 2, 12, 14, 28 |
| **Target Model Catalog** | `src/types/simple.ts` | Complete & Deployed | Test Suite 21, 22, 23, 24 |
| **Provider Prompt Adapters** | `src/lib/simpleEngine/engine.ts` | Complete & Deployed | Test Suite 14, 21-24 |
| **Theme Context Resolver** | `src/lib/simpleEngine/themeResolver.ts` | Complete & Gated (`COMPLEMENTARY_ENGINES_ENABLED`) | Test Suite 27, 28 |
| **Grounded Research Broker** | `src/lib/simpleEngine/researchBroker.ts` | Complete & Gated (`RESEARCH_ENABLED`) | Test Suite 27, 28 |
| **Physical Interaction Planner** | `src/lib/simpleEngine/interactionPlanner.ts` | Complete & Gated (`COMPLEMENTARY_ENGINES_ENABLED`) | Test Suite 27, 28 |
| **Spatial Hierarchy Planner** | `src/lib/simpleEngine/spatialHierarchyPlanner.ts` | Complete & Deployed (Committed in `616a20a`) | Test Suite 29, 30 |
| **Multimodal AI Director** | `src/lib/ai/director/openaiDirector.ts` & `geminiDirector.ts` | Complete (Requires API keys; 100% deterministic fallback) | Test Suite 11, 18 |
| **Optional Visual Auditor** | `src/lib/ai/auditor/geminiAuditor.ts` | Complete (Requires `ENABLE_VISUAL_AUDITOR=true`) | Test Suite 18 |
| **Frontend UI (3 Modes)** | `src/components/simple/` | Complete & Deployed | End-to-end verified via Next.js build |

---

## 3. REPOSITORY STRUCTURE

```
thumbnail-anti-slop/
├── .env.example                     # Reference environment variables
├── package.json                     # Next.js 16.4.5, React 19.3.1, TypeScript 5, Tailwind 4
├── package-lock.json                # Reproducible dependency lockfile
├── tsconfig.json                    # Strict TypeScript configuration
├── eslint.config.mjs                # ESLint 9 configuration
├── next.config.ts                   # Next.js 16 App Router configuration
├── postcss.config.mjs               # Tailwind PostCSS configuration
├── README.md                        # Product overview and user documentation
├── CLAUDE.md                        # Claude root development guide
├── docs/
│   ├── CLAUDE_HANDOFF.md            # This technical handoff document
│   ├── ARCHITECTURE_DECISIONS.md    # Historical decision log and rationale
│   └── NEXT_STEPS.md                # Real pending work and future roadmap
├── tests/
│   ├── run-tests.mjs                # 30 comprehensive test suites (native Node test runner)
│   └── fixtures/
│       ├── create-sample.mjs        # Fixture generator script
│       └── sample-thumbnail.png     # 640x360 test fixture image
├── public/                          # Static assets and icons
└── src/
    ├── app/
    │   ├── layout.tsx               # Root HTML shell & viewport metadata
    │   ├── page.tsx                 # Main application page hosting 3 modes
    │   ├── globals.css              # Dark theme styling and Tailwind utilities
    │   └── api/
    │       ├── ai/
    │       │   ├── status/route.ts          # GET /api/ai/status (director & auditor state)
    │       │   ├── simple-create/route.ts   # POST /api/ai/simple-create (main pipeline)
    │       │   ├── simple-improve/route.ts  # POST /api/ai/simple-improve (prompt purifier)
    │       │   └── simple-analyze/route.ts  # POST /api/ai/simple-analyze (optical auditor)
    │       └── youtube/status/route.ts      # Stub for optional YouTube metadata
    ├── components/
    │   ├── simple/                  # Active Production UI Components
    │   │   ├── Header.tsx           # Mode tabs (CRIAR, MELHORAR, ANALISAR) & status pill
    │   │   ├── ModeCreate.tsx       # Mode 1: Create form, reference tags, result cards
    │   │   ├── ModeImprove.tsx      # Mode 2: Prompt purifier input and change breakdown
    │   │   ├── ModeAnalyze.tsx      # Mode 3: Visual audit upload and surgical fixPrompt
    │   │   └── HistoryModal.tsx     # Client-side prompt history browser (localStorage)
    │   ├── layout/ & modules/       # Prototype / Exploration modules preserved for reference
    ├── context/                     # Optional prototype state context
    ├── data/                        # Anti-slop catalogs, checklists, glossary
    ├── lib/
    │   ├── ai/                      # AI Director & Auditor Infrastructure
    │   │   ├── types.ts             # VisualDirector, VisualAuditor interfaces
    │   │   ├── orchestrator.ts      # Provider cascade and director reconciliation
    │   │   ├── director/
    │   │   │   ├── openaiDirector.ts # GPT-4o multimodal visual analyzer
    │   │   │   └── geminiDirector.ts # Gemini 2.5 Flash multimodal analyzer
    │   │   └── auditor/
    │   │       └── geminiAuditor.ts  # Gemini prompt leakage auditor
    │   └── simpleEngine/            # Core Deterministic Reasoning Engine
    │       ├── engine.ts            # Intent classification, ScenePlan, prompt generation
    │       ├── complementaryMerge.ts # Non-destructive merge of complementary plans
    │       ├── themeResolver.ts     # Thematic world & narrative environment resolver
    │       ├── researchBroker.ts    # Grounded fact lookup with privacy guard
    │       ├── interactionPlanner.ts # Physical handgrip and anatomy interaction planner
    │       ├── spatialHierarchyPlanner.ts # Mobile 120px scale and proximity planner
    │       └── history.ts           # Browser localStorage history & model alias resolution
    └── types/
        ├── simple.ts                # Single Source of Truth for engine and model types
        └── index.ts                 # Legacy prototype types
```

---

## 4. ARCHITECTURE DIAGRAM (MERMAID)

```mermaid
flowchart TD
    User([User Request & References]) --> Router[Intent Router & Task Classifier]
    Router --> LocalBase[Baseline ScenePlan]

    subgraph Multimodal AI Director (Optional)
        LocalBase --> DirCheck{Director Configured & Images Present?}
        DirCheck -- Yes --> DirectorCall[OpenAI / Gemini Vision Director]
        DirCheck -- No / Fallback --> Reconcile
        DirectorCall --> Reconcile[Reconcile Director with Local Rules]
    end

    subgraph Complementary Engine Layer (Gated)
        Reconcile --> CompCheck{COMPLEMENTARY_ENGINES_ENABLED?}
        CompCheck -- Yes --> ThemeResolver[Theme Context Resolver]
        ThemeResolver --> ResCheck{RESEARCH_ENABLED & Candidate?}
        ResCheck -- Yes --> ResearchBroker[Grounded Research Broker]
        ResCheck -- No --> InteractionPlanner
        ResearchBroker --> InteractionPlanner[Physical Interaction Planner]
        InteractionPlanner --> SpatialPlanner[Spatial Hierarchy Planner]
        SpatialPlanner --> CompMerge[Non-Destructive Complementary Merge]
        CompCheck -- No (Default) --> CompMerge
    end

    subgraph Prompt Generation & Validation
        CompMerge --> PromptBuilder[Model-Aware Prompt Builder]
        PromptBuilder --> ProvenanceAudit[Provenance Guard & Anti-Slop Audit]
        ProvenanceAudit --> AuditorCheck{ENABLE_VISUAL_AUDITOR?}
        AuditorCheck -- Yes --> VisualAuditor[Gemini Visual Auditor]
        AuditorCheck -- No --> FinalResult
        VisualAuditor --> FinalResult([Final Prompt + 5-Point Direction + Metadata])
    end
```

---

## 5. REQUEST LIFECYCLE (USER INPUT TO FINAL PROMPT)

1. **Client POST to `/api/ai/simple-create`**:
   - Transmits `videoTitle`, `ideaDescription`, `thumbnailText`, `references`, `targetModel`, `aspectRatio`, `stylePreset`.
2. **Local Initial Classification**:
   - `buildScenePlan` classifies the task type (`NEW_SCENE`, `IDENTITY_TRANSFER`, etc.) and sets the baseline attribute owners (`faceOwner`, `productOwner`, etc.).
3. **Multimodal AI Director (if active)**:
   - Evaluates reference photos for physical features, setting, and objects.
   - `reconcileDirectorWithLocalRules` merges facts without overriding user instructions or local safeguards.
4. **Complementary Engines Pass (if enabled)**:
   - `resolveThemeContext`: Fills narrative setting if missing.
   - `ResearchBroker.resolve`: Fetches physical facts for products/game worlds (if enabled and eligible).
   - `planPhysicalInteraction`: Solves natural handgrips and poses if not specified.
   - `planSpatialHierarchy`: Formulates scale, proximity, and foreground emphasis for mobile readability.
   - `mergeComplementaryPlan`: Merges only into unfilled slots.
5. **Prompt Building**:
   - `buildPromptFromScenePlan` structures visual instructions and calls `renderPromptForTargetModel` to format for Midjourney, Flux, OpenAI, or Google.
6. **Provenance & Anti-Slop Audit**:
   - `auditPromptProvenance` strips hallucinated rooms, checks vocabulary, and records purged tokens.
7. **Optional Visual Auditor**:
   - If enabled and references exist, Gemini audits the prompt for background leakage.
8. **Client Response**:
   - JSON payload containing `direction` (5 points in Portuguese), `finalPrompt` (English photographic prompt), `approachTitle`, `typographyPlan`, `scenePlan`, and `outputMetadata`.

---

## 6. REFERENCE AUTHORITY & PROVENANCE RULES

### Authority Hierarchy
$$\text{USER\_EXPLICIT} > \text{TARGET\_IMAGE} > \text{ASSIGNED\_REFERENCE} > \text{WEB\_RESEARCH} > \text{NECESSARY\_ADAPTATION} > \text{JUSTIFIED\_INFERENCE}$$

### Reference Roles & Boundaries
- `PESSOA`: Locks facial identity, hair, beard, age, and natural skin. **Forbids** borrowing clothing, room furniture, or studio lights from this photo.
- `PRODUTO`: Locks physical proportions, buttons, vents, and factory texture. **Forbids** importing studio background reflections.
- `CENÁRIO`:
  - `MEU_AMBIENTE`: Real room; preserves architectural walls, doors, and layout.
  - `REFERENCIA_AMBIENTE`: Atmosphere only; layout is discarded.
- `ESTILO`: Visual tone, color grading, contrast. Never transfers identity.
- `COMPOSIÇÃO`: Framing, crop tightness, and foreground/background relationships.
- `IMAGEM_ALVO`: The structural base for inpainting/edits; pose and master framing are locked.

---

## 7. COMPLEMENTARY ENGINE INTEGRATION

All complementary engines reside in `src/lib/simpleEngine/`:

1. **Theme Context Resolver (`themeResolver.ts`)**:
   - Identifies named entities and thematic requirements (e.g. fantasy, sci-fi, tech).
   - Prunes domestic clutter (sofas, bedrooms) from non-domestic contexts.
2. **Grounded Research Broker (`researchBroker.ts`)**:
   - Evaluates strictly allowed entity categories (`PRODUCT`, `GAME_OR_FICTIONAL_WORLD`, `PUBLIC_PLACE_OR_LANDMARK`, `VEHICLE_MODEL`).
   - Unconditionally blocks `PERSON`, biometric identities, private names, addresses, and private businesses.
   - Sanitizes text against prompt injection (`<script>`, `system:`, `instruction:`, markdown links).
   - Caps facts at 240 characters and enforces a 4-second timeout.
3. **Physical Interaction Planner (`interactionPlanner.ts`)**:
   - Solves anatomical hand contact with tech gadgets, consoles, or tools.
   - Yields to explicit user pose or target image pose.
4. **Spatial Hierarchy Planner (`spatialHierarchyPlanner.ts`)**:
   - Determines subject scale, object scale, subject-object distance, crop tightness, and overlap strategy.
   - Enforces 3-tier hierarchy: Primary Subject > Hero Object/Covers > Subordinate Inventory.
   - **Zero authority over lighting**: Does not relight, brighten, or apply cinematic glow.

---

## 8. PROVIDER ARCHITECTURE

- **Orchestrator (`src/lib/ai/orchestrator.ts`)**:
  Manages provider selection via `AI_DIRECTOR_PROVIDER`:
  - `auto`: Attempts OpenAI GPT-4o if configured; falls back to Gemini 2.5 Flash; falls back to offline deterministic engine.
  - `openai`: Requires OpenAI API key.
  - `gemini`: Requires Gemini API key.
  - `local`: 100% deterministic local reasoning engine.
- **Auditor Cascade**:
  Gemini Auditor is invoked only when `ENABLE_VISUAL_AUDITOR=true` and `GEMINI_API_KEY` is present. It acts as an advisor and cannot rewrite prompts directly.

---

## 9. MODEL CATALOG & PROMPT ADAPTERS

Defined in `src/types/simple.ts` (`TARGET_MODEL_CONFIGS`) and formatted in `engine.ts` (`renderPromptForTargetModel`):

| Canonical Model ID | Prompt Adapter Style | Model-Specific Parameters |
|---|---|---|
| `GERAL` | `neutral` | Clean, photographic, provider-neutral |
| `OPENAI_GPT_IMAGE_2_5_SUNBURST` | `structured_contract` | Explicit constraints, JSON-like clarity, quality hints |
| `OPENAI_GPT_IMAGE_2_5_FLARE` | `structured_contract` | Rapid iteration structure, quality hints |
| `GOOGLE_NANO_BANANA_2` | `natural_multireference` | Natural multi-reference consistency description |
| `GOOGLE_NANO_BANANA_PRO` | `natural_multireference` | High-fidelity editorial visual language |
| `MIDJOURNEY_V8_2` | `concise_visual` | Camera language, `--ar 16:9`, `--style raw` only when requested |
| `MIDJOURNEY_NIJI_7` | `concise_visual` | Stylized illustration parameters, `--ar 16:9` |
| `FLUX_2_MAX` | `direct_natural_positive` | Pure positive phrasing, zero negative prompt tokens |
| `FLUX_2_PRO` | `direct_natural_positive` | Balanced natural framing, positive visual directives |
| `FLUX_2_FLEX` | `direct_natural_positive` | Responsive composition directives |
| `FLUX_2_KLEIN` | `direct_natural_positive` | Lightweight prompt structure |

---

## 10. API ROUTES & REQUEST/RESPONSE FLOW

### `POST /api/ai/simple-create`
- **Request**: `CreateThumbnailInput` (title, idea, references, targetModel, stylePreset, etc.).
- **Response**: `CreateThumbnailResult` with `direction` (5 points), `finalPrompt`, `approachTitle`, `typographyPlan`, `scenePlan`, and `outputMetadata`.

### `POST /api/ai/simple-improve`
- **Request**: `{ rawPrompt: string, targetModel?: TargetModel }`.
- **Response**: `ImprovePromptResult` with `changes` (3-6 educational points) and `improvedPrompt`.

### `POST /api/ai/simple-analyze`
- **Request**: `{ image: string, videoTitle?: string }`.
- **Response**: `AnalyzeThumbnailSimpleResult` with `functioning` (max 3), `aiLooking` (max 3), `topProblem`, and `fixPrompt`.

### `GET /api/ai/status`
- **Response**: Configuration status of local engine, multimodal director, and visual auditor.

---

## 11. FRONTEND MODES & COMPONENT RESPONSIBILITIES

Located in `src/components/simple/`:
- `Header.tsx`: Mode tab selector (`CRIAR`, `MELHORAR`, `ANALISAR`), History modal toggle button, engine status indicator.
- `ModeCreate.tsx`: Form for title, conversational description, text overlay with 4-word badge, reference uploader with role chips, advanced model accordion, and result card with copy button.
- `ModeImprove.tsx`: Input textarea for polluted prompts, "Remover o Slop" action button, pedagogical diff card, and purified prompt copy container.
- `ModeAnalyze.tsx`: Thumbnail dropzone, ethical audit result cards (what works, AI slop markers, top problem), and surgical `fixPrompt` generation.
- `HistoryModal.tsx`: Slide-over drawer displaying saved thumbnail runs from `localStorage` (`tas_simple_history_v1`) with 1-click prompt copy.

---

## 12. TEST ARCHITECTURE & FIXTURES

### Running Tests
```bash
npm test
```
The test suite runs using Node's native test runner (`node --experimental-strip-types tests/run-tests.mjs`) with zero external test framework dependencies.

### 30 Test Suites Overview
- **Suites 1–10**: Heuristics, checklist scoring, negative direction, A/B diversity, serialization, coordinate validation.
- **Suites 11–14**: AI provider fallback, 5-point direction, prompt purifier, Midjourney parameter validation.
- **Suites 15–18**: 4 core creation use cases, full community prompt purification, optical audit, visual PNG fixture.
- **Suites 19–25**: Reference isolation, typography planning, model catalog, OpenAI/Google/Midjourney/FLUX adapters.
- **Suites 26–28**: Complementary gating, research broker security/prompt injection tests (Tests A–N), 45 byte-by-byte snapshot verifications.
- **Suites 29–30**: Spatial hierarchy planning, mobile 120px readability, scale, proximity, and lighting preservation.

---

## 13. LOCAL DEVELOPMENT SETUP

```bash
# Clone the repository
git clone https://github.com/RumbleGitHub/thumbnail-anti-slop.git
cd thumbnail-anti-slop

# Install dependencies (Node >= 18 required, Node 24/26 validated)
npm ci

# Optional: configure local environment
copy .env.example .env.local

# Run development server
npm run dev

# Run full validation pipeline
npm test
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

---

## 14. ENVIRONMENT VARIABLES

Reference configuration in `.env.example`:

```env
# Multimodal AI Director
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
OPENAI_VISION_DETAIL=high

# Gemini Visual Auditor (Optional)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
ENABLE_VISUAL_AUDITOR=false

# Provider Cascade: auto | openai | gemini | local
AI_DIRECTOR_PROVIDER=auto

# Complementary Engines Pass (Master Kill Switch)
COMPLEMENTARY_ENGINES_ENABLED=false

# Complementary Grounded Research Broker (Subordinate Flag)
RESEARCH_ENABLED=false
RESEARCH_TIMEOUT_MS=4000
RESEARCH_PROVIDER=local
```

---

## 15. CLOUDFLARE DEPLOYMENT PROCESS

Thumbnail Anti-Slop is fully compatible with edge and serverless environments:
- Standard Next.js build: `npm run build` generates a standalone output.
- Cloudflare Pages / Workers: Can be deployed via `@cloudflare/next-on-pages` or OpenNext.
- Because all core logic is deterministic and uses Web standard APIs (`fetch`, `Request`, `Response`), it has zero native Node C++ bindings.

---

## 16. PRODUCTION VERIFICATION PROCEDURE

Before releasing changes:
1. Verify `npm test` passes all 30 test suites (0 failures).
2. Verify `npx tsc --noEmit` produces 0 type errors.
3. Verify `npm run lint` completes cleanly.
4. Verify `npm run build` compiles App Router pages and dynamic API routes successfully.
5. Verify server status endpoint returns `{ localEngine: true }`:
   ```bash
   curl.exe -s http://localhost:3000/api/ai/status
   ```
6. Verify `git diff --check` reports zero whitespace or conflict marker errors.

---

## 17. GIT WORKFLOW

- `main`: Production baseline. Protected.
- `feat/*`: New capabilities or model adapters.
- `fix/*`: Bug fixes or rule regressions.
- `chore/claude-project-handoff`: The dedicated development-agent handoff branch.

Rules:
- Never force-push to `main`.
- Never rewrite historical tags (e.g. `pre-complementary`).
- Create focused commits with conventional commit messages (`feat:`, `fix:`, `docs:`, `chore:`).

---

## 18. KNOWN LIMITATIONS

1. **Browser LocalStorage Quota**: Thumbnail history is stored in `localStorage`. Very large base64 image strings could reach storage limits (typically 5MB). Images are stored as URLs/references where possible.
2. **Offline Director**: Without API keys, visual feature extraction from reference photos relies on user tags (`PESSOA`, `PRODUTO`) rather than multimodal inspection. The engine handles this cleanly.
3. **External Research**: Grounded research is intentionally disabled by default (`RESEARCH_ENABLED=false`) for privacy and offline predictability.

---

## 19. UNFINISHED WORK

- Complementary Engine UI Toggle: UI settings accordion does not currently expose a direct toggle for `COMPLEMENTARY_ENGINES_ENABLED` (it is controlled via environment variables).
- Batch Thumbnail Comparison: API route `/api/ai/compare-thumbnails` exists as a stub from the early prototype phase and has not been integrated into the simple UI.

---

## 20. SAFE EXTENSION POINTS

1. **Adding a New Target Model**: Add entry to `TargetModel` and `TARGET_MODEL_CONFIGS` in `src/types/simple.ts`, map prompt rendering in `renderPromptForTargetModel` in `src/lib/simpleEngine/engine.ts`, and add test case in `tests/run-tests.mjs`.
2. **Adding a New Reference Role**: Extend `SimpleReferenceRole` in `src/types/simple.ts`, add role isolation rules in `engine.ts`, and update `ModeCreate.tsx` badge selector.
3. **Enhancing Spatial Hierarchy Rules**: Extend `planSpatialHierarchy` in `src/lib/simpleEngine/spatialHierarchyPlanner.ts` while preserving the rule that it holds zero authority over lighting.

---

## 21. COMMON REGRESSION RISKS

1. **Lighting Leaks in Spatial Edits**: When a user asks for "more impact" or "bigger products", do not inject cinematic lighting; adjust scale and crop only.
2. **Overriding Target Image Framing**: In edit tasks with an `IMAGEM_ALVO`, never change camera angle or framing unless explicitly asked.
3. **Domestic Setup Bias**: Never inject "gaming desk", "bedroom", or "living room" into prompts when the setting is unspecified.
4. **Weakening Snapshot Tests**: Test Suite 28 contains 45 byte-by-byte baseline checks. If an engine edit changes prompt wording for existing cases when complementary engines are disabled, it indicates an authority leak.
