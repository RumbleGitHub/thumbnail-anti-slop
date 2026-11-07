# Free AI benchmark (2026-11-07)

Source: `free-ai-live-2026-11-07.json`. LIVE calls to Cloudflare Workers AI (account on the Workers Free plan) through the dashboard session, POST /accounts/:id/ai/run/:model. Images sent as 768px JPEG data URIs (same as prepareImageForUpload). Real photos from Wikimedia Commons (PS2-Versions.jpg public domain; Feijoada_01.jpg CC BY-SA 3.0; Apple_iPhone_15_Pro.jpg CC BY-SA 4.0; Galaxy_S23.png CC BY-SA 4.0); synthetic thumbnails drawn on a canvas. Outputs below are verbatim except where 'note' says otherwise.

Scoring is deterministic over the recorded outputs; the pipeline step is a replay (no new API calls).

## Vision (ANALYZE question)

| Model | Subject correct | Text correct | Invented defects on real photos | Parsed by pipeline | Avg latency | Avg Neurons |
|---|---|---|---|---|---|---|
| @cf/meta/llama-4-scout-17b-16e-instruct | 6/6 | 2/2 | 0/4 | 6/6 | 1652.5 ms | 30 |
| @cf/mistralai/mistral-small-3.1-24b-instruct | 6/6 | 2/2 | 2/4 | 6/6 | 1545 ms | 21.9 |
| @cf/moondream/moondream3.1-9B-A2B | 0/6 | 0 | n/a | 0 | n/a | n/a (empty answers) |

Text comparison ignores trailing punctuation (see fixture note on the copied "?").

## Prompt rewrite (IMPROVE), replayed through improveWithFreeText

| Model | Accepted by guards | Exact text kept | Slop left in positive text | Invented domestic setting (raw output) | Portuguese change notes | Avg latency | Avg Neurons |
|---|---|---|---|---|---|---|---|
| @cf/meta/llama-3.1-8b-instruct-fp8-fast | 3/4 | 1/1 accepted | 0/3 | 2/4 | 0/4 | 873 ms | 3.8 |
| @cf/meta/llama-4-scout-17b-16e-instruct | 4/4 | 2/2 accepted | 0/4 | 0/4 | 4/4 | 3175 ms | 13.1 |

"Accepted by guards" counts rewrites that pass the exact-text and invented-domestic-setting checks; rejected ones fall back to the deterministic engine.

## Daily capacity at the default app cap (8,000 Neurons/day; free allocation 10,000)

- ANALYZE with free vision: about 266 per day (avg 30 Neurons).
- IMPROVE with the free text model: about 610 per day.
- CREATE reference checks: up to 3 images per generation, about 3x an ANALYZE call.
- Local pixel analysis and the deterministic engine: unlimited, no quota.
