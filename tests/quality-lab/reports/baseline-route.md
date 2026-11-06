# Thumbnail Quality Lab report

Scope: deterministic checks over generated PROMPT text. No images were generated or inspected.

Complementary engines: false | pipeline: route

Runs: 62 | checks: 1236 | FAIL: 42 | WARN: 19

| Dimension | pass | fail | warn |
|---|---|---|---|
| intent | 465 | 10 | 0 |
| coherence | 130 | 0 | 12 |
| anti-slop | 484 | 0 | 0 |
| reference | 26 | 7 | 7 |
| product | 6 | 24 | 0 |
| typography | 60 | 1 | 0 |
| usability | 4 | 0 | 0 |

| Model | avg words | max words |
|---|---|---|
| GERAL | 442 | 629 |
| OPENAI_GPT_IMAGE_2_5_SUNBURST | 360 | 486 |
| GOOGLE_NANO_BANANA_2 | 175 | 283 |
| MIDJOURNEY_V8_2 | 59 | 83 |
| FLUX_2_PRO | 165 | 216 |

## Failures

- [product] 01_ps2_covers / OPENAI_GPT_IMAGE_2_5_SUNBURST: product-fidelity-lock
- [product] 01_ps2_covers / GOOGLE_NANO_BANANA_2: product-fidelity-lock
- [product] 01_ps2_covers / MIDJOURNEY_V8_2: product-fidelity-lock
- [reference] 01_ps2_covers / FLUX_2_PRO: identity-guidance-present
- [product] 01_ps2_covers / FLUX_2_PRO: product-fidelity-lock
- [reference] 02_creator_in_game_world / FLUX_2_PRO: identity-guidance-present
- [product] 03_product_with_reference / OPENAI_GPT_IMAGE_2_5_SUNBURST: product-fidelity-lock
- [product] 03_product_with_reference / GOOGLE_NANO_BANANA_2: product-fidelity-lock
- [intent] 03_product_with_reference / MIDJOURNEY_V8_2: includes:headset-pro-x
- [product] 03_product_with_reference / MIDJOURNEY_V8_2: product-fidelity-lock
- [intent] 03_product_with_reference / FLUX_2_PRO: includes:headset-pro-x
- [product] 03_product_with_reference / FLUX_2_PRO: product-fidelity-lock
- [intent] 04_named_products_no_reference / OPENAI_GPT_IMAGE_2_5_SUNBURST: includes:iPhone 17 Pro
- [intent] 04_named_products_no_reference / OPENAI_GPT_IMAGE_2_5_SUNBURST: includes:Galaxy S26 Ultra
- [product] 04_named_products_no_reference / OPENAI_GPT_IMAGE_2_5_SUNBURST: product-fidelity-lock
- [intent] 04_named_products_no_reference / GOOGLE_NANO_BANANA_2: includes:iPhone 17 Pro
- [intent] 04_named_products_no_reference / GOOGLE_NANO_BANANA_2: includes:Galaxy S26 Ultra
- [product] 04_named_products_no_reference / GOOGLE_NANO_BANANA_2: product-fidelity-lock
- [intent] 04_named_products_no_reference / MIDJOURNEY_V8_2: includes:iPhone 17 Pro
- [intent] 04_named_products_no_reference / MIDJOURNEY_V8_2: includes:Galaxy S26 Ultra
- [product] 04_named_products_no_reference / MIDJOURNEY_V8_2: product-fidelity-lock
- [intent] 04_named_products_no_reference / FLUX_2_PRO: includes:iPhone 17 Pro
- [intent] 04_named_products_no_reference / FLUX_2_PRO: includes:Galaxy S26 Ultra
- [product] 04_named_products_no_reference / FLUX_2_PRO: product-fidelity-lock
- [reference] 05_person_holding_object / FLUX_2_PRO: identity-guidance-present
- [product] 06_multi_element_hierarchy / OPENAI_GPT_IMAGE_2_5_SUNBURST: product-fidelity-lock
- [product] 06_multi_element_hierarchy / GOOGLE_NANO_BANANA_2: product-fidelity-lock
- [product] 06_multi_element_hierarchy / MIDJOURNEY_V8_2: product-fidelity-lock
- [reference] 06_multi_element_hierarchy / FLUX_2_PRO: identity-guidance-present
- [product] 06_multi_element_hierarchy / FLUX_2_PRO: product-fidelity-lock
- [reference] 07_explicit_bedroom / FLUX_2_PRO: identity-guidance-present
- [reference] 08_no_environment_conservative / FLUX_2_PRO: identity-guidance-present
- [product] 11_exact_portuguese_text / OPENAI_GPT_IMAGE_2_5_SUNBURST: product-fidelity-lock
- [product] 11_exact_portuguese_text / GOOGLE_NANO_BANANA_2: product-fidelity-lock
- [product] 11_exact_portuguese_text / MIDJOURNEY_V8_2: product-fidelity-lock
- [typography] 11_exact_portuguese_text / MIDJOURNEY_V8_2: exact-text-verbatim
- [reference] 11_exact_portuguese_text / FLUX_2_PRO: identity-guidance-present
- [product] 11_exact_portuguese_text / FLUX_2_PRO: product-fidelity-lock
- [product] 12_simple_stays_simple / OPENAI_GPT_IMAGE_2_5_SUNBURST: product-fidelity-lock
- [product] 12_simple_stays_simple / GOOGLE_NANO_BANANA_2: product-fidelity-lock
- [product] 12_simple_stays_simple / MIDJOURNEY_V8_2: product-fidelity-lock
- [product] 12_simple_stays_simple / FLUX_2_PRO: product-fidelity-lock

## Warnings

- [reference] 01_ps2_covers / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 02_creator_in_game_world / MIDJOURNEY_V8_2: identity-guidance-present
- [coherence] 04_named_products_no_reference / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-human-attributes-without-person
- [coherence] 04_named_products_no_reference / GOOGLE_NANO_BANANA_2: no-human-attributes-without-person
- [coherence] 04_named_products_no_reference / MIDJOURNEY_V8_2: no-human-attributes-without-person
- [coherence] 04_named_products_no_reference / FLUX_2_PRO: no-human-attributes-without-person
- [reference] 05_person_holding_object / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 06_multi_element_hierarchy / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 07_explicit_bedroom / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 08_no_environment_conservative / MIDJOURNEY_V8_2: identity-guidance-present
- [reference] 11_exact_portuguese_text / MIDJOURNEY_V8_2: identity-guidance-present
- [coherence] 12_simple_stays_simple / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-human-attributes-without-person
- [coherence] 12_simple_stays_simple / GOOGLE_NANO_BANANA_2: no-human-attributes-without-person
- [coherence] 12_simple_stays_simple / MIDJOURNEY_V8_2: no-human-attributes-without-person
- [coherence] 12_simple_stays_simple / FLUX_2_PRO: no-human-attributes-without-person
- [coherence] 13_non_tech_object_no_person / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-human-attributes-without-person
- [coherence] 13_non_tech_object_no_person / GOOGLE_NANO_BANANA_2: no-human-attributes-without-person
- [coherence] 13_non_tech_object_no_person / MIDJOURNEY_V8_2: no-human-attributes-without-person
- [coherence] 13_non_tech_object_no_person / FLUX_2_PRO: no-human-attributes-without-person
