# Teste manual de imagem: prompt anterior x prompt atual

Gerado por tests/quality-lab/typography-manual-test.mjs. Nenhuma imagem foi gerada por este script e nenhum modelo foi chamado.

**Verificado aqui (prompt):** texto exato entre aspas, pedido de renderização, ausência de contradição, número e foco das instruções de letra, gênero coerente, preservação da cena, ausência de promessa de fonte, e ausência de frase colada entre casos.

**Não verificado aqui (imagem):** se o gerador desenha as letras bem, se a leitura é boa, se há bevel, brilho ou contorno excessivo, e se a identidade visual se mantém. Isso só se sabe pelo teste manual abaixo.

Juiz de prompt: anterior 0/16 aprovados, atual 16/16 aprovados (4 casos x 4 alvos).
Nenhuma falha restante no atual.

Frases de tipografia repetidas em 3 ou mais casos (alvo GERAL, atual): 4x "Change only the lettering; keep the background, scene, lighting, face, product and logos as they are...".

## Gaming: headline grande e expressiva

Entrada idêntica nos dois motores: título "Zerei GTA San Andreas em 2026" | ideia "Eu com cara de choque segurando o controle, cidade noturna ao fundo, luz neon" | texto da thumbnail "SAN ANDREAS" | sem referências | tratamento AUTO | Natural | realismo Alto.

Palavras (alvo GERAL): anterior 455, atual 481.

### Prompt anterior (GERAL)

```text
Photographic YouTube thumbnail, 16:9 widescreen format. Directed visual storytelling, authentic and grounded.
SCENE: Eu com cara de choque segurando o controle, cidade noturna ao fundo, luz neon (featuring Zerei GTA San Andreas, as named in the video title).
SUBJECT & FRAMING: A person presenting the primary subject with genuine ease and natural composed posture. Eye-level conversational angle, crisp separation of subject from background through natural optical perspective.
HUMAN EXPRESSION: Direct engaging look toward the viewer with a subtle, confident smirk conveying genuine satisfaction without shouting.
LIGHTING: Clean motivated key illumination with soft natural shadow falloff, emphasizing genuine physical textures and form without artificial glare. Light sources are physically motivated and grounded in the scene.
ENVIRONMENT & OPTICS: Clean minimalist background with soft optical falloff and generous negative space, keeping total visual priority on the primary subject without domestic clutter. natural photographic depth of field with organic optical falloff, softly defocusing the background to prioritize subject readability, tangible materials with matte finishes.
TYPOGRAPHY: The only visible text must read exactly: "SAN ANDREAS". No extra words. No pseudo-text. No invented letters. Leave clean negative space on the right side for later typography. Do not generate random letters, words, logos, symbols, pseudo-text or decorative glyphs inside the image. Typographic style: simple bold condensed sans-serif with high contrast and immediate readability at mobile thumbnail size. Hierarchy: prioritize this single short message as secondary to the protagonist subject, never competing for focal dominance.

NEGATIVE / STRICTLY AVOID:
generic AI beauty face, same-face syndrome, perfect facial symmetry, plastic skin, waxy skin texture, excessive beauty filter, oversized eyes, unnatural teeth, generic shocked expression, unnecessary mouth-open reaction, identity drift from reference, age change, hair change, beard change, artificial beauty filter jaw slimming, no duplicated or fused fingers, no fingers intersecting the product, no unnatural hand grip, impossible arm pose, body proportion drift, wrong geometry, incorrect buttons, incorrect analog sticks, wrong ports, invented vents, wrong screen ratio, incorrect thickness, warped logo, unrecognizable silhouette, deformed hardware geometry, unmotivated rim light, orange/teal lighting by default, glowing edges, impossible reflections, multiple incompatible light directions, volumetric light without source, too many focal points, everything equally sharp, everything equally saturated, everything equally contrasted, background competing with subject, generic centered stock-photo composition, random floating elements, too many visual metaphors, tiny important story elements, composition failing at thumbnail size, overprocessed HDR, excessive sharpening, fake bokeh, extreme color grading, excessive contrast, artificial clarity, uniform micro-detail, over-saturated skin, random red arrows, random circles, floating emojis, floating logos, lightning, sparks, fire, particles, giant text, generic shocked creator, fake UI, random VS, generic before/after division, no malformed typography, no pseudo-text, no random letters, no inconsistent glyphs, no melted letterforms, no distorted baseline, no incorrect spelling, no unnecessary 3D extrusion, no fake metallic type by default.
```

### Prompt atual (GERAL)

```text
Photographic YouTube thumbnail, 16:9 widescreen format. Directed visual storytelling, authentic and grounded.
SCENE: Eu com cara de choque segurando o controle, cidade noturna ao fundo, luz neon (featuring Zerei GTA San Andreas).
SUBJECT & FRAMING: A person presenting the primary subject with genuine ease and natural composed posture. Eye-level conversational angle, crisp separation of subject from background through natural optical perspective.
HUMAN EXPRESSION: Direct engaging look toward the viewer with a subtle, confident smirk conveying genuine satisfaction without shouting.
LIGHTING: Clean motivated key illumination with soft natural shadow falloff, emphasizing genuine physical textures and form without artificial glare. Light sources are physically motivated and grounded in the scene.
ENVIRONMENT & OPTICS: Clean minimalist background with soft optical falloff and generous negative space, keeping total visual priority on the primary subject without domestic clutter. natural photographic depth of field with organic optical falloff, softly defocusing the background to prioritize subject readability, tangible materials with matte finishes.
TYPOGRAPHY: Render the headline "SAN ANDREAS" exactly as written, every letter and punctuation mark, never translated or shortened. Draw one cohesive, professionally designed display face with consistent proportions and clean curves, set as one large, dominant line readable at a glance. Place it in the open area of the frame, clear of the main subject silhouette. One strong accent colour, a bold, even outline that keeps the letters readable over a busy background, and a firm shadow for depth; no bevel or chrome, and a glow only if the scene itself is neon. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.

NEGATIVE / STRICTLY AVOID:
generic AI beauty face, same-face syndrome, perfect facial symmetry, plastic skin, waxy skin texture, excessive beauty filter, oversized eyes, unnatural teeth, generic shocked expression, unnecessary mouth-open reaction, identity drift from reference, age change, hair change, beard change, artificial beauty filter jaw slimming, no duplicated or fused fingers, no fingers intersecting the product, no unnatural hand grip, impossible arm pose, body proportion drift, wrong geometry, incorrect buttons, incorrect analog sticks, wrong ports, invented vents, wrong screen ratio, incorrect thickness, warped logo, unrecognizable silhouette, deformed hardware geometry, unmotivated rim light, orange/teal lighting by default, glowing edges, impossible reflections, multiple incompatible light directions, volumetric light without source, too many focal points, everything equally sharp, everything equally saturated, everything equally contrasted, background competing with subject, generic centered stock-photo composition, random floating elements, too many visual metaphors, tiny important story elements, composition failing at thumbnail size, overprocessed HDR, excessive sharpening, fake bokeh, extreme color grading, excessive contrast, artificial clarity, uniform micro-detail, over-saturated skin, random red arrows, random circles, floating emojis, floating logos, lightning, sparks, fire, particles, giant text, generic shocked creator, fake UI, random VS, generic before/after division, no malformed typography, no pseudo-text, no random letters, no inconsistent glyphs, no melted letterforms, no distorted baseline, no incorrect spelling, no unnecessary 3D extrusion, no fake metallic type by default.
```

