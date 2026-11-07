# Thumbnail Quality Lab report

Scope: deterministic checks over generated PROMPT text. No images were generated or inspected.

Complementary engines: false | pipeline: route

Runs: 72 | checks: 1498 | FAIL: 0 | WARN: 1

| Dimension | pass | fail | warn |
|---|---|---|---|
| intent | 540 | 0 | 0 |
| coherence | 171 | 0 | 1 |
| anti-slop | 564 | 0 | 0 |
| reference | 62 | 0 | 0 |
| product | 85 | 0 | 0 |
| typography | 71 | 0 | 0 |
| usability | 4 | 0 | 0 |

| Model | avg words | max words |
|---|---|---|
| GERAL | 477 | 642 |
| OPENAI_GPT_IMAGE_2_5_SUNBURST | 419 | 494 |
| GOOGLE_NANO_BANANA_2 | 222 | 294 |
| MIDJOURNEY_V8_2 | 79 | 107 |
| FLUX_2_PRO | 208 | 280 |

## Failures


## Warnings

- [coherence] 16_exclusions_and_meta_words / MIDJOURNEY_V8_2: excluded:AI-generated look
