/**
 * Free AI features built on Workers AI (see workersAi.ts for limits and privacy).
 * Each returns null on any failure so callers keep the deterministic engine as the fallback.
 */
import type { AnalyzeThumbnailSimpleResult, ImprovePromptInput, ImprovePromptResult } from '../../../types/simple.ts';
import { findingsFromMetrics, type ImageMetrics } from '../../simpleEngine/pixelAnalysis.ts';
import { improvePrompt } from '../../simpleEngine/engine.ts';
import { askImage, askText, extractJsonObject } from './workersAi.ts';
import { reviewTypography } from '../../typography/analyze.ts';

/** Why the free layer did not produce the result (shown to the creator, logged for the owner). */
export interface FreeAiFailure {
  failed: string;
}
export const isFreeAiFailure = (v: unknown): v is FreeAiFailure =>
  typeof v === 'object' && v !== null && typeof (v as FreeAiFailure).failed === 'string';

/** Owner-only diagnostics (FREE_AI_DEBUG=true): logs the start of a model answer that could not be used. */
function debugUnusable(feature: string, answer: string): void {
  if (typeof process !== 'undefined' && process.env?.FREE_AI_DEBUG === 'true') {
    console.warn(`[free-ai] unusable ${feature} answer:`, JSON.stringify(answer.slice(0, 400)));
  }
}

const clean = (s: string | undefined, max = 220) =>
  (s || '').replace(/\s+/g, ' ').replace(/^[-*•\d.)\s]+/, '').trim().slice(0, max);
const isNone = (s: string) => !s || /^(none|nenhum[a]?|n\/a|no|não|nada)\.?$/i.test(s.trim());

/** Parses "KEY: value" lines from a vision answer. */
export function parseLabeledAnswer(answer: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of answer.split(/\r?\n/)) {
    const m = line.match(/^\s*\**\s*([A-Za-zÀ-ú ]{3,20})\s*\**\s*[:：]\s*(.+)$/);
    if (m) out[m[1].trim().toUpperCase()] = m[2].trim();
  }
  return out;
}

export const ANALYZE_QUESTION = `You are auditing a YouTube thumbnail for visible artificial "AI slop" defects. Look only at what is visible. Never identify or guess who any person is. Reply with exactly these five lines and nothing else:
SUBJECT: the main subject in at most 12 words
TEXT: the exact visible words in the image, copied as they appear, or NONE
ARTIFICIAL: up to 2 visible artificial-looking defects (for example plastic skin, extra or melted fingers, warped product, neon glow, fake bokeh), separated by ";", or NONE
TYPE: only if there is visible text, one short sentence on its lettering: misshapen or misspelled letters, mixed font styles, excessive outline or shadow, readability at phone size; bold colourful gaming lettering is NOT a defect unless it is misspelled, distorted or unreadable; or NONE
WORKS: one thing that works visually, in at most 15 words`;

/**
 * ANALYZE with a free vision model, grounded on local measurements. The model adds what pixels
 * cannot tell (subject, visible text, hands/skin/product defects); the numbers keep it honest.
 */
export async function analyzeWithFreeVision(
  image: string,
  metrics: ImageMetrics | null
): Promise<(AnalyzeThumbnailSimpleResult & { neurons: number; latencyMs: number }) | FreeAiFailure> {
  if (!/^data:image\/(png|jpe?g|webp);base64,/.test(image)) return { failed: 'unsupported-image' };
  const res = await askImage(image, ANALYZE_QUESTION, 220);
  if (!res.ok) return { failed: res.reason };

  const a = parseLabeledAnswer(res.data);
  const subject = clean(a.SUBJECT, 120);
  const text = clean(a.TEXT, 120);
  const artificial = isNone(a.ARTIFICIAL || '') ? [] : (a.ARTIFICIAL || '').split(/;|\s\|\s/).map(s => clean(s, 160)).filter(s => s && !isNone(s)).slice(0, 2);
  const works = isNone(a.WORKS || '') ? '' : clean(a.WORKS, 160);
  // Unusable answer (model ignored the format): fall back instead of showing noise.
  if (!subject && artificial.length === 0 && !works) {
    debugUnusable('analyze', res.data);
    return { failed: 'unusable-answer' };
  }

  // Typography: specific corrections from what the model saw (never a generic "improve the typography").
  const typo = reviewTypography(a.TEXT || '', a.TYPE || '');
  const metricIssues = metrics ? findingsFromMetrics(metrics).filter(f => f.kind === 'issue').sort((x, y) => y.severity - x.severity) : [];
  const metricGood = metrics ? findingsFromMetrics(metrics).filter(f => f.kind === 'good').sort((x, y) => y.severity - x.severity) : [];

  const functioning = [
    ...(works ? [`Visto pela IA: ${works}`] : []),
    ...(text && !isNone(text) ? [`Texto lido na imagem: "${text}" (confira se é o texto que você quer).`] : []),
    ...metricGood.map(g => g.text),
  ].slice(0, 3);
  const aiLooking = [
    ...artificial.map(d => `Visto pela IA: ${d}`),
    ...typo.findings.map(f => `Tipografia: ${f}.`),
    ...metricIssues.map(i => i.text),
  ].slice(0, 4);
  const topProblem = metricIssues[0] && metricIssues[0].severity >= 6
    ? metricIssues[0].text
    : artificial[0]
      ? `Visto pela IA: ${artificial[0]}`
      : metricIssues[0]?.text || 'Nada crítico encontrado. Confira mãos, rosto e texto de perto antes de publicar.';

  const changeItems = [
    ...artificial.map(d => `Correct this visible defect: ${d}.`),
    ...(typo.correction ? [typo.correction] : []),
    ...metricIssues.slice(0, 3).map(i => i.fix || ''),
  ].filter(Boolean).slice(0, 4);
  const avoidItems = metricIssues.map(i => i.avoid).filter(Boolean);
  const fixPrompt = `CORRECTION PROMPT (measured image + free vision model):

CHANGE:
${changeItems.length ? changeItems.map((c, i) => `${i + 1}. ${c}`).join('\n') : '1. No clear defect found; only adjust details you see by eye.'}

PRESERVE:
1. ${subject ? `The main subject (${subject})` : 'The main subject'} exactly as it is: identity, pose, product geometry, and any intended text.
2. Composition and camera framing.
3. Every element not listed in CHANGE.

AVOID:
${avoidItems.length ? avoidItems.join(', ') : 'unnecessary changes'}.`;

  return {
    functioning: functioning.length ? functioning : ['Nenhum ponto forte identificado com confiança.'],
    aiLooking: aiLooking.length ? aiLooking : ['Nenhum defeito artificial visível encontrado.'],
    topProblem,
    fixPrompt,
    isLocal: false,
    analysisSource: 'workers-ai',
    neurons: res.neurons,
    latencyMs: res.latencyMs,
  };
}