### Juiz de prompt por alvo

| Alvo | Anterior | Atual | Falhas no atual |
|---|---|---|---|
| GERAL | reprovado | aprovado | - |
| OPENAI_GPT_IMAGE_2_5_SUNBURST | reprovado | aprovado | - |
| GOOGLE_NANO_BANANA_2 | reprovado | aprovado | - |
| MIDJOURNEY_V8_2 | reprovado | aprovado | - |
### Prompt atual (OPENAI_GPT_IMAGE_2_5_SUNBURST)

```text
GOAL:
Generate an authentic, high-impact photographic YouTube thumbnail for "Eu com cara de choque segurando o controle, cidade noturna ao fundo, luz neon (featuring Zerei GTA San Andreas)". Maximize click-through readability at small mobile feed scale (120px) through clean figure-ground separation and tactile physical realism.

REFERENCE ROLES:
No external image references. Ground all elements from explicit concept description.

TARGET IMAGE:
None (original photographic composition established from scratch).

CHANGE:
Establish complete photographic composition and hero subject based on: "Eu com cara de choque segurando o controle, cidade noturna ao fundo, luz neon (featuring Zerei GTA San Andreas)".

ADAPT:
Anatomically plausible hands with natural grip, correct visible finger count according to pose and natural occlusion. Balanced optical falloff between subject and background.

PRESERVE:
1. Natural human facial asymmetry, closed-mouth composed expression, and natural skin texture without plastic smoothing.
2. Authentic physical materials and tactile textures.
3. Grounded real-world scale and camera perspective.

ENVIRONMENT:
Clean minimalist background with soft optical falloff and generous negative space, keeping total visual priority on primary subject without domestic clutter (no unrequested bedrooms, living rooms, sofas, desks or lamps).

COMPOSITION:
16:9 widescreen photographic framing (16:9 widescreen format). Clean figure-ground separation with bold subject silhouette optimized for instant readability at 120px mobile thumbnail scale. 35mm lens perspective preserving authentic spatial depth. Render the headline "SAN ANDREAS" exactly as written, every letter and punctuation mark, never translated or shortened. Draw one cohesive, professionally designed display face with consistent proportions and clean curves, set as one large, dominant line readable at a glance. Place it in the open area of the frame, clear of the main subject silhouette. One strong accent colour, a bold, even outline that keeps the letters readable over a busy background, and a firm shadow for depth; no bevel or chrome, and a glow only if the scene itself is neon. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.

LIGHTING:
Physically motivated illumination with clean directional key light, subtle natural fill, and soft realistic shadow falloff. Directional coherence across all elements. Zero unmotivated neon rim lights, laser glows, or synthetic halos.

AVOID:
face swap, face paste, flat frontal face pasted on angled head, distorted skull geometry, plastic waxy skin, beauty filter jaw slimming, open mouth screaming shock face, deformed hands, extra fingers, duplicated digits, intersecting hardware, floating embers, flying sparks, neon blue-purple wash, unmotivated rim light, domestic clutter (sofas, bedroom lamps, desks unless requested), generic AI beauty face, same-face syndrome, perfect facial symmetry, excessive beauty filter, oversized eyes, unnatural teeth, generic shocked expression, unnecessary mouth-open reaction, identity drift from reference, age change, hair change, beard change, fingers intersecting the product, unnatural hand grip.
```

### Prompt atual (GOOGLE_NANO_BANANA_2)

```text
SCENE:
Eu com cara de choque segurando o controle, cidade noturna ao fundo, luz neon (featuring Zerei GTA San Andreas)

REFERENCE ROLES:
None (standalone visual composition generated from scratch).

WHICH IMAGE CONTROLS EACH VISUAL ATTRIBUTE:
- Visual Elements: Harmonious natural composition generated with realistic physical fidelity.

WHAT CHANGES:
Establish complete photographic thumbnail composition based on: "Eu com cara de choque segurando o controle, cidade noturna ao fundo, luz neon (featuring Zerei GTA San Andreas)".

WHAT REMAINS:
1. Composed human expression with closed mouth and natural skin texture without plastic smoothing.
2. Grounded real-world scale and authentic physical materials.
3. Clean optical separation with generous negative space.

PHOTOGRAPHIC DIRECTIVES:
16:9 widescreen format (16:9 widescreen format). 35mm lens perspective preserving authentic spatial depth. Directed visual storytelling with bold subject silhouette optimized for 120px mobile thumbnail scale. Motivated physical lighting with natural directional key light and soft shadow falloff. Zero synthetic AI gloss, waxy smoothing, neon rim lights, or unrequested domestic clutter (no bedrooms, sofas, desks, or lamps).

TYPOGRAPHY:
Render the headline "SAN ANDREAS" exactly as written, every letter and punctuation mark, never translated or shortened. Draw one cohesive, professionally designed display face with consistent proportions and clean curves, set as one large, dominant line readable at a glance. Place it in the open area of the frame, clear of the main subject silhouette. One strong accent colour, a bold, even outline that keeps the letters readable over a busy background, and a firm shadow for depth; no bevel or chrome, and a glow only if the scene itself is neon. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.
```

### Prompt atual (MIDJOURNEY_V8_2)

```text
Photographic YouTube thumbnail, Eu com cara de choque segurando o controle, cidade noturna ao fundo, luz neon (featuring Zerei GTA San Andreas), compelling hero presentation with clean silhouette and immediate readability at 120px mobile thumbnail scale, natural composed human expression with closed mouth, motivated directional physical key light with soft shadow falloff, 35mm lens perspective, authentic tactile textures, generous negative space. Lettering: with the words "SAN ANDREAS" written exactly as one cohesive display typeface, very large lettering, controlled outline, one accent colour, readable at phone size, placed in clean negative space, clear of the main subject. Keep the existing scene, background and lighting unchanged. No other text

--ar 16:9 --v 8.2
```


### Avaliação manual (cole os dois prompts no mesmo gerador, com a mesma semente quando houver)

| Critério | Anterior | Atual |
|---|---|---|
| Consistência das letras (sem letras deformadas) | [ ] | [ ] |
| Legibilidade em tamanho de celular | [ ] | [ ] |
| Texto exato, com acentos e pontuação | [ ] | [ ] |
| Aparência natural (sem cara de adesivo) | [ ] | [ ] |
| Bevel, brilho, sombra ou contorno desnecessários | [ ] | [ ] |
| Identidade visual preservada (cena, rosto, produto, fundo) | [ ] | [ ] |
| Composição geral (espaço, hierarquia) | [ ] | [ ] |

