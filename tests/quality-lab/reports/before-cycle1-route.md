# Thumbnail Quality Lab report

Scope: deterministic checks over generated PROMPT text. No images were generated or inspected.

Complementary engines: false | pipeline: route

Runs: 62 | checks: 1236 | FAIL: 90 | WARN: 49

| Dimension | pass | fail | warn |
|---|---|---|---|
| intent | 459 | 16 | 0 |
| coherence | 71 | 29 | 42 |
| anti-slop | 484 | 0 | 0 |
| reference | 19 | 14 | 7 |
| product | 0 | 30 | 0 |
| typography | 60 | 1 | 0 |
| usability | 4 | 0 | 0 |

| Model | avg words | max words |
|---|---|---|
| GERAL | 233 | 447 |
| OPENAI_GPT_IMAGE_2_5_SUNBURST | 391 | 486 |
| GOOGLE_NANO_BANANA_2 | 190 | 292 |
| MIDJOURNEY_V8_2 | 59 | 85 |
| FLUX_2_PRO | 184 | 212 |

Compared with baseline (before-cycle1 route (b4f7cc0)): fixed 0, regressed 0

## Failures

- [reference] 01_ps2_covers / GERAL: identity-guidance-present
- [product] 01_ps2_covers / GERAL: product-fidelity-lock
- [coherence] 01_ps2_covers / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-negated-clean-background
- [product] 01_ps2_covers / OPENAI_GPT_IMAGE_2_5_SUNBURST: product-fidelity-lock
- [coherence] 01_ps2_covers / GOOGLE_NANO_BANANA_2: no-negated-clean-background
- [product] 01_ps2_covers / GOOGLE_NANO_BANANA_2: product-fidelity-lock
- [product] 01_ps2_covers / MIDJOURNEY_V8_2: product-fidelity-lock
- [coherence] 01_ps2_covers / FLUX_2_PRO: no-negated-clean-background
- [reference] 01_ps2_covers / FLUX_2_PRO: identity-guidance-present
- [product] 01_ps2_covers / FLUX_2_PRO: product-fidelity-lock
- [reference] 02_creator_in_game_world / GERAL: identity-guidance-present
- [coherence] 02_creator_in_game_world / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-negated-clean-background
- [coherence] 02_creator_in_game_world / GOOGLE_NANO_BANANA_2: no-negated-clean-background
- [coherence] 02_creator_in_game_world / FLUX_2_PRO: no-negated-clean-background
- [reference] 02_creator_in_game_world / FLUX_2_PRO: identity-guidance-present
- [intent] 03_product_with_reference / GERAL: includes:headset-pro-x
- [product] 03_product_with_reference / GERAL: product-fidelity-lock
- [coherence] 03_product_with_reference / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-negated-clean-background
- [product] 03_product_with_reference / OPENAI_GPT_IMAGE_2_5_SUNBURST: product-fidelity-lock
- [coherence] 03_product_with_reference / GOOGLE_NANO_BANANA_2: no-negated-clean-background
- [product] 03_product_with_reference / GOOGLE_NANO_BANANA_2: product-fidelity-lock
- [intent] 03_product_with_reference / MIDJOURNEY_V8_2: includes:headset-pro-x
- [product] 03_product_with_reference / MIDJOURNEY_V8_2: product-fidelity-lock
- [intent] 03_product_with_reference / FLUX_2_PRO: includes:headset-pro-x
- [coherence] 03_product_with_reference / FLUX_2_PRO: no-negated-clean-background
- [product] 03_product_with_reference / FLUX_2_PRO: product-fidelity-lock
- [intent] 04_named_products_no_reference / GERAL: includes:iPhone 17 Pro
- [intent] 04_named_products_no_reference / GERAL: includes:Galaxy S26 Ultra
- [product] 04_named_products_no_reference / GERAL: product-fidelity-lock
- [intent] 04_named_products_no_reference / OPENAI_GPT_IMAGE_2_5_SUNBURST: includes:iPhone 17 Pro
- [intent] 04_named_products_no_reference / OPENAI_GPT_IMAGE_2_5_SUNBURST: includes:Galaxy S26 Ultra
- [coherence] 04_named_products_no_reference / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-negated-clean-background
- [product] 04_named_products_no_reference / OPENAI_GPT_IMAGE_2_5_SUNBURST: product-fidelity-lock
- [intent] 04_named_products_no_reference / GOOGLE_NANO_BANANA_2: includes:iPhone 17 Pro
- [intent] 04_named_products_no_reference / GOOGLE_NANO_BANANA_2: includes:Galaxy S26 Ultra
- [coherence] 04_named_products_no_reference / GOOGLE_NANO_BANANA_2: no-negated-clean-background
- [product] 04_named_products_no_reference / GOOGLE_NANO_BANANA_2: product-fidelity-lock
- [intent] 04_named_products_no_reference / MIDJOURNEY_V8_2: includes:iPhone 17 Pro
- [intent] 04_named_products_no_reference / MIDJOURNEY_V8_2: includes:Galaxy S26 Ultra
- [product] 04_named_products_no_reference / MIDJOURNEY_V8_2: product-fidelity-lock
- [intent] 04_named_products_no_reference / FLUX_2_PRO: includes:iPhone 17 Pro
- [intent] 04_named_products_no_reference / FLUX_2_PRO: includes:Galaxy S26 Ultra
- [coherence] 04_named_products_no_reference / FLUX_2_PRO: no-negated-clean-background
- [product] 04_named_products_no_reference / FLUX_2_PRO: product-fidelity-lock
- [reference] 05_person_holding_object / GERAL: identity-guidance-present
- [coherence] 05_person_holding_object / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-negated-clean-background
- [coherence] 05_person_holding_object / GOOGLE_NANO_BANANA_2: no-negated-clean-background
- [coherence] 05_person_holding_object / FLUX_2_PRO: no-negated-clean-background
- [reference] 05_person_holding_object / FLUX_2_PRO: identity-guidance-present
- [reference] 06_multi_element_hierarchy / GERAL: identity-guidance-present
- [product] 06_multi_element_hierarchy / GERAL: product-fidelity-lock
- [coherence] 06_multi_element_hierarchy / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-negated-clean-background
- [product] 06_multi_element_hierarchy / OPENAI_GPT_IMAGE_2_5_SUNBURST: product-fidelity-lock
- [coherence] 06_multi_element_hierarchy / GOOGLE_NANO_BANANA_2: no-negated-clean-background
- [product] 06_multi_element_hierarchy / GOOGLE_NANO_BANANA_2: product-fidelity-lock
- [product] 06_multi_element_hierarchy / MIDJOURNEY_V8_2: product-fidelity-lock
- [coherence] 06_multi_element_hierarchy / FLUX_2_PRO: no-negated-clean-background
- [reference] 06_multi_element_hierarchy / FLUX_2_PRO: identity-guidance-present
- [product] 06_multi_element_hierarchy / FLUX_2_PRO: product-fidelity-lock
- [reference] 07_explicit_bedroom / GERAL: identity-guidance-present
- [coherence] 07_explicit_bedroom / GOOGLE_NANO_BANANA_2: excludes:no bedrooms
- [coherence] 07_explicit_bedroom / FLUX_2_PRO: excludes:no bedrooms
- [reference] 07_explicit_bedroom / FLUX_2_PRO: identity-guidance-present
- [reference] 08_no_environment_conservative / GERAL: identity-guidance-present
- [coherence] 08_no_environment_conservative / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-negated-clean-background
- [coherence] 08_no_environment_conservative / GOOGLE_NANO_BANANA_2: no-negated-clean-background
- [coherence] 08_no_environment_conservative / FLUX_2_PRO: no-negated-clean-background
- [reference] 08_no_environment_conservative / FLUX_2_PRO: identity-guidance-present
- [intent] 09_target_image_locked / GERAL: no-leak:map fixture
- [intent] 09_target_image_locked / MIDJOURNEY_V8_2: no-leak:map fixture
- [intent] 09_target_image_locked / FLUX_2_PRO: no-leak:map fixture
- [reference] 11_exact_portuguese_text / GERAL: identity-guidance-present
- [product] 11_exact_portuguese_text / GERAL: product-fidelity-lock
- [coherence] 11_exact_portuguese_text / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-negated-clean-background
- [product] 11_exact_portuguese_text / OPENAI_GPT_IMAGE_2_5_SUNBURST: product-fidelity-lock
- [coherence] 11_exact_portuguese_text / GOOGLE_NANO_BANANA_2: no-negated-clean-background
- [product] 11_exact_portuguese_text / GOOGLE_NANO_BANANA_2: product-fidelity-lock
- [product] 11_exact_portuguese_text / MIDJOURNEY_V8_2: product-fidelity-lock
- [typography] 11_exact_portuguese_text / MIDJOURNEY_V8_2: exact-text-verbatim
- [coherence] 11_exact_portuguese_text / FLUX_2_PRO: no-negated-clean-background
- [reference] 11_exact_portuguese_text / FLUX_2_PRO: identity-guidance-present
- [product] 11_exact_portuguese_text / FLUX_2_PRO: product-fidelity-lock
- [product] 12_simple_stays_simple / GERAL: product-fidelity-lock
- [product] 12_simple_stays_simple / OPENAI_GPT_IMAGE_2_5_SUNBURST: product-fidelity-lock
- [product] 12_simple_stays_simple / GOOGLE_NANO_BANANA_2: product-fidelity-lock
- [product] 12_simple_stays_simple / MIDJOURNEY_V8_2: product-fidelity-lock
- [product] 12_simple_stays_simple / FLUX_2_PRO: product-fidelity-lock
- [coherence] 13_non_tech_object_no_person / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-negated-clean-background
- [coherence] 13_non_tech_object_no_person / GOOGLE_NANO_BANANA_2: no-negated-clean-background
- [coherence] 13_non_tech_object_no_person / FLUX_2_PRO: no-negated-clean-background

