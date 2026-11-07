/**
 * Separates the creator's free text into what should be DRAWN (scene) and what are
 * instructions ABOUT the image (exclusions, meta requests like "chamativo").
 *
 * Why: the scene text is pasted into the visual description of every prompt. Phrases such as
 * "sem neon" or "sem cara de IA" put the words "neon" / "IA" into the positive scene, where image
 * models tend to draw them; meta words like "chamativo" are requests, not objects.
 *
 * Deterministic and conservative:
 * - only exclusions whose object is a known visual effect/style are moved out of the scene;
 *   anything else ("sem camisa") stays in the scene exactly as written, because it describes
 *   what to draw;
 * - nothing is translated except those known exclusion terms; proper nouns, product names and
 *   quoted text are never touched.
 */

// Negated object (Portuguese, lowercase, accents optional) -> English exclusion phrase.
const EXCLUSION_TERMS: { re: RegExp; en: string }[] = [
  { re: /^(?:luz(?:es)?\s+)?neon(?:s)?(?:\s+\p{L}+)?$/u, en: 'neon lighting' },
  { re: /^(?:a\s+)?(?:cara|apar[eê]ncia|jeito|visual|estilo)\s+(?:de\s+)?(?:ia|ai|intelig[eê]ncia\s+artificial)$/u, en: 'synthetic AI-generated look' },
  { re: /^(?:ia|ai)$/u, en: 'synthetic AI-generated look' },
  { re: /^(?:parecer|ficar\s+com\s+cara\s+de|ter\s+cara\s+de)\s+(?:(?:feit[oa]\s+(?:por|com|de)\s+|gerad[oa]\s+por\s+)?(?:ia|ai|intelig[eê]ncia\s+artificial)|artificial|fake)$/u, en: 'synthetic AI-generated look' },
  { re: /^(?:os\s+)?exageros?$|^(?:nada\s+)?exagerad[oa]s?$/u, en: 'exaggerated effects' },
  { re: /^(?:as\s+)?setas?(?:\s+vermelhas?)?$/u, en: 'arrows' },
  { re: /^(?:os\s+)?c[ií]rculos?(?:\s+vermelhos?)?$/u, en: 'circles' },
  { re: /^(?:os\s+)?emojis?$/u, en: 'emojis' },
  { re: /^(?:o\s+)?fogo$|^chamas?$/u, en: 'fire' },
  { re: /^(?:os\s+)?raios?$|^rel[aâ]mpagos?$/u, en: 'lightning' },
  { re: /^(?:as\s+)?fa[ií]scas?$|^part[ií]culas?$/u, en: 'sparks and particles' },
  { re: /^(?:o\s+)?brilhos?(?:\s+\p{L}+)?$|^glow$/u, en: 'artificial glow' },
  { re: /^(?:os\s+)?efeitos?(?:\s+\p{L}+)?$/u, en: 'added visual effects' },
  { re: /^(?:os\s+)?filtros?(?:\s+\p{L}+)?$/u, en: 'artificial photo filters' },
  { re: /^(?:a\s+)?pele\s+(?:de\s+)?pl[aá]stic[oa]$/u, en: 'plastic-looking skin' },
  { re: /^(?:a\s+)?polui[çc][aã]o\s+visual$|^bagun[çc]a$|^(?:muita\s+)?informa[çc][aã]o$/u, en: 'visual clutter' },
  { re: /^(?:os\s+)?clich[eê]s?$/u, en: 'cliches' },
  { re: /^(?:as\s+)?caretas?$|^(?:a\s+)?boca\s+aberta$|^(?:cara\s+de\s+)?(?:susto|choque)$/u, en: 'exaggerated shocked expression' },
  { re: /^(?:o\s+)?texto$|^(?:as\s+)?letras$|^escrita$/u, en: 'rendered text' },
  { re: /^(?:a\s+)?marca\s+d[''`´]?\s*[aá]gua$/u, en: 'watermarks' },
  { re: /^hdr$|^(?:a\s+)?satura[çc][aã]o(?:\s+\p{L}+)?$/u, en: 'overprocessed HDR and saturation' },
];

const NEGATION_SPAN = /(?<=^|[\s,;.(])((?:sem|nada\s+de|n[ãa]o\s+quero|evite|evitar)\s+([^,;.!?()]+?))(?=\s+e\s+(?:sem|nada|n[ãa]o)\b|[,;.!?()]|$)/giu;

// Requests about the thumbnail itself, not objects in it (their intent is handled by
// translateVagueBuzzwords, which still reads the original text).
const META_PHRASES = [
  /\b(?:bem\s+|bastante\s+|super\s+|mais\s+)?chamativ[oa]s?\b/giu,
  /\bque\s+chame\s+(?:a\s+)?aten[çc][ãa]o\b/giu,
  /\b(?:bem\s+|mais\s+)?impactantes?\b/giu,
  /\bviral\b/giu,
  /\bclickbait\b/giu,
  /\bde\s+alta\s+qualidade\b|\bem\s+alta\s+(?:qualidade|resolu[çc][ãa]o)\b/giu,
  /\b(?:ultra|hiper|hyper)[\s-]?realistas?\b/giu,
  /\b(?:em\s+)?(?:4k|8k)\b/giu,
];

// Midjourney's --no reads every word separately ("--no neon lighting" = no neon + no lighting),
// so only exclusions that work as single words are passed; the others are left out.
const MIDJOURNEY_NO_TERMS: Record<string, string[]> = {
  'neon lighting': ['neon'],
  arrows: ['arrows'],
  circles: ['circles'],
  emojis: ['emojis'],
  fire: ['fire'],
  lightning: ['lightning'],
  'sparks and particles': ['sparks', 'particles'],
  'artificial glow': ['glow'],
  'visual clutter': ['clutter'],
  'rendered text': ['text'],
  watermarks: ['watermark'],
  'overprocessed HDR and saturation': ['HDR'],
};

export function midjourneyNoTerms(exclusionsEn: string[], hasExactText = false): string[] {
  const terms = exclusionsEn.flatMap(e => MIDJOURNEY_NO_TERMS[e] || []);
  // Never forbid text when the creator asked for exact words in the image.
  return [...new Set(hasExactText ? terms.filter(t => t !== 'text') : terms)];
}

export interface ParsedIdea {
  /** What to draw, in the creator's own words (known exclusions and meta requests removed). */
  scene: string;
  /** English exclusion phrases for known visual effects/styles the creator ruled out. */
  exclusionsEn: string[];
  /** The original negated phrases that were moved out of the scene. */
  exclusionsRaw: string[];
  /** Meta requests removed from the scene ("chamativo", "viral"). */
  metaRemoved: string[];
}

const GAP = '⁣'; // invisible separator marking where an exclusion was removed

function normalizeObject(text: string): string {
  return text.toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();
}

function tidy(text: string): string {
  return text
    .replace(/\s+([,;.!?])/g, '$1')
    .replace(/([,;])\s*(?=[,;.!?]|$)/g, '')
    .replace(/(^|[,;]\s*)e\s+(?=[,;.!?]|$)/g, '$1')
    .replace(/\s+e\s*([,;.!?]|$)/g, '$1')
    // Leading punctuation or a dangling "e " left by a removed exclusion; never the "e" of a word ("eu").
    .replace(/^(?:[\s,;.]|e\s)+(?=\p{L})/u, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s,;]+$/g, '')
    .trim();
}

// Quoted text is what the creator wants written in the image: never parsed as instructions.
const QUOTED = /"[^"\n]*"|“[^”\n]*”|«[^»\n]*»/gu;
const QUOTE_MARK = (i: number) => `\uE000${i}\uE001`; // private-use characters: never typed by creators

export function parseCreatorIdea(idea: string): ParsedIdea {
  const original = (idea || '').trim();
  if (!original) return { scene: '', exclusionsEn: [], exclusionsRaw: [], metaRemoved: [] };

  const quoted: string[] = [];
  const masked = original.replace(QUOTED, q => QUOTE_MARK(quoted.push(q) - 1));
  const unmask = (text: string) => text.replace(/\uE000(\d+)\uE001/gu, (_m, i: string) => quoted[Number(i)]);

  const exclusionsEn: string[] = [];
  const exclusionsRaw: string[] = [];
  let scene = masked.replace(NEGATION_SPAN, (span: string, _full: string, object: string) => {
    // "sem neon ou exageros" -> ["neon", "exageros"]; every part must be a known effect/style.
    const parts = object.split(/\s+(?:ou|e|nem|or|and)\s+|\s*\/\s*/iu).map(normalizeObject).filter(Boolean);
    const terms = parts.map(part => EXCLUSION_TERMS.find(t => t.re.test(part)));
    if (terms.length === 0 || terms.some(t => !t)) return span; // May describe the scene ("sem camisa"): keep it.
    for (const term of terms) if (term && !exclusionsEn.includes(term.en)) exclusionsEn.push(term.en);
    exclusionsRaw.push(span.trim());
    return GAP;
  });
  // Drop the connector that joined a removed exclusion ("X e sem neon", "sem neon e sem Y").
  scene = scene
    .replace(new RegExp(`\\s+(?:e|ou)\\s*${GAP}`, 'g'), GAP)
    .replace(new RegExp(`${GAP}\\s+(?:e|ou)\\s+`, 'g'), ' ')
    .replace(new RegExp(GAP, 'g'), '');

  const metaRemoved: string[] = [];
  for (const re of META_PHRASES) {
    scene = scene.replace(re, m => {
      metaRemoved.push(m.trim());
      return '';
    });
  }

  // Nothing was removed: return the creator's text exactly as written (no punctuation or
  // connector "cleanup" on text this function did not change: "e aí", a trailing "e", "...").
  if (exclusionsRaw.length === 0 && metaRemoved.length === 0) {
    return { scene: original, exclusionsEn, exclusionsRaw, metaRemoved };
  }
  scene = unmask(tidy(scene));
  // Only instructions, nothing to draw: callers fall back to the video title.
  if (!/\p{L}{2,}/u.test(scene)) scene = '';
  return { scene, exclusionsEn, exclusionsRaw: exclusionsRaw.map(unmask), metaRemoved };
}