## Tecnologia: comparação com título curto

Entrada idêntica nos dois motores: título "iPhone 17 Pro vs Galaxy S26 Ultra" | ideia "Dois celulares lado a lado sobre a mesa, fundo gradiente azul" | texto da thumbnail "QUAL COMPRAR?" | sem referências | tratamento AUTO | Natural | realismo Alto.

Palavras (alvo GERAL): anterior 517, atual 521.

### Prompt anterior (GERAL)

```text
Photographic YouTube thumbnail, 16:9 widescreen format. Directed visual storytelling, authentic and grounded.
SCENE: Dois celulares lado a lado sobre a mesa, fundo gradiente azul (featuring iPhone 17 Pro and Galaxy S26 Ultra, as named in the video title).
SUBJECT & FRAMING: Direct physical side-by-side comparison of the exact items named in the scene (iPhone 17 Pro and Galaxy S26 Ultra), placed next to each other at true relative scale, each instantly recognizable by its authentic silhouette, proportions, and real design details. Balanced side-by-side composition with both items large in frame, generous negative space, and clear silhouette recognition at 120px mobile scale.
LIGHTING: Diffused task illumination with natural soft shadow falloff. Light sources are physically motivated and grounded in the scene.
ENVIRONMENT & OPTICS: Clean neutral table surface with soft optical falloff. balanced optical depth that preserves environmental context without distracting from the subject, tangible materials with matte finishes.
TYPOGRAPHY: The only visible text must read exactly: "QUAL COMPRAR?". No extra words. No pseudo-text. No invented letters. Leave clean negative space on the right side for later typography. Do not generate random letters, words, logos, symbols, pseudo-text or decorative glyphs inside the image. Typographic style: simple clean heavy grotesk or modern neutral sans-serif with high contrast and legibility. Hierarchy: prioritize this single short message as secondary to the protagonist subject, never competing for focal dominance.

PRESERVATION LOCKS:
HARDWARE & PRODUCT FIDELITY (MANDATORY) (iPhone 17 Pro, Galaxy S26 Ultra): Strictly preserve authentic industrial geometry, chassis proportions, exact physical buttons, analog sticks, ports, screen, tactile materials, and instantly recognizable silhouette. Do NOT automatically copy background setting, composition, or style from the reference photo. Zero AI melting or rubbery deformation. Each named product is its own distinct, correctly identified product, never merged, swapped, or replaced by a generic look-alike.

NEGATIVE / STRICTLY AVOID:
generic AI beauty face, same-face syndrome, perfect facial symmetry, plastic skin, waxy skin texture, excessive beauty filter, oversized eyes, unnatural teeth, generic shocked expression, unnecessary mouth-open reaction, identity drift from reference, age change, hair change, beard change, artificial beauty filter jaw slimming, no duplicated or fused fingers, no fingers intersecting the product, no unnatural hand grip, impossible arm pose, body proportion drift, wrong geometry, incorrect buttons, incorrect analog sticks, wrong ports, invented vents, wrong screen ratio, incorrect thickness, warped logo, unrecognizable silhouette, deformed hardware geometry, unmotivated rim light, orange/teal lighting by default, purple/blue gaming neon by default, glowing edges, impossible reflections, multiple incompatible light directions, volumetric light without source, too many focal points, everything equally sharp, everything equally saturated, everything equally contrasted, background competing with subject, generic centered stock-photo composition, random floating elements, too many visual metaphors, tiny important story elements, composition failing at thumbnail size, overprocessed HDR, excessive sharpening, fake bokeh, extreme color grading, excessive contrast, artificial clarity, uniform micro-detail, over-saturated skin, random red arrows, random circles, floating emojis, floating logos, lightning, sparks, fire, particles, giant text, generic shocked creator, fake UI, random VS, generic before/after division, no malformed typography, no pseudo-text, no random letters, no inconsistent glyphs, no melted letterforms, no distorted baseline, no incorrect spelling, no unnecessary 3D extrusion, no fake metallic type by default.
```

### Prompt atual (GERAL)

```text
Photographic YouTube thumbnail, 16:9 widescreen format. Directed visual storytelling, authentic and grounded.
SCENE: Dois celulares lado a lado sobre a mesa, fundo gradiente azul (featuring iPhone 17 Pro and Galaxy S26 Ultra).
SUBJECT & FRAMING: Direct physical side-by-side comparison of the exact items named in the scene (iPhone 17 Pro and Galaxy S26 Ultra), placed next to each other at true relative scale, each instantly recognizable by its authentic silhouette, proportions, and real design details. Balanced side-by-side composition with both items large in frame, generous negative space, and clear silhouette recognition at 120px mobile scale.
LIGHTING: Diffused task illumination with natural soft shadow falloff. Light sources are physically motivated and grounded in the scene.
ENVIRONMENT & OPTICS: Clean neutral table surface with soft optical falloff. balanced optical depth that preserves environmental context without distracting from the subject, tangible materials with matte finishes.
TYPOGRAPHY: Render the headline "QUAL COMPRAR?" exactly as written, every letter and punctuation mark, never translated or shortened. Draw one clean geometric sans with even strokes and natural spacing, set as one large, dominant line readable at a glance. Place it on the cleaner side of the frame, clear of the products. One high-contrast tone with a crisp edge or a small shadow for separation; no bevel and no glow. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.

PRESERVATION LOCKS:
HARDWARE & PRODUCT FIDELITY (MANDATORY) (iPhone 17 Pro, Galaxy S26 Ultra): Strictly preserve authentic industrial geometry, chassis proportions, exact physical buttons, analog sticks, ports, screen, tactile materials, and instantly recognizable silhouette. Do NOT automatically copy background setting, composition, or style from the reference photo. Zero AI melting or rubbery deformation. Each named product is its own distinct, correctly identified product, never merged, swapped, or replaced by a generic look-alike.

NEGATIVE / STRICTLY AVOID:
generic AI beauty face, same-face syndrome, perfect facial symmetry, plastic skin, waxy skin texture, excessive beauty filter, oversized eyes, unnatural teeth, generic shocked expression, unnecessary mouth-open reaction, identity drift from reference, age change, hair change, beard change, artificial beauty filter jaw slimming, no duplicated or fused fingers, no fingers intersecting the product, no unnatural hand grip, impossible arm pose, body proportion drift, wrong geometry, incorrect buttons, incorrect analog sticks, wrong ports, invented vents, wrong screen ratio, incorrect thickness, warped logo, unrecognizable silhouette, deformed hardware geometry, unmotivated rim light, orange/teal lighting by default, purple/blue gaming neon by default, glowing edges, impossible reflections, multiple incompatible light directions, volumetric light without source, too many focal points, everything equally sharp, everything equally saturated, everything equally contrasted, background competing with subject, generic centered stock-photo composition, random floating elements, too many visual metaphors, tiny important story elements, composition failing at thumbnail size, overprocessed HDR, excessive sharpening, fake bokeh, extreme color grading, excessive contrast, artificial clarity, uniform micro-detail, over-saturated skin, random red arrows, random circles, floating emojis, floating logos, lightning, sparks, fire, particles, giant text, generic shocked creator, fake UI, random VS, generic before/after division, no malformed typography, no pseudo-text, no random letters, no inconsistent glyphs, no melted letterforms, no distorted baseline, no incorrect spelling, no unnecessary 3D extrusion, no fake metallic type by default.
```