## Warnings

- [coherence] 01_ps2_covers / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-duplicate-phrases
- [coherence] 01_ps2_covers / GOOGLE_NANO_BANANA_2: no-duplicate-phrases
- [reference] 01_ps2_covers / MIDJOURNEY_V8_2: identity-guidance-present
- [coherence] 01_ps2_covers / FLUX_2_PRO: no-duplicate-phrases
- [coherence] 02_creator_in_game_world / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-duplicate-phrases
- [coherence] 02_creator_in_game_world / GOOGLE_NANO_BANANA_2: no-duplicate-phrases
- [reference] 02_creator_in_game_world / MIDJOURNEY_V8_2: identity-guidance-present
- [coherence] 02_creator_in_game_world / FLUX_2_PRO: no-duplicate-phrases
- [coherence] 03_product_with_reference / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-duplicate-phrases
- [coherence] 03_product_with_reference / GOOGLE_NANO_BANANA_2: no-duplicate-phrases
- [coherence] 03_product_with_reference / FLUX_2_PRO: no-duplicate-phrases
- [coherence] 04_named_products_no_reference / GERAL: no-human-attributes-without-person
- [coherence] 04_named_products_no_reference / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-duplicate-phrases
- [coherence] 04_named_products_no_reference / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-human-attributes-without-person
- [coherence] 04_named_products_no_reference / GOOGLE_NANO_BANANA_2: no-duplicate-phrases
- [coherence] 04_named_products_no_reference / GOOGLE_NANO_BANANA_2: no-human-attributes-without-person
- [coherence] 04_named_products_no_reference / MIDJOURNEY_V8_2: no-human-attributes-without-person
- [coherence] 04_named_products_no_reference / FLUX_2_PRO: no-duplicate-phrases
- [coherence] 04_named_products_no_reference / FLUX_2_PRO: no-human-attributes-without-person
- [coherence] 05_person_holding_object / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-duplicate-phrases
- [coherence] 05_person_holding_object / GOOGLE_NANO_BANANA_2: no-duplicate-phrases
- [reference] 05_person_holding_object / MIDJOURNEY_V8_2: identity-guidance-present
- [coherence] 05_person_holding_object / FLUX_2_PRO: no-duplicate-phrases
- [coherence] 06_multi_element_hierarchy / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-duplicate-phrases
- [coherence] 06_multi_element_hierarchy / GOOGLE_NANO_BANANA_2: no-duplicate-phrases
- [reference] 06_multi_element_hierarchy / MIDJOURNEY_V8_2: identity-guidance-present
- [coherence] 06_multi_element_hierarchy / FLUX_2_PRO: no-duplicate-phrases
- [reference] 07_explicit_bedroom / MIDJOURNEY_V8_2: identity-guidance-present
- [coherence] 08_no_environment_conservative / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-duplicate-phrases
- [coherence] 08_no_environment_conservative / GOOGLE_NANO_BANANA_2: no-duplicate-phrases
- [reference] 08_no_environment_conservative / MIDJOURNEY_V8_2: identity-guidance-present
- [coherence] 08_no_environment_conservative / FLUX_2_PRO: no-duplicate-phrases
- [coherence] 11_exact_portuguese_text / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-duplicate-phrases
- [coherence] 11_exact_portuguese_text / GOOGLE_NANO_BANANA_2: no-duplicate-phrases
- [reference] 11_exact_portuguese_text / MIDJOURNEY_V8_2: identity-guidance-present
- [coherence] 11_exact_portuguese_text / FLUX_2_PRO: no-duplicate-phrases
- [coherence] 12_simple_stays_simple / GERAL: no-human-attributes-without-person
- [coherence] 12_simple_stays_simple / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-human-attributes-without-person
- [coherence] 12_simple_stays_simple / GOOGLE_NANO_BANANA_2: no-human-attributes-without-person
- [coherence] 12_simple_stays_simple / MIDJOURNEY_V8_2: no-human-attributes-without-person
- [coherence] 12_simple_stays_simple / FLUX_2_PRO: no-human-attributes-without-person
- [coherence] 13_non_tech_object_no_person / GERAL: no-human-attributes-without-person
- [coherence] 13_non_tech_object_no_person / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-duplicate-phrases
- [coherence] 13_non_tech_object_no_person / OPENAI_GPT_IMAGE_2_5_SUNBURST: no-human-attributes-without-person
- [coherence] 13_non_tech_object_no_person / GOOGLE_NANO_BANANA_2: no-duplicate-phrases
- [coherence] 13_non_tech_object_no_person / GOOGLE_NANO_BANANA_2: no-human-attributes-without-person
- [coherence] 13_non_tech_object_no_person / MIDJOURNEY_V8_2: no-human-attributes-without-person
- [coherence] 13_non_tech_object_no_person / FLUX_2_PRO: no-duplicate-phrases
- [coherence] 13_non_tech_object_no_person / FLUX_2_PRO: no-human-attributes-without-person
