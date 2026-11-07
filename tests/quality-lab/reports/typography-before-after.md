# Typography before/after

Engine before: `..\..\..\..\..\ADMINI~1\AppData\Local\Temp\claude\b80e94146e2850c7\3b95f7f1-6821-4949-94b7-3086009ea105\scratchpad\base-head2\src\lib\simpleEngine\engine.ts`. Engine after: the current `src/lib/simpleEngine/engine.ts`.
Deterministic: the prompts are generated, not drawn. The judge reads the lettering instructions (see `typography-judge.mjs`).

| Case | Before | After | Failed checks (before) | Failed checks (after) |
|---|---|---|---|---|
| 21_typography_gta_stylized_title | 56% | 100% | render-instruction, lettering-coherent, section-length, scene-preserved | — |
| 22_typography_tech_short | 56% | 100% | render-instruction, lettering-coherent, section-length, scene-preserved | — |
| 23_typography_opinion_pt | 56% | 100% | render-instruction, lettering-coherent, section-length, scene-preserved | — |
| 24_typography_comparison | 56% | 100% | render-instruction, lettering-coherent, section-length, scene-preserved | — |
| 25_typography_accents_cedilha | 56% | 100% | render-instruction, lettering-coherent, section-length, scene-preserved | — |
| 26_typography_overloaded_improve | 60% | 100% | render-instruction, lettering-coherent, scene-preserved, no-/3D bevel|chrome letters | — |
| 27_typography_no_text | 100% | 100% | — | — |
| 28_typography_game_logo_preserved | 60% | 100% | render-instruction, lettering-coherent, section-length, scene-preserved | — |

Boilerplate across the 8 cases after the change (sentences in 4 or more cases): 7x "Change only the lettering; keep the background, scene, lighting, face, product and logos a…".

## 21_typography_gta_stylized_title

**Request:** GTA com título grande e estilizado: letras de jogo com personalidade, sem pseudo-letras

**Before (lettering):**

> The only visible text must read exactly: "SAN ANDREAS". Render this headline exactly as written: every letter, accent, capital and punctuation mark, no translation, no extra words, no other text. Use one coherent display typeface family with consistent glyph shapes, even stroke weight and baseline. Restrained outline and shadow: at most one clean edge, no glow, no bevel, no 3D extrusion. Strong contrast, readable at 120px phone size. No unnecessary mixing of unrelated lettering styles; keep an expressive gaming look only while it stays clean and legible. Place it on a calm area, never over faces, hands or the main product. Typographic style: simple bold condensed sans-serif with high contrast and immediate readability at mobile thumbnail size. Hierarchy: prioritize this single short message as secondary to the protagonist subject, never competing for focal dominance.

**After (lettering):**

> Render the headline "SAN ANDREAS" exactly as written, every letter and punctuation mark, never translated or shortened. Draw one cohesive, professionally designed display face with consistent proportions and clean curves, set as one large, dominant line readable at a glance. Keep it in clean space away from the face and hands. One strong accent colour; an even outline only where it separates the letters from a busy background, and no glow. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.

Judge after: ✓ exact-wording · ✓ render-instruction · ✓ no-contradiction · ✓ lettering-coherent · ✓ section-length · ✓ concrete-choices · ✓ genre-fit · ✓ scene-preserved · ✓ no-font-promise

## 22_typography_tech_short

**Request:** Tecnologia com texto curto: sans geométrica limpa, sem brilho

**Before (lettering):**

> The only visible text must read exactly: "TESTE COMPLETO". Render this headline exactly as written: every letter, accent, capital and punctuation mark, no translation, no extra words, no other text. Use one coherent display typeface family with consistent glyph shapes, even stroke weight and baseline. Restrained outline and shadow: at most one clean edge, no glow, no bevel, no 3D extrusion. Strong contrast, readable at 120px phone size. No unnecessary mixing of unrelated lettering styles; keep an expressive gaming look only while it stays clean and legible. Place it on a calm area, never over faces, hands or the main product. Typographic style: simple clean heavy grotesk or modern neutral sans-serif with high contrast and legibility. Hierarchy: prioritize this single short message as secondary to the protagonist subject, never competing for focal dominance.

**After (lettering):**