### Juiz de prompt por alvo

| Alvo | Anterior | Atual | Falhas no atual |
|---|---|---|---|
| GERAL | reprovado | aprovado | - |
| OPENAI_GPT_IMAGE_2_5_SUNBURST | reprovado | aprovado | - |
| GOOGLE_NANO_BANANA_2 | reprovado | aprovado | - |
| MIDJOURNEY_V8_2 | reprovado | aprovado | - |
### Prompt atual (OPENAI_GPT_IMAGE_2_5_SUNBURST)

```text
GOAL:
Generate an authentic, high-impact photographic YouTube thumbnail for "Dois celulares lado a lado sobre a mesa, fundo gradiente azul (featuring iPhone 17 Pro and Galaxy S26 Ultra)". Maximize click-through readability at small mobile feed scale (120px) through clean figure-ground separation and tactile physical realism.

REFERENCE ROLES:
No external image references. Ground all elements from explicit concept description.

TARGET IMAGE:
None (original photographic composition established from scratch).

CHANGE:
Establish complete photographic composition and hero subject based on: "Dois celulares lado a lado sobre a mesa, fundo gradiente azul (featuring iPhone 17 Pro and Galaxy S26 Ultra)".

ADAPT:
Balanced optical falloff between subject and background with true relative scale between objects.

PRESERVE:
1. Product fidelity of each named product (iPhone 17 Pro, Galaxy S26 Ultra): authentic industrial geometry, true proportions and scale, real button, port, and logo placement, factory materials, and an instantly recognizable silhouette; never a generic or invented look-alike. Each one is its own distinct, correctly identified product, never merged, swapped, or replaced by a generic look-alike.
2. Authentic physical materials and tactile textures.
3. Grounded real-world scale and camera perspective.

ENVIRONMENT:
Grounded physical setting as explicitly requested ("Dois celulares lado a lado sobre a mesa, fundo gradiente azul (featuring iPhone 17 Pro and Galaxy S26 Ultra)"), avoiding generic clutter.

COMPOSITION:
16:9 widescreen photographic framing (16:9 widescreen format). Clean figure-ground separation with bold subject silhouette optimized for instant readability at 120px mobile thumbnail scale. 35mm lens perspective preserving authentic spatial depth. Render the headline "QUAL COMPRAR?" exactly as written, every letter and punctuation mark, never translated or shortened. Draw one clean geometric sans with even strokes and natural spacing, set as one large, dominant line readable at a glance. Place it on the cleaner side of the frame, clear of the products. One high-contrast tone with a crisp edge or a small shadow for separation; no bevel and no glow. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.

LIGHTING:
Physically motivated illumination with clean directional key light, subtle natural fill, and soft realistic shadow falloff. Directional coherence across all elements. Zero unmotivated neon rim lights, laser glows, or synthetic halos.

AVOID:
intersecting hardware, floating embers, flying sparks, neon blue-purple wash, unmotivated rim light, domestic clutter (sofas, bedroom lamps, desks unless requested), wrong geometry, incorrect buttons, wrong ports, invented vents, wrong screen ratio, incorrect thickness, warped logo, unrecognizable silhouette, deformed hardware geometry.
```

### Prompt atual (GOOGLE_NANO_BANANA_2)

```text
SCENE:
Dois celulares lado a lado sobre a mesa, fundo gradiente azul (featuring iPhone 17 Pro and Galaxy S26 Ultra)

REFERENCE ROLES:
None (standalone visual composition generated from scratch).

WHICH IMAGE CONTROLS EACH VISUAL ATTRIBUTE:
- Products: each named product (iPhone 17 Pro, Galaxy S26 Ultra) keeps its own real industrial geometry, proportions, button and port layout, and materials, shown as distinct, correctly identified products, never merged, swapped, or a generic look-alike.

WHAT CHANGES:
Establish complete photographic thumbnail composition based on: "Dois celulares lado a lado sobre a mesa, fundo gradiente azul (featuring iPhone 17 Pro and Galaxy S26 Ultra)".

WHAT REMAINS:
1. Authentic product geometry, true proportions, and recognizable silhouette.
2. Grounded real-world scale and authentic physical materials.
3. Clean optical separation with generous negative space.

PHOTOGRAPHIC DIRECTIVES:
16:9 widescreen format (16:9 widescreen format). 35mm lens perspective preserving authentic spatial depth. Directed visual storytelling with bold subject silhouette optimized for 120px mobile thumbnail scale. Motivated physical lighting with natural directional key light and soft shadow falloff. Zero synthetic AI gloss, waxy smoothing, or neon rim lights.

TYPOGRAPHY:
Render the headline "QUAL COMPRAR?" exactly as written, every letter and punctuation mark, never translated or shortened. Draw one clean geometric sans with even strokes and natural spacing, set as one large, dominant line readable at a glance. Place it on the cleaner side of the frame, clear of the products. One high-contrast tone with a crisp edge or a small shadow for separation; no bevel and no glow. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.
```

### Prompt atual (MIDJOURNEY_V8_2)

```text
Photographic YouTube thumbnail, Dois celulares lado a lado sobre a mesa, fundo gradiente azul (featuring iPhone 17 Pro and Galaxy S26 Ultra), compelling hero presentation with clean silhouette and immediate readability at 120px mobile thumbnail scale, iPhone 17 Pro and Galaxy S26 Ultra as distinct, correctly identified real products, each with its authentic industrial geometry and true proportions, motivated directional physical key light with soft shadow falloff, 35mm lens perspective, authentic tactile textures, generous negative space. Lettering: with the words "QUAL COMPRAR?" written exactly as one cohesive display typeface, very large lettering, clean geometric sans, one high-contrast tone, readable at phone size, placed in clean negative space, clear of the main subject. Keep the existing scene, background and lighting unchanged. No other text

--ar 16:9 --v 8.2
```


### Avaliação manual (cole os dois prompts no mesmo gerador, com a mesma semente quando houver)

| Critério | Anterior | Atual |
|---|---|---|
| Consistência das letras (sem letras deformadas) | [ ] | [ ] |
| Legibilidade em tamanho de celular | [ ] | [ ] |
| Texto exato, com acentos e pontuação | [ ] | [ ] |
| Aparência natural (sem cara de adesivo) | [ ] | [ ] |
| Bevel, brilho, sombra ou contorno desnecessários | [ ] | [ ] |
| Identidade visual preservada (cena, rosto, produto, fundo) | [ ] | [ ] |
| Composição geral (espaço, hierarquia) | [ ] | [ ] |

## Criador: opinião com manchete forte