const IMPROVE_SYSTEM = `You rewrite image-generation prompts for YouTube thumbnails into clean, photographic, anti-slop prompts.
Rules: keep the user's real subject, action, products and setting; never invent a new setting; remove clichés (neon glow, particles, "8k", "ultra detailed", shocked open mouth, random arrows/circles, fake bokeh); use motivated natural light and a natural expression; copy any text in double quotes EXACTLY, never translate it.
Reply with JSON only: {"changes": ["3 to 5 short items in Brazilian Portuguese explaining what you removed or clarified"], "improvedPrompt": "the rewritten English prompt"}`;

const DOMESTIC_EN = /\b(living\s*room|bedroom|sofa|couch|cozy\s+(?:room|home)|home\s+office|desk\s+lamp)\b/i;
const DOMESTIC_PT = /(?<!\p{L})(quarto|sala(?:\s+de\s+estar)?|sof[aá]|escrit[oó]rio|home\s*office|lumin[aá]ria|minha\s+casa|em\s+casa)(?!\p{L})/iu;

/** Repairs stray punctuation in a model rewrite (". ." / " ,"), never inside quoted text or "...". */
export function tidyModelPunctuation(text: string): string {
  return text
    .split(/("[^"]*"|“[^”]*”)/)
    .map((part, i) => (i % 2 === 1 ? part : part
      .replace(/(?<!\.)\.(?:\s*\.)+(?!\.)/g, m => (/^\.\.\.$/.test(m) ? m : '.'))
      .replace(/[ \t]+([,;:!?])/g, '$1')
      .replace(/[ \t]+\.(?!\.)/g, '.')))
    .join('');
}

/** Quoted strings that must survive any rewrite ("VALE A PENA?"). */
export function quotedTexts(prompt: string): string[] {
  return [...prompt.matchAll(/"([^"]{1,80})"|“([^”]{1,80})”/g)].map(m => (m[1] || m[2]).trim()).filter(Boolean);
}

/**
 * IMPROVE: the free text model interprets intent and rewrites; the deterministic engine then
 * applies the target model's format and anti-slop rules. Rejected when exact quoted text is lost.
 */
export async function improveWithFreeText(
  input: ImprovePromptInput
): Promise<(ImprovePromptResult & { neurons: number; latencyMs: number; aiAssisted: true }) | FreeAiFailure> {
  const raw = (input.rawPrompt || '').trim();
  if (raw.length < 8 || raw.length > 4000) return { failed: 'prompt-length' };
  const res = await askText(IMPROVE_SYSTEM, `Prompt to improve:\n${raw}`, 600);
  if (!res.ok) return { failed: res.reason };

  const parsed = extractJsonObject<{ changes?: unknown; improvedPrompt?: unknown }>(res.data);
  const rewritten = typeof parsed?.improvedPrompt === 'string' ? parsed.improvedPrompt.trim() : '';
  if (rewritten.length < 30) {
    debugUnusable('improve', res.data);
    return { failed: 'unusable-answer' };
  }
  // Exact text is sacred: if the model dropped or altered any quoted text, discard the rewrite.
  if (quotedTexts(raw).some(t => !rewritten.includes(t))) return { failed: 'exact-text-lost' };
  // Never accept an invented domestic setting (project rule; the 8B model did this in 3/4 benchmark cases).
  // A setting the creator asked for, in English or Portuguese, is not invented.
  if (DOMESTIC_EN.test(rewritten) && !DOMESTIC_EN.test(raw) && !DOMESTIC_PT.test(raw)) return { failed: 'invented-setting' };

  const engineOut = improvePrompt({ ...input, rawPrompt: tidyModelPunctuation(rewritten) });
  const modelChanges = Array.isArray(parsed?.changes) ? parsed.changes.filter((c): c is string => typeof c === 'string').map(c => clean(c, 200)) : [];
  const changes = [...modelChanges.map(c => `IA: ${c}`), ...engineOut.changes].filter(Boolean).slice(0, 6);

  return { ...engineOut, changes, neurons: res.neurons, latencyMs: res.latencyMs, aiAssisted: true };
}