> Render the headline "TESTE COMPLETO" exactly as written, every letter and punctuation mark, never translated or shortened. Draw one clean geometric sans with even strokes and natural spacing, set as one large, dominant line readable at a glance. Place it on the cleaner side of the frame, clear of the device. One high-contrast tone, with no outline and no glow. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.

Judge after: ✓ exact-wording · ✓ render-instruction · ✓ no-contradiction · ✓ lettering-coherent · ✓ section-length · ✓ concrete-choices · ✓ genre-fit · ✓ scene-preserved · ✓ no-font-promise

## 23_typography_opinion_pt

**Request:** Opinião em português: caixa-alta pesada e contraste máximo

**Before (lettering):**

> The only visible text must read exactly: "NÃO COMPRE AGORA". Render this headline exactly as written: every letter, accent, capital and punctuation mark, no translation, no extra words, no other text. Use one coherent display typeface family with consistent glyph shapes, even stroke weight and baseline. Restrained outline and shadow: at most one clean edge, no glow, no bevel, no 3D extrusion. Strong contrast, readable at 120px phone size. No unnecessary mixing of unrelated lettering styles; keep an expressive gaming look only while it stays clean and legible. Place it on a calm area, never over faces, hands or the main product. Typographic style: simple clean heavy grotesk or modern neutral sans-serif with high contrast and legibility. Hierarchy: prioritize this single short message as secondary to the protagonist subject, never competing for focal dominance.

**After (lettering):**

> Render the headline "NÃO COMPRE AGORA" exactly as written, every letter, accent and punctuation mark, never translated or shortened. Draw one heavy condensed display face with consistent proportions and open counters, set on two lines at most, large and comfortably spaced. Place it over the flattest area of the background, clear of the subject. Maximum value contrast against the background, with at most one restrained edge or a tight soft shadow. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.

Judge after: ✓ exact-wording · ✓ render-instruction · ✓ no-contradiction · ✓ lettering-coherent · ✓ section-length · ✓ concrete-choices · ✓ genre-fit · ✓ scene-preserved · ✓ no-font-promise

## 24_typography_comparison

**Request:** Comparação de produtos: título curto que decide, sem fundir os produtos

**Before (lettering):**

> The only visible text must read exactly: "QUAL COMPRAR?". Render this headline exactly as written: every letter, accent, capital and punctuation mark, no translation, no extra words, no other text. Use one coherent display typeface family with consistent glyph shapes, even stroke weight and baseline. Restrained outline and shadow: at most one clean edge, no glow, no bevel, no 3D extrusion. Strong contrast, readable at 120px phone size. No unnecessary mixing of unrelated lettering styles; keep an expressive gaming look only while it stays clean and legible. Place it on a calm area, never over faces, hands or the main product. Typographic style: simple clean heavy grotesk or modern neutral sans-serif with high contrast and legibility. Hierarchy: prioritize this single short message as secondary to the protagonist subject, never competing for focal dominance.

**After (lettering):**

> Render the headline "QUAL COMPRAR?" exactly as written, every letter and punctuation mark, never translated or shortened. Draw one clean geometric sans with even strokes and natural spacing, set as one large, dominant line readable at a glance. Place it on the cleaner side of the frame, clear of the device. One high-contrast tone, with no outline and no glow. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.

Judge after: ✓ exact-wording · ✓ render-instruction · ✓ no-contradiction · ✓ lettering-coherent · ✓ section-length · ✓ concrete-choices · ✓ genre-fit · ✓ scene-preserved · ✓ no-font-promise

## 25_typography_accents_cedilha

**Request:** Título com acentos e cedilha preservados exatamente

**Before (lettering):**

> The only visible text must read exactly: "O GRANDE ANÚNCIO: É HOJE, ÇA É SÉRIO". Render this headline exactly as written: every letter, accent, capital and punctuation mark, no translation, no extra words, no other text. Use one coherent display typeface family with consistent glyph shapes, even stroke weight and baseline. Restrained outline and shadow: at most one clean edge, no glow, no bevel, no 3D extrusion. Strong contrast, readable at 120px phone size. No unnecessary mixing of unrelated lettering styles; keep an expressive gaming look only while it stays clean and legible. Place it on a calm area, never over faces, hands or the main product. Typographic style: simple bold condensed sans-serif with high contrast and immediate readability at mobile thumbnail size. Hierarchy: prioritize this single short message as secondary to the protagonist subject, never competing for focal dominance.