Entrada idêntica nos dois motores: título "Vale a pena comprar o PS5 em 2026?" | ideia "Eu de braços cruzados, expressão séria, na sala de casa" | texto da thumbnail "NÃO COMPRE AGORA" | sem referências | tratamento AUTO | Natural | realismo Alto.

Palavras (alvo GERAL): anterior 547, atual 552.

### Prompt anterior (GERAL)

```text
Photographic YouTube thumbnail, 16:9 widescreen format. Directed visual storytelling, authentic and grounded.
SCENE: Eu de braços cruzados, expressão séria, na sala de casa (featuring PS5, as named in the video title).
SUBJECT & FRAMING: The creator holding the device naturally toward the camera with anatomically plausible hands, natural grip around the object, correct visible finger count according to pose and natural occlusion, no duplicated or fused fingers, no fingers intersecting the product, and physically believable hand-to-object contact. Engaging eye-level medium framing with crisp figure-ground separation and clean negative space.
HUMAN EXPRESSION: Composed authentic engagement with calm curiosity and natural focus, closed mouth.
LIGHTING: Motivated interior illumination from physical room sources, grounded and balanced. Light sources are physically motivated and grounded in the scene.
ENVIRONMENT & OPTICS: Authentic living room setting with natural interior architecture and decor. balanced optical depth that preserves the lived-in environmental context without distracting from the subject, tangible materials with matte finishes.
TYPOGRAPHY: The only visible text must read exactly: "NÃO COMPRE AGORA". No extra words. No pseudo-text. No invented letters. Leave clean negative space on the right side for later typography. Do not generate random letters, words, logos, symbols, pseudo-text or decorative glyphs inside the image. Typographic style: simple clean heavy grotesk or modern neutral sans-serif with high contrast and legibility. Hierarchy: prioritize this single short message as secondary to the protagonist subject, never competing for focal dominance.

PRESERVATION LOCKS:
HARDWARE & PRODUCT FIDELITY (MANDATORY) (PS5): Strictly preserve authentic industrial geometry, chassis proportions, exact physical buttons, analog sticks, ports, screen, tactile materials, and instantly recognizable silhouette. Do NOT automatically copy background setting, composition, or style from the reference photo. Zero AI melting or rubbery deformation.
HAND & OBJECT INTERACTION: Anatomically plausible hands with natural grip around the object, correct visible finger count according to pose and natural occlusion, no duplicated or fused fingers, no fingers intersecting the product, and physically believable hand-to-object contact. Thumbs positioned naturally on controls without chassis melting.

NEGATIVE / STRICTLY AVOID:
generic AI beauty face, same-face syndrome, perfect facial symmetry, plastic skin, waxy skin texture, excessive beauty filter, oversized eyes, unnatural teeth, generic shocked expression, unnecessary mouth-open reaction, identity drift from reference, age change, hair change, beard change, artificial beauty filter jaw slimming, no duplicated or fused fingers, no fingers intersecting the product, no unnatural hand grip, impossible arm pose, body proportion drift, wrong geometry, incorrect buttons, incorrect analog sticks, wrong ports, invented vents, wrong screen ratio, incorrect thickness, warped logo, unrecognizable silhouette, deformed hardware geometry, unmotivated rim light, orange/teal lighting by default, purple/blue gaming neon by default, glowing edges, impossible reflections, multiple incompatible light directions, volumetric light without source, too many focal points, everything equally sharp, everything equally saturated, everything equally contrasted, background competing with subject, generic centered stock-photo composition, random floating elements, too many visual metaphors, tiny important story elements, composition failing at thumbnail size, overprocessed HDR, excessive sharpening, fake bokeh, extreme color grading, excessive contrast, artificial clarity, uniform micro-detail, over-saturated skin, random red arrows, random circles, floating emojis, floating logos, lightning, sparks, fire, particles, giant text, generic shocked creator, fake UI, random VS, generic before/after division, no malformed typography, no pseudo-text, no random letters, no inconsistent glyphs, no melted letterforms, no distorted baseline, no incorrect spelling, no unnecessary 3D extrusion, no fake metallic type by default.
```

### Prompt atual (GERAL)

```text
Photographic YouTube thumbnail, 16:9 widescreen format. Directed visual storytelling, authentic and grounded.
SCENE: Eu de braços cruzados, expressão séria, na sala de casa (featuring PS5).
SUBJECT & FRAMING: The creator holding the device naturally toward the camera with anatomically plausible hands, natural grip around the object, correct visible finger count according to pose and natural occlusion, no duplicated or fused fingers, no fingers intersecting the product, and physically believable hand-to-object contact. Engaging eye-level medium framing with crisp figure-ground separation and clean negative space.
HUMAN EXPRESSION: Composed authentic engagement with calm curiosity and natural focus, closed mouth.
LIGHTING: Motivated interior illumination from physical room sources, grounded and balanced. Light sources are physically motivated and grounded in the scene.
ENVIRONMENT & OPTICS: Authentic living room setting with natural interior architecture and decor. balanced optical depth that preserves the lived-in environmental context without distracting from the subject, tangible materials with matte finishes.
TYPOGRAPHY: Render the headline "NÃO COMPRE AGORA" exactly as written, every letter, accent and punctuation mark, never translated or shortened. Draw one heavy condensed display face with consistent proportions and open counters, set on two lines at most, large and comfortably spaced. Place it over the flattest area of the background, clear of the subject. Maximum value contrast against the background, with at most one restrained edge or a tight soft shadow. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.

PRESERVATION LOCKS:
HARDWARE & PRODUCT FIDELITY (MANDATORY) (PS5): Strictly preserve authentic industrial geometry, chassis proportions, exact physical buttons, analog sticks, ports, screen, tactile materials, and instantly recognizable silhouette. Do NOT automatically copy background setting, composition, or style from the reference photo. Zero AI melting or rubbery deformation.
HAND & OBJECT INTERACTION: Anatomically plausible hands with natural grip around the object, correct visible finger count according to pose and natural occlusion, no duplicated or fused fingers, no fingers intersecting the product, and physically believable hand-to-object contact. Thumbs positioned naturally on controls without chassis melting.

NEGATIVE / STRICTLY AVOID:
generic AI beauty face, same-face syndrome, perfect facial symmetry, plastic skin, waxy skin texture, excessive beauty filter, oversized eyes, unnatural teeth, generic shocked expression, unnecessary mouth-open reaction, identity drift from reference, age change, hair change, beard change, artificial beauty filter jaw slimming, no duplicated or fused fingers, no fingers intersecting the product, no unnatural hand grip, impossible arm pose, body proportion drift, wrong geometry, incorrect buttons, incorrect analog sticks, wrong ports, invented vents, wrong screen ratio, incorrect thickness, warped logo, unrecognizable silhouette, deformed hardware geometry, unmotivated rim light, orange/teal lighting by default, purple/blue gaming neon by default, glowing edges, impossible reflections, multiple incompatible light directions, volumetric light without source, too many focal points, everything equally sharp, everything equally saturated, everything equally contrasted, background competing with subject, generic centered stock-photo composition, random floating elements, too many visual metaphors, tiny important story elements, composition failing at thumbnail size, overprocessed HDR, excessive sharpening, fake bokeh, extreme color grading, excessive contrast, artificial clarity, uniform micro-detail, over-saturated skin, random red arrows, random circles, floating emojis, floating logos, lightning, sparks, fire, particles, giant text, generic shocked creator, fake UI, random VS, generic before/after division, no malformed typography, no pseudo-text, no random letters, no inconsistent glyphs, no melted letterforms, no distorted baseline, no incorrect spelling, no unnecessary 3D extrusion, no fake metallic type by default.
```

