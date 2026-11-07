# Thumbnail Quality Lab report

Scope: deterministic checks over generated PROMPT text. No images were generated or inspected.

Complementary engines: false | pipeline: route

Runs: 62 | checks: 1236 | FAIL: 2 | WARN: 7

| Dimension | pass | fail | warn |
|---|---|---|---|
| intent | 474 | 1 | 0 |
| coherence | 142 | 0 | 0 |
| anti-slop | 484 | 0 | 0 |
| reference | 33 | 0 | 7 |
| product | 30 | 0 | 0 |
| typography | 60 | 1 | 0 |
| usability | 4 | 0 | 0 |

| Model | avg words | max words |
|---|---|---|
| GERAL | 442 | 629 |
| OPENAI_GPT_IMAGE_2_5_SUNBURST | 396 | 486 |
| GOOGLE_NANO_BANANA_2 | 200 | 283 |
| MIDJOURNEY_V8_2 | 67 | 83 |
| FLUX_2_PRO | 185 | 221 |

## Failures

- [intent] 03_product_with_reference / MIDJOURNEY_V8_2: includes:headset-pro-x
- [typography] 11_exact_portuguese_text / MIDJOURNEY_V8_2: exact-text-verbatim

## Warnings

- [reference] 01_ps2_covers / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 02_creator_in_game_world / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 05_person_holding_object / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 06_multi_element_hierarchy / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 07_explicit_bedroom / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 08_no_environment_conservative / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 11_exact_portuguese_text / MIDJOURNEY_V8_2: identity-guidance-present
