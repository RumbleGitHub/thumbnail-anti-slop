# Thumbnail Quality Lab report

Scope: deterministic checks over generated PROMPT text. No images were generated or inspected.

Complementary engines: false | pipeline: route

Runs: 62 | checks: 1236 | FAIL: 10 | WARN: 7

| Dimension | pass | fail | warn |
|---|---|---|---|
| intent | 466 | 9 | 0 |
| coherence | 142 | 0 | 0 |
| anti-slop | 484 | 0 | 0 |
| reference | 33 | 0 | 7 |
| product | 30 | 0 | 0 |
| typography | 60 | 1 | 0 |
| usability | 4 | 0 | 0 |

| Model | avg words | max words |
|---|---|---|
| GERAL | 442 | 629 |
| OPENAI_GPT_IMAGE_2_5_SUNBURST | 393 | 486 |
| GOOGLE_NANO_BANANA_2 | 198 | 283 |
| MIDJOURNEY_V8_2 | 66 | 83 |
| FLUX_2_PRO | 184 | 221 |

## Failures

- [intent] 03_product_with_reference / MIDJOURNEY_V8_2: includes:headset-pro-x
- [intent] 04_named_products_no_reference / OPENAI_GPT_IMAGE_2_5_SUNBURST: includes:iPhone 17 Pro
- [intent] 04_named_products_no_reference / OPENAI_GPT_IMAGE_2_5_SUNBURST: includes:Galaxy S26 Ultra
- [intent] 04_named_products_no_reference / GOOGLE_NANO_BANANA_2: includes:iPhone 17 Pro
- [intent] 04_named_products_no_reference / GOOGLE_NANO_BANANA_2: includes:Galaxy S26 Ultra
- [intent] 04_named_products_no_reference / MIDJOURNEY_V8_2: includes:iPhone 17 Pro
- [intent] 04_named_products_no_reference / MIDJOURNEY_V8_2: includes:Galaxy S26 Ultra
- [intent] 04_named_products_no_reference / FLUX_2_PRO: includes:iPhone 17 Pro
- [intent] 04_named_products_no_reference / FLUX_2_PRO: includes:Galaxy S26 Ultra
- [typography] 11_exact_portuguese_text / MIDJOURNEY_V8_2: exact-text-verbatim

## Warnings

- [reference] 01_ps2_covers / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 02_creator_in_game_world / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 05_person_holding_object / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 06_multi_element_hierarchy / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 07_explicit_bedroom / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 08_no_environment_conservative / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 11_exact_portuguese_text / MIDJOURNEY_V8_2: identity-guidance-present