### Juiz de prompt por alvo

| Alvo | Anterior | Atual | Falhas no atual |
|---|---|---|---|
| GERAL | reprovado | aprovado | - |
| OPENAI_GPT_IMAGE_2_5_SUNBURST | reprovado | aprovado | - |
| GOOGLE_NANO_BANANA_2 | reprovado | aprovado | - |
| MIDJOURNEY_V8_2 | reprovado | aprovado | - |
### Prompt atual (OPENAI_GPT_IMAGE_2_5_SUNBURST)

```text
GOAL:
Generate an authentic, high-impact photographic YouTube thumbnail for "Eu de braços cruzados, expressão séria, na sala de casa (featuring PS5)". Maximize click-through readability at small mobile feed scale (120px) through clean figure-ground separation and tactile physical realism.

REFERENCE ROLES:
No external image references. Ground all elements from explicit concept description.

TARGET IMAGE:
None (original photographic composition established from scratch).

CHANGE:
Establish complete photographic composition and hero subject based on: "Eu de braços cruzados, expressão séria, na sala de casa (featuring PS5)".

ADAPT:
Anatomically plausible hands with natural grip, correct visible finger count according to pose and natural occlusion. Balanced optical falloff between subject and background.

PRESERVE:
1. Natural human facial asymmetry, closed-mouth composed expression, and natural skin texture without plastic smoothing.
2. Product fidelity of the named product (PS5): authentic industrial geometry, true proportions and scale, real button, port, and logo placement, factory materials, and an instantly recognizable silhouette; never a generic or invented look-alike.
3. Authentic physical materials and tactile textures.
4. Grounded real-world scale and camera perspective.

ENVIRONMENT:
Grounded physical setting as explicitly requested ("Eu de braços cruzados, expressão séria, na sala de casa (featuring PS5)"), avoiding generic clutter.

COMPOSITION:
16:9 widescreen photographic framing (16:9 widescreen format). Clean figure-ground separation with bold subject silhouette optimized for instant readability at 120px mobile thumbnail scale. 35mm lens perspective preserving authentic spatial depth. Render the headline "NÃO COMPRE AGORA" exactly as written, every letter, accent and punctuation mark, never translated or shortened. Draw one heavy condensed display face with consistent proportions and open counters, set on two lines at most, large and comfortably spaced. Place it over the flattest area of the background, clear of the subject. Maximum value contrast against the background, with at most one restrained edge or a tight soft shadow. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.

LIGHTING:
Physically motivated illumination with clean directional key light, subtle natural fill, and soft realistic shadow falloff. Directional coherence across all elements. Zero unmotivated neon rim lights, laser glows, or synthetic halos.

AVOID:
face swap, face paste, flat frontal face pasted on angled head, distorted skull geometry, plastic waxy skin, beauty filter jaw slimming, open mouth screaming shock face, deformed hands, extra fingers, duplicated digits, intersecting hardware, floating embers, flying sparks, neon blue-purple wash, unmotivated rim light, domestic clutter (sofas, bedroom lamps, desks unless requested), generic AI beauty face, same-face syndrome, perfect facial symmetry, excessive beauty filter, oversized eyes, unnatural teeth, generic shocked expression, unnecessary mouth-open reaction, identity drift from reference, age change, hair change, beard change, fingers intersecting the product, unnatural hand grip.
```

### Prompt atual (GOOGLE_NANO_BANANA_2)

```text
SCENE:
Eu de braços cruzados, expressão séria, na sala de casa (featuring PS5)

REFERENCE ROLES:
None (standalone visual composition generated from scratch).

WHICH IMAGE CONTROLS EACH VISUAL ATTRIBUTE:
- Product: the named product (PS5) keeps its real industrial geometry, proportions, button and port layout, and materials, never a generic look-alike.

WHAT CHANGES:
Establish complete photographic thumbnail composition based on: "Eu de braços cruzados, expressão séria, na sala de casa (featuring PS5)".

WHAT REMAINS:
1. Composed human expression with closed mouth and natural skin texture without plastic smoothing.
2. Authentic product geometry, true proportions, and recognizable silhouette.
3. Grounded real-world scale and authentic physical materials.
4. Clean optical separation with generous negative space.

PHOTOGRAPHIC DIRECTIVES:
16:9 widescreen format (16:9 widescreen format). 35mm lens perspective preserving authentic spatial depth. Directed visual storytelling with bold subject silhouette optimized for 120px mobile thumbnail scale. Motivated physical lighting with natural directional key light and soft shadow falloff. Zero synthetic AI gloss, waxy smoothing, or neon rim lights.

TYPOGRAPHY:
Render the headline "NÃO COMPRE AGORA" exactly as written, every letter, accent and punctuation mark, never translated or shortened. Draw one heavy condensed display face with consistent proportions and open counters, set on two lines at most, large and comfortably spaced. Place it over the flattest area of the background, clear of the subject. Maximum value contrast against the background, with at most one restrained edge or a tight soft shadow. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.
```

### Prompt atual (MIDJOURNEY_V8_2)

```text
Photographic YouTube thumbnail, Eu de braços cruzados, expressão séria, na sala de casa (featuring PS5), compelling hero presentation with clean silhouette and immediate readability at 120px mobile thumbnail scale, natural composed human expression with closed mouth, the real PS5 with authentic industrial geometry, true proportions, and real buttons and ports, motivated directional physical key light with soft shadow falloff, 35mm lens perspective, authentic tactile textures, generous negative space. Lettering: with the words "NÃO COMPRE AGORA" written exactly as one cohesive display typeface, large lettering, heavy condensed caps, high contrast, readable at phone size, placed in clean negative space, clear of the main subject. Keep the existing scene, background and lighting unchanged. No other text

--ar 16:9 --v 8.2
```


### Avaliação manual (cole os dois prompts no mesmo gerador, com a mesma semente quando houver)

| Critério | Anterior | Atual |
|---|---|---|
| Consistência das letras (sem letras deformadas) | [ ] | [ ] |
| Legibilidade em tamanho de celular | [ ] | [ ] |
| Texto exato, com acentos e pontuação | [ ] | [ ] |
| Aparência natural (sem cara de adesivo) | [ ] | [ ] |
| Bevel, brilho, sombra ou contorno desnecessários | [ ] | [ ] |
| Identidade visual preservada (cena, rosto, produto, fundo) | [ ] | [ ] |
| Composição geral (espaço, hierarquia) | [ ] | [ ] |