**After (lettering):**

> Render the headline "O GRANDE ANÚNCIO: É HOJE, ÇA É SÉRIO" exactly as written, every letter, accent, cedilha and punctuation mark, never translated or shortened. Draw one heavy condensed display face with consistent proportions and open counters, set in two or three compact lines broken at word boundaries. Set it along the lower third, clear of the main subject. Maximum value contrast against the background, with at most one restrained edge or a tight soft shadow. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.

Judge after: ✓ exact-wording · ✓ render-instruction · ✓ no-contradiction · ✓ lettering-coherent · ✓ section-length · ✓ concrete-choices · ✓ genre-fit · ✓ scene-preserved · ✓ no-font-promise

## 26_typography_overloaded_improve

**Request:** Prompt cheio de efeitos tipográficos exagerados: troca por direções boas, mantém o título

**Before (lettering):**

> The only visible text must read exactly: "VALE A PENA". Render this headline exactly as written, with every accent and capital, no other text. Use one coherent display typeface family with consistent glyph shapes, even stroke weight and baseline. Restrained outline and shadow: at most one clean edge, no glow, no bevel, no 3D extrusion. Strong contrast, readable at 120px phone size. No unnecessary mixing of unrelated lettering styles; keep an expressive gaming look only while it stays clean and legible. Place it on a calm area, never over faces, hands or the main product.

**After (lettering):**

> Render the headline "VALE A PENA" exactly as written, every letter and punctuation mark, never translated or shortened. Draw one cohesive, professionally designed display face with consistent proportions and clean curves, set on two lines at most, large and comfortably spaced. Place it in the open area of the frame, clear of the main subject silhouette. One strong accent colour; an even outline only where it separates the letters from a busy background, and no glow. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.

Judge after: ✓ exact-wording · ✓ render-instruction · ✓ no-contradiction · ✓ lettering-coherent · ✓ section-length · ✓ concrete-choices · ✓ genre-fit · ✓ scene-preserved · ✓ no-font-promise · ✓ no-/3D bevel|chrome letters

## 27_typography_no_text

**Request:** Sem texto pedido: nenhum título inventado

**Before (lettering):**

> Do not add overlay text, captions, or pseudo-typography. Printed markings that physically belong to the real products (brand logos, official game titles on covers) stay accurate and are never invented. Reserve clean negative space for later typography.

**After (lettering):**

> Do not add overlay text, captions, or pseudo-typography. Printed markings that physically belong to the real products (brand logos, official game titles on covers) stay accurate and are never invented. Reserve clean negative space for later typography.

Judge after: ✓ no-invented-title

## 28_typography_game_logo_preserved

**Request:** Logotipo de jogo que precisa permanecer intacto, com o texto pedido

**Before (lettering):**

> The only visible text must read exactly: "ELDEN RING". Render this headline exactly as written: every letter, accent, capital and punctuation mark, no translation, no extra words, no other text. Use one coherent display typeface family with consistent glyph shapes, even stroke weight and baseline. Restrained outline and shadow: at most one clean edge, no glow, no bevel, no 3D extrusion. Strong contrast, readable at 120px phone size. No unnecessary mixing of unrelated lettering styles; keep an expressive gaming look only while it stays clean and legible. Place it on a calm area, never over faces, hands or the main product. Typographic style: simple bold condensed sans-serif with high contrast and immediate readability at mobile thumbnail size. Hierarchy: prioritize this single short message as secondary to the protagonist subject, never competing for focal dominance.

**After (lettering):**

> Render the headline "ELDEN RING" exactly as written, every letter and punctuation mark, never translated or shortened. Draw one cohesive, professionally designed display face with consistent proportions and clean curves, set as one large, dominant line readable at a glance. Keep it in clean space away from the product and its logo. One strong accent colour; an even outline only where it separates the letters from a busy background, and no glow. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.

Judge after: ✓ exact-wording · ✓ render-instruction · ✓ no-contradiction · ✓ lettering-coherent · ✓ section-length · ✓ concrete-choices · ✓ genre-fit · ✓ scene-preserved · ✓ no-font-promise · ✓ logo-preserved

