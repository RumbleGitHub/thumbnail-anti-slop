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
- **Global ledger**: every call first reserves its worst-case Neurons in the `FREE_AI_BUDGET`
  Durable Object (`src/lib/ai/free/budgetDurableObject.ts`, SQLite-backed, included in the Workers
  Free plan). One object serves the whole account and handles one call at a time, so concurrent
  requests and multiple Worker instances share the same counter. After the call the reservation is
  replaced by the real `usage.neurons`. If the ledger cannot be reached the model is **not** called
  (fail closed). Previews get their own Durable Object namespace (their own ledger).
- `FREE_AI_DAILY_NEURONS` (default 8000, hard ceiling 9500 in code; previews 2000) and
  `FREE_AI_MAX_REQUESTS_PER_MINUTE` (default 20; previews 10) are enforced in that ledger.
  `max_tokens` on every call, 20 s timeout, at most 3 reference images per CREATE.
- A quota/limit error from the platform locks the free layer until 00:00 UTC.
- Without the Durable Object (unit tests, `next dev`) the same ledger runs in-process, booked with no
  `await` between check and reservation (no in-isolate race).
- **What Cloudflare guarantees**: on the Workers **Free** plan the account gets 10,000 Neurons/day and
  "further operations will fail with an error" beyond it (Workers AI pricing page); there is no
  overage billing on Free. This account is on Free (dashboard, 2026-11-07). On Workers **Paid**,
  overage is billed at $0.011 / 1,000 Neurons: the app ledger then becomes the only stop, and other
  Workers on the same account also draw from the same 10,000. Keep the Free plan, or add an
  account-level control before upgrading.

Evidence: unit suite 41 (50 concurrent requests on one shared ledger: exactly 7 calls fit, 43
blocked, model called 7 times; ledger down = model not called) and a run on the real runtime
(`wrangler dev`, real Durable Object in workerd, 8 concurrent requests with a 110-Neuron cap: 2
calls, 6 blocked; after settling to real usage, one more call fit).

Approximate daily capacity at 8,000 Neurons: ~260 ANALYZE, ~600 IMPROVE, or ~90 CREATE
generations with 3 reference images (they share the same pool).

## Privacy

- **"IA na nuvem" is off by default** (header switch, remembered per browser). It governs every
  external AI provider (free Workers AI and any owner-paid key): routes forward images or prompts to
  an AI service only when the request carries `allowCloudAi: true`.
- Cloud AI **off**: ANALYZE runs entirely in the browser (no request at all); CREATE and IMPROVE use
  only the deterministic engine; no image reaches any AI service. Verified on the real runtime (10-17
  ms responses, `aiAssist.provider = "none"`).
- Cloud AI **on**: the ANALYZE thumbnail, the IMPROVE prompt text and PRODUTO / CENÁRIO "meu
  ambiente" / IMAGEM_ALVO references go to the provider. **These images can contain faces**
  (thumbnails and target images usually do); the switch's text says so. Reference photos marked
  **PESSOA are never sent to free models** (they add nothing: face ownership is decided by local
  rules). A Gemini key flagged `GEMINI_FREE_TIER=true` never receives PESSOA photos or thumbnails.
- Prompts never ask the model to identify people (Llama 4 AUP 1.e).
- Before upload, images are re-encoded to 768 px JPEG in the browser, which also strips EXIF/GPS.

## Where each result comes from (shown to the creator)

- ANALYZE: "heurísticas de pixels no navegador (... não reconhece pessoas, objetos nem texto)",
  "IA na nuvem gratuita + heurísticas", "IA configurada", or "lista genérica do motor determinístico".
- IMPROVE: "IA na nuvem gratuita + motor anti-slop", "IA configurada", or "motor anti-slop
  determinístico (sem IA)".
- CREATE: the prompt always comes from the deterministic engine; the line says whether references
  were also checked by cloud AI.
- When cloud AI was on but not used, the reason is shown (daily limit, timeout, error, answer
  rejected by a guard...).

The browser-only analysis is **pixel heuristics** (contrast, exposure, saturation, neon share, edge
density, center focus measured at feed size). It does not understand the image semantically.

## License (Llama 4 Scout)

`@cf/meta/llama-4-scout-17b-16e-instruct` is under the Llama 4 Community License and Acceptable
Use Policy (linked from the Cloudflare model page). It is not among the models that need a paid
billing method; it ran on this Free account. Obligations applied here: "Built with Llama" is shown
wherever its output is used; prompts forbid identifying people. Note: the AUP does not grant
multimodal Llama 4 rights to individuals domiciled in, or companies with a principal place of
business in, the EU (end users of a product are excluded from that restriction). Over 700 million
monthly active users requires a separate license from Meta.

## When the free quota is exhausted

Still available, unchanged and unlimited: the deterministic engine for CREATE/IMPROVE, the local
pixel analysis for ANALYZE, all prompt adapters, history and the Quality Lab. Lost until 00:00 UTC:
the AI-observed defects/text in ANALYZE, the AI rewrite step in IMPROVE and the reference checks in
CREATE. The UI says why. Nothing is billed on the Free plan.

## Test evidence types

- **Simulated** (unit suites 40-41): fake `AI` binding and ledger stub; limits, concurrency,
  privacy, ownership, fallbacks.
- **Live, dashboard** (recorded fixture): real Workers AI calls on 2026-11-07, used for model choice.
- **Replay** (`npm run lab:free-ai`): recorded live outputs through the real pipeline, offline.
- **Live, real runtime** (2026-11-07): the built Worker (`opennextjs-cloudflare build` +
  `cloudflare-worker.ts`) under `wrangler dev` (workerd, real Durable Object, remote Workers AI via the
  OAuth token Wrangler already had on this machine): IMPROVE 3/3, ANALYZE on a real photo, CREATE
  with PESSOA + PRODUTO references (only the product sent), all with real model answers.
- **Browser-local**: pixel analysis in the app with real photos (no request made).
- **Not yet done**: the same checks on a deployed Cloudflare Preview (needs push + preview build).