## Comparação de produto (extra)

Entrada idêntica nos dois motores: título "Air fryer barata vs cara: teste real" | ideia "Duas air fryers lado a lado na bancada da cozinha" | texto da thumbnail "VALE O PREÇO?" | sem referências | tratamento AUTO | Natural | realismo Alto.

Palavras (alvo GERAL): anterior 533, atual 545.

### Prompt anterior (GERAL)

```text
Photographic YouTube thumbnail, 16:9 widescreen format. Directed visual storytelling, authentic and grounded.
SCENE: Duas air fryers lado a lado na bancada da cozinha.
SUBJECT & FRAMING: The creator holding the device naturally toward the camera with anatomically plausible hands, natural grip around the object, correct visible finger count according to pose and natural occlusion, no duplicated or fused fingers, no fingers intersecting the product, and physically believable hand-to-object contact. Engaging eye-level medium framing with crisp figure-ground separation and clean negative space.
HUMAN EXPRESSION: Composed authentic engagement with calm curiosity and natural focus, closed mouth.
LIGHTING: Diffused high-CRI task lighting with soft natural shadows. Light sources are physically motivated and grounded in the scene.
ENVIRONMENT & OPTICS: Organized workbench with clean work surface and authentic tools. balanced optical depth that preserves environmental context without distracting from the subject, tangible materials with matte finishes.
TYPOGRAPHY: The only visible text must read exactly: "VALE O PREÇO?". No extra words. No pseudo-text. No invented letters. Leave clean negative space on the right side for later typography. Do not generate random letters, words, logos, symbols, pseudo-text or decorative glyphs inside the image. Typographic style: simple clean heavy grotesk or modern neutral sans-serif with high contrast and legibility. Hierarchy: prioritize this single short message as secondary to the protagonist subject, never competing for focal dominance.

PRESERVATION LOCKS:
HARDWARE & PRODUCT FIDELITY (MANDATORY): Strictly preserve authentic industrial geometry, chassis proportions, exact physical buttons, analog sticks, ports, screen, tactile materials, and instantly recognizable silhouette. Do NOT automatically copy background setting, composition, or style from the reference photo. Zero AI melting or rubbery deformation.
HAND & OBJECT INTERACTION: Anatomically plausible hands with natural grip around the object, correct visible finger count according to pose and natural occlusion, no duplicated or fused fingers, no fingers intersecting the product, and physically believable hand-to-object contact. Thumbs positioned naturally on controls without chassis melting.

NEGATIVE / STRICTLY AVOID:
generic AI beauty face, same-face syndrome, perfect facial symmetry, plastic skin, waxy skin texture, excessive beauty filter, oversized eyes, unnatural teeth, generic shocked expression, unnecessary mouth-open reaction, identity drift from reference, age change, hair change, beard change, artificial beauty filter jaw slimming, no duplicated or fused fingers, no fingers intersecting the product, no unnatural hand grip, impossible arm pose, body proportion drift, wrong geometry, incorrect buttons, incorrect analog sticks, wrong ports, invented vents, wrong screen ratio, incorrect thickness, warped logo, unrecognizable silhouette, deformed hardware geometry, unmotivated rim light, orange/teal lighting by default, purple/blue gaming neon by default, glowing edges, impossible reflections, multiple incompatible light directions, volumetric light without source, too many focal points, everything equally sharp, everything equally saturated, everything equally contrasted, background competing with subject, generic centered stock-photo composition, random floating elements, too many visual metaphors, tiny important story elements, composition failing at thumbnail size, overprocessed HDR, excessive sharpening, fake bokeh, extreme color grading, excessive contrast, artificial clarity, uniform micro-detail, over-saturated skin, random red arrows, random circles, floating emojis, floating logos, lightning, sparks, fire, particles, giant text, generic shocked creator, fake UI, random VS, generic before/after division, no malformed typography, no pseudo-text, no random letters, no inconsistent glyphs, no melted letterforms, no distorted baseline, no incorrect spelling, no unnecessary 3D extrusion, no fake metallic type by default.
```

### Prompt atual (GERAL)

```text
Photographic YouTube thumbnail, 16:9 widescreen format. Directed visual storytelling, authentic and grounded.
SCENE: Duas air fryers lado a lado na bancada da cozinha.
SUBJECT & FRAMING: The creator holding the device naturally toward the camera with anatomically plausible hands, natural grip around the object, correct visible finger count according to pose and natural occlusion, no duplicated or fused fingers, no fingers intersecting the product, and physically believable hand-to-object contact. Engaging eye-level medium framing with crisp figure-ground separation and clean negative space.
HUMAN EXPRESSION: Composed authentic engagement with calm curiosity and natural focus, closed mouth.
LIGHTING: Diffused high-CRI task lighting with soft natural shadows. Light sources are physically motivated and grounded in the scene.
ENVIRONMENT & OPTICS: Organized workbench with clean work surface and authentic tools. balanced optical depth that preserves environmental context without distracting from the subject, tangible materials with matte finishes.
TYPOGRAPHY: Render the headline "VALE O PREÇO?" exactly as written, every letter, accent, cedilha and punctuation mark, never translated or shortened. Draw one clean geometric sans with even strokes and natural spacing, set on two lines at most, large and comfortably spaced. Place it on the cleaner side of the frame, clear of the products. One high-contrast tone with a crisp edge or a small shadow for separation; no bevel and no glow. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.

PRESERVATION LOCKS:
HARDWARE & PRODUCT FIDELITY (MANDATORY): Strictly preserve authentic industrial geometry, chassis proportions, exact physical buttons, analog sticks, ports, screen, tactile materials, and instantly recognizable silhouette. Do NOT automatically copy background setting, composition, or style from the reference photo. Zero AI melting or rubbery deformation.
HAND & OBJECT INTERACTION: Anatomically plausible hands with natural grip around the object, correct visible finger count according to pose and natural occlusion, no duplicated or fused fingers, no fingers intersecting the product, and physically believable hand-to-object contact. Thumbs positioned naturally on controls without chassis melting.

NEGATIVE / STRICTLY AVOID:
generic AI beauty face, same-face syndrome, perfect facial symmetry, plastic skin, waxy skin texture, excessive beauty filter, oversized eyes, unnatural teeth, generic shocked expression, unnecessary mouth-open reaction, identity drift from reference, age change, hair change, beard change, artificial beauty filter jaw slimming, no duplicated or fused fingers, no fingers intersecting the product, no unnatural hand grip, impossible arm pose, body proportion drift, wrong geometry, incorrect buttons, incorrect analog sticks, wrong ports, invented vents, wrong screen ratio, incorrect thickness, warped logo, unrecognizable silhouette, deformed hardware geometry, unmotivated rim light, orange/teal lighting by default, purple/blue gaming neon by default, glowing edges, impossible reflections, multiple incompatible light directions, volumetric light without source, too many focal points, everything equally sharp, everything equally saturated, everything equally contrasted, background competing with subject, generic centered stock-photo composition, random floating elements, too many visual metaphors, tiny important story elements, composition failing at thumbnail size, overprocessed HDR, excessive sharpening, fake bokeh, extreme color grading, excessive contrast, artificial clarity, uniform micro-detail, over-saturated skin, random red arrows, random circles, floating emojis, floating logos, lightning, sparks, fire, particles, giant text, generic shocked creator, fake UI, random VS, generic before/after division, no malformed typography, no pseudo-text, no random letters, no inconsistent glyphs, no melted letterforms, no distorted baseline, no incorrect spelling, no unnecessary 3D extrusion, no fake metallic type by default.
```

