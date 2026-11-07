// Typography judge (Quality Lab). Reads a generated prompt and checks the QUALITY of its typography
// instructions, not just the presence of words:
//   - the requested wording survives exactly (accents, capitals, punctuation);
//   - the instruction is positive and coherent: no contradiction between "render" and "do not draw";
//   - the lettering choices fit the genre of the case (gaming, tech, opinion...);
//   - the instruction is not inflated and not a copy-pasted boilerplate across unrelated cases;
//   - the rest of the image is protected, and nothing is invented when no text was requested.
// Deterministic. Visual quality of real images is judged separately (see real-image-kit.md).

const SENTENCE = /(?<=[.!?])\s+/;

/**
 * The lettering instructions of a prompt: the TYPOGRAPHY line(s), or the lettering phrase of a Midjourney-style
 * prompt. The AVOID / NEGATIVE lists are not lettering instructions and are excluded.
 */
export function typographySentences(prompt) {
  const lines = (prompt || '').split(/\n+/).map(l => l.trim()).filter(Boolean);
  const typo = lines.filter(l => /^TYPOGRAPHY:/.test(l)).map(l => l.replace(/^TYPOGRAPHY:\s*/, ''));
  if (typo.length) {
    // Every sentence of the TYPOGRAPHY block is part of the lettering instruction.
    return typo.flatMap(line => line.split(SENTENCE)).map(s => s.trim()).filter(Boolean);
  }
  const LETTERING = /\b(letter|lettering|typeface|display|headline|typograph|outline|glyph|font|with the words)/i;
  return lines
    .filter(l => !/^(NEGATIVE|AVOID|STRICTLY|PRESERVATION)/.test(l))
    .flatMap(line => line.split(SENTENCE))
    .map(s => s.trim())
    .filter(s => s && (s.match(/,/g) || []).length < 6 && LETTERING.test(s));
}

function wordsIn(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

// Lettering choices, one category each. A good instruction makes concrete choices in several of them.
const CATEGORIES = {
  construction: /(display face|display typeface|geometric sans|condensed display|letters? (?:drawn|constructed)|glyph|proportions)/i,
  size: /(large|dominant|very large|compact lines|two lines|medium-large|readable at (?:a glance|phone))/i,
  placement: /(clear of the face|clear of the product|negative space|calm area|away from)/i,
  colour: /(accent colour|one tone|high[- ]contrast|warm|value contrast|colour)/i,
  effects: /(outline|shadow|glow|bevel|controlled edge|no outline|no glow|edge)/i,
};

const GENRE_EXPECT = {
  gaming: /(display face|expressive|accent colour)/i,
  tech: /(geometric sans|no outline|no glow)/i,
  opinion: /(condensed|heavy|maximum value contrast)/i,
  food: /(warm|rounded)/i,
  general: /(coherent display|display face)/i,
};

/**
 * Judges one prompt. meta: { exactText?, genre?, requestedText: boolean, protectsLogo?, mustNotContain?[] }.
 * Returns { checks: [{id, ok, detail}], score, pass }.
 */
export function judgeTypography(prompt, meta = {}) {
  const checks = [];
  const add = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail });
  const typo = typographySentences(prompt);
  const typoText = typo.join(' ');

  if (meta.requestedText) {
    add('exact-wording', meta.exactText && prompt.includes(`"${meta.exactText}"`), `"${meta.exactText}" must appear in quotes, unchanged`);
    add('render-instruction', /Render the headline|with the words "[^"]+" written/.test(prompt), 'the generator is asked to render the requested headline');
    add('no-contradiction', !/Do not draw the headline/.test(prompt) && !/no text, no letters/.test(prompt), 'no "do not draw" next to a request to render');
    add('lettering-coherent', typo.length >= 1 && typo.length <= 6, `${typo.length} lettering sentence(s): 1 to 6 keeps it focused`);
    add('section-length', wordsIn(typoText) <= 120, `${wordsIn(typoText)} words of lettering instruction (<= 120)`);
    const cats = Object.entries(CATEGORIES).filter(([, re]) => re.test(typoText)).map(([k]) => k);
    add('concrete-choices', cats.length >= 3, `concrete choices in: ${cats.join(', ') || 'none'} (need >= 3)`);
    if (meta.genre && GENRE_EXPECT[meta.genre]) {
      add('genre-fit', GENRE_EXPECT[meta.genre].test(typoText), `lettering fits the "${meta.genre}" genre`);
    }
    add('scene-preserved', /keep the (existing )?background|keep the scene|keep the existing|untouched|as they are/i.test(prompt), 'the rest of the image is protected');
    add('no-font-promise', !/exact (?:font|typeface) (?:is|will be|must)|will render (?:in|with) [A-Z][a-z]+ (?:font|typeface)|Anton typeface/i.test(prompt), 'no promise of a named typeface');
  } else {
    add('no-invented-title', !/Render the headline|with the words "[^"]+" written|real typography layer/.test(prompt), 'no headline invented when none was requested');
  }
  if (meta.protectsLogo) {
    add('logo-preserved', /logo|printed markings|official/i.test(prompt), 'existing logotypes stay accurate and are not redrawn');
  }
  for (const bad of meta.mustNotContain || []) {
    add(`no-${String(bad).slice(0, 24)}`, !bad.test(prompt), `removed: ${bad}`);
  }
  const passed = checks.filter(c => c.ok).length;
  return { checks, score: passed / checks.length, pass: passed === checks.length };
}

/** Extracts the lettering sentences for a before/after comparison in reports. */
export function lettering(prompt) {
  return typographySentences(prompt).join(' ');
}

/** Sentences that repeat across several cases are boilerplate; returns those appearing in >= `min` cases. */
export function boilerplate(promptsByCase, min = 4) {
  const count = new Map();
  for (const prompt of Object.values(promptsByCase)) {
    for (const s of new Set(typographySentences(prompt))) count.set(s, (count.get(s) || 0) + 1);
  }
  return [...count.entries()].filter(([, n]) => n >= min).map(([s, n]) => ({ sentence: s, cases: n }));
}
