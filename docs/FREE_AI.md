# Zero-spend AI for Thumbnail Anti-Slop

Goal: real intelligence without a mandatory monthly AI bill. Everything here was checked on
2026-11-07 against official docs and, where marked **live**, with real calls on this project's
Cloudflare account (Workers **Free** plan).

## Architecture (smallest effective hybrid)

| Layer | Where it runs | Cost | Used for | Status |
|---|---|---|---|---|
| Deterministic Anti-Slop engine | Worker / browser | free, unlimited | CREATE, IMPROVE, ANALYZE fallback | permanent fallback |
| Local pixel analysis (`pixelAnalysis.ts`) | **browser** (canvas) | free, unlimited, nothing uploaded | ANALYZE: contrast, exposure, saturation, neon wash, clutter, focal point at feed size | new |
| Cloudflare Workers AI (`free/workersAi.ts`) | **free hosted** (Cloudflare) | 10,000 Neurons/day free | ANALYZE vision, IMPROVE rewrite, CREATE reference checks | new, opt-in |
| Owner-paid keys (OpenAI / Gemini) | hosted | paid by the owner | existing Director/Auditor | unchanged, takes precedence |

Order per request: paid key (if configured) → Workers AI (if enabled **and** the creator allowed it)
→ local pixels (ANALYZE) → deterministic engine. Any error, timeout, throttle or exhausted budget
falls through silently to the next layer.

Reused, not duplicated: `WorkersAIDirector` implements the existing `VisualDirector` contract and
goes through `reconcileDirectorWithLocalRules`; IMPROVE output still passes through the
deterministic `improvePrompt`; ANALYZE keeps the `AnalyzeThumbnailSimpleResult` shape (plus
`analysisSource`).

## Why Workers AI (and not the others)

- **No API key** (the Worker's `AI` binding), **no training on customer content, zero data
  retention** for standard inference (Workers AI data-usage page).
- **Free plan cannot be billed**: 10,000 Neurons/day; on Workers Free "further operations will
  fail with an error" (pricing page). This account is on Workers **Free** (dashboard → Workers plans,
  "Current plan: Free"). On Workers Paid the overage is billed at $0.011 / 1,000 Neurons, so the app
  also caps itself (below).
- **Gemini free tier**: inputs may be used to improve Google products and read by human reviewers;
  not allowed for apps serving EEA/CH/UK users. Kept only as an owner choice, with
  `GEMINI_FREE_TIER=true` blocking face photos and thumbnails.
- **GroqCloud free**: free limits not published on the docs page, needs an account key, vision
  models limited (one in preview). Not implemented; Workers AI covers text.
- **Transformers.js** (browser): captioning/CLIP need large model downloads per visitor and are
  weaker than Scout for thumbnail defects. Not adopted; local pixel metrics give the private,
  instant layer instead.
- **Tesseract.js** (browser OCR): Scout already reads overlay text (2/2 live, including "NÃO
  COMPRE"); local OCR would add several MB of downloads from third-party CDNs per visitor. Not adopted.

## Models (live benchmark, `npm run lab:free-ai`)

Recorded live outputs: `tests/quality-lab/fixtures/free-ai-live-2026-11-07.json`; report:
`tests/quality-lab/reports/free-ai-benchmark.md`.

| Model | ANALYZE subject | Text read | Invented defects on 4 real photos | Avg Neurons | Verdict |
|---|---|---|---|---|---|
| `@cf/meta/llama-4-scout-17b-16e-instruct` | 6/6 | 2/2 | 0/4 | 30 | **default (vision + text)** |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | 6/6 | 2/2 | 2/4 | 22 | cheaper, more false alarms |
| `@cf/moondream/moondream3.1-9B-A2B` | 0/6 | 0/2 | n/a | n/a | empty answers over the API |
| `@cf/meta/llama-3.2-11b-vision-instruct` | not run | | | | needs Meta license acceptance |

IMPROVE: Scout 4/4 accepted, exact text kept 2/2, change notes in Portuguese 4/4, ~13 Neurons,
~3 s. Llama 3.1 8B (~4 Neurons, <1 s) invented settings ("cozy living room", "outdoor") in 2/4 and
wrote notes in English; one rewrite was rejected by the guard.

Images must be **data URIs**: Workers AI rejects remote image URLs ("allowed domains: none").

## Hard limits (no automatic paid upgrade)

- Off unless `FREE_AI_PROVIDER=workers-ai` (set in `wrangler.jsonc` vars; remove to turn off).
- `FREE_AI_DAILY_NEURONS` (default 8000, hard ceiling 9500 in code), reserved per call before it
  runs, refunded with the real `usage.neurons` the API returns. Previews: 2000.
- `FREE_AI_MAX_REQUESTS_PER_MINUTE` (default 20; previews 10), `max_tokens` on every call, 20 s
  timeout, at most 3 reference images per CREATE.
- A quota/limit error from the platform locks the free layer until 00:00 UTC.
- Counters live in each Worker isolate (no storage): the platform's Free-plan hard stop is the
  authoritative guarantee; the app cap only stops earlier. **Do not upgrade to Workers Paid without
  adding an account-level limit** (e.g. AI Gateway rate limiting), or the app cap becomes the only
  protection.

Approximate daily capacity at 8,000 Neurons: ~260 ANALYZE, ~600 IMPROVE, or ~90 CREATE
generations with 3 reference images (they share the same pool).

## Privacy

- **Face photos (PESSOA) are never sent to any free model.** They add nothing (face ownership is
  decided by local rules) and are the most sensitive images.
- Sent to Workers AI only when the creator leaves "IA grátis" on (header toggle, remembered per
  browser): the ANALYZE thumbnail and PRODUTO / CENÁRIO "meu ambiente" / IMAGEM_ALVO references.
- Before upload, images are re-encoded to 768 px JPEG in the browser, which also strips EXIF/GPS.
- With the toggle off and no paid key, ANALYZE runs entirely in the browser (no request at all).
- The footer states which mode is active.

## When the free quota is exhausted

Still available, unchanged and unlimited: the deterministic engine for CREATE/IMPROVE, the local
pixel analysis for ANALYZE, all prompt adapters, history and the Quality Lab. Lost until 00:00 UTC:
the AI-observed defects/text in ANALYZE, the AI rewrite step in IMPROVE and the reference checks in
CREATE. Nothing errors and nothing is billed on the Free plan.

## Test evidence types

- **Simulated** (unit tests, suite 40): fake `AI` binding, limits, privacy, ownership, fallbacks.
- **Live** (recorded fixture): real Workers AI calls on 2026-11-07 via the dashboard session.
- **Replay** (`npm run lab:free-ai`): recorded live outputs through the real pipeline, offline.
- **Browser-local**: pixel analysis runs in the browser; checked in the app with real photos.
- **Not yet done**: an end-to-end run inside the deployed Worker (needs a preview deploy).