### Juiz de prompt por alvo

| Alvo | Anterior | Atual | Falhas no atual |
|---|---|---|---|
| GERAL | reprovado | aprovado | - |
| OPENAI_GPT_IMAGE_2_5_SUNBURST | reprovado | aprovado | - |
| GOOGLE_NANO_BANANA_2 | reprovado | aprovado | - |
| MIDJOURNEY_V8_2 | reprovado | aprovado | - |
### Prompt atual (OPENAI_GPT_IMAGE_2_5_SUNBURST)

```text
GOAL:
Generate an authentic, high-impact photographic YouTube thumbnail for "Duas air fryers lado a lado na bancada da cozinha". Maximize click-through readability at small mobile feed scale (120px) through clean figure-ground separation and tactile physical realism.

REFERENCE ROLES:
No external image references. Ground all elements from explicit concept description.

TARGET IMAGE:
None (original photographic composition established from scratch).

CHANGE:
Establish complete photographic composition and hero subject based on: "Duas air fryers lado a lado na bancada da cozinha".

ADAPT:
Anatomically plausible hands with natural grip, correct visible finger count according to pose and natural occlusion. Balanced optical falloff between subject and background.

PRESERVE:
1. Natural human facial asymmetry, closed-mouth composed expression, and natural skin texture without plastic smoothing.
2. Product fidelity of the named product: authentic industrial geometry, true proportions and scale, real button, port, and logo placement, factory materials, and an instantly recognizable silhouette; never a generic or invented look-alike.
3. Authentic physical materials and tactile textures.
4. Grounded real-world scale and camera perspective.

ENVIRONMENT:
Grounded physical setting as explicitly requested ("Duas air fryers lado a lado na bancada da cozinha"), avoiding generic clutter.

COMPOSITION:
16:9 widescreen photographic framing (16:9 widescreen format). Clean figure-ground separation with bold subject silhouette optimized for instant readability at 120px mobile thumbnail scale. 35mm lens perspective preserving authentic spatial depth. Render the headline "VALE O PREÇO?" exactly as written, every letter, accent, cedilha and punctuation mark, never translated or shortened. Draw one clean geometric sans with even strokes and natural spacing, set on two lines at most, large and comfortably spaced. Place it on the cleaner side of the frame, clear of the products. One high-contrast tone with a crisp edge or a small shadow for separation; no bevel and no glow. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.

LIGHTING:
Physically motivated illumination with clean directional key light, subtle natural fill, and soft realistic shadow falloff. Directional coherence across all elements. Zero unmotivated neon rim lights, laser glows, or synthetic halos.

AVOID:
face swap, face paste, flat frontal face pasted on angled head, distorted skull geometry, plastic waxy skin, beauty filter jaw slimming, open mouth screaming shock face, deformed hands, extra fingers, duplicated digits, intersecting hardware, floating embers, flying sparks, neon blue-purple wash, unmotivated rim light, domestic clutter (sofas, bedroom lamps, desks unless requested), generic AI beauty face, same-face syndrome, perfect facial symmetry, excessive beauty filter, oversized eyes, unnatural teeth, generic shocked expression, unnecessary mouth-open reaction, identity drift from reference, age change, hair change, beard change, fingers intersecting the product, unnatural hand grip.
```

### Prompt atual (GOOGLE_NANO_BANANA_2)

```text
SCENE:
Duas air fryers lado a lado na bancada da cozinha

REFERENCE ROLES:
None (standalone visual composition generated from scratch).

WHICH IMAGE CONTROLS EACH VISUAL ATTRIBUTE:
- Product: the named product keeps its real industrial geometry, proportions, button and port layout, and materials, never a generic look-alike.

WHAT CHANGES:
Establish complete photographic thumbnail composition based on: "Duas air fryers lado a lado na bancada da cozinha".

WHAT REMAINS:
1. Composed human expression with closed mouth and natural skin texture without plastic smoothing.
2. Authentic product geometry, true proportions, and recognizable silhouette.
3. Grounded real-world scale and authentic physical materials.
4. Clean optical separation with generous negative space.

PHOTOGRAPHIC DIRECTIVES:
16:9 widescreen format (16:9 widescreen format). 35mm lens perspective preserving authentic spatial depth. Directed visual storytelling with bold subject silhouette optimized for 120px mobile thumbnail scale. Motivated physical lighting with natural directional key light and soft shadow falloff. Zero synthetic AI gloss, waxy smoothing, or neon rim lights.

TYPOGRAPHY:
Render the headline "VALE O PREÇO?" exactly as written, every letter, accent, cedilha and punctuation mark, never translated or shortened. Draw one clean geometric sans with even strokes and natural spacing, set on two lines at most, large and comfortably spaced. Place it on the cleaner side of the frame, clear of the products. One high-contrast tone with a crisp edge or a small shadow for separation; no bevel and no glow. Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.
```

### Prompt atual (MIDJOURNEY_V8_2)

```text
Photographic YouTube thumbnail, Duas air fryers lado a lado na bancada da cozinha, compelling hero presentation with clean silhouette and immediate readability at 120px mobile thumbnail scale, natural composed human expression with closed mouth, the real product with authentic industrial geometry, true proportions, and real buttons and ports, motivated directional physical key light with soft shadow falloff, 35mm lens perspective, authentic tactile textures, generous negative space. Lettering: with the words "VALE O PREÇO?" written exactly as one cohesive display typeface, large lettering, clean geometric sans, one high-contrast tone, readable at phone size, placed in clean negative space, clear of the main subject. Keep the existing scene, background and lighting unchanged. No other text

--ar 16:9 --v 8.2
```


### Avaliação manual (cole os dois prompts no mesmo gerador, com a mesma semente quando houver)

| Critério | Anterior | Atual |
|---|---|---|
| Consistência das letras (sem letras deformadas) | [ ] | [ ] |
| Legibilidade em tamanho de celular | [ ] | [ ] |
| Texto exato, com acentos e pontuação | [ ] | [ ] |
| Aparência natural (sem cara de adesivo) | [ ] | [ ] |
| Bevel, brilho, sombra ou contorno desnecessários | [ ] | [ ] |
| Identidade visual preservada (cena, rosto, produto, fundo) | [ ] | [ ] |
| Composição geral (espaço, hierarquia) | [ ] | [ ] |

