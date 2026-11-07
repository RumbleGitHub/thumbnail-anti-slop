// Thumbnail Quality Lab runner.
//
//   npm run lab                 -> run golden cases, print summary, write reports/latest.{json,md}
//   npm run lab -- --strict     -> exit 1 when any FAIL-level check fails
//   npm run lab -- --save-baseline -> also store the run as reports/baseline.json
//
// Every check is a deterministic text assertion over the PROMPT. It measures
// instruction quality (intent, references, contradictions, leakage), not the
// visual quality of a generated image — no images are generated here.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GOLDEN_CASES, LAB_MODELS, TEMPLATE_LEAK_TERMS, POSITIVE_SLOP_TERMS, positiveOnly } from './golden-cases.mjs';
export { positiveOnly };

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const reportsDir = path.join(here, 'reports');
const args = new Set(process.argv.slice(2));

process.env.COMPLEMENTARY_ENGINES_ENABLED = args.has('--complementary') ? 'true' : 'false';
const engine = await import(pathToFileURL(path.join(root, 'src/lib/simpleEngine/engine.ts')).href);

const BASE_INPUT = {
  thumbnailText: '',
  aspectRatio: '16:9',
  stylePreset: 'Natural',
  realismLevel: 'Alto',
  preserveFace: false,
  preserveProduct: false,
  approachIndex: 0,
};

// Removes negated instructions so "positive" checks only see what the model is
// asked to DRAW. Conservative: anything negated is dropped.

const test = (pattern, text) => (pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern));
const label = pattern => (pattern instanceof RegExp ? pattern.source : pattern);
const words = text => (text.trim() ? text.trim().split(/\s+/).length : 0);

function check(results, dimension, id, severity, ok, detail = '') {
  results.push({ dimension, id, severity, ok: Boolean(ok), detail });
}

// --pipeline=route reproduces POST /api/ai/simple-create without an AI director
// (reconcileDirectorWithLocalRules returns the local plan unchanged when the
// director is absent). This is what creators get from the running app offline.
const PIPELINE = [...args].find(a => a.startsWith('--pipeline='))?.split('=')[1] || 'engine';

// --pipeline=legacy-route reproduces the route before cycle 2 (generic buildPromptFromScenePlan template).
function runCreate(input) {
  if (PIPELINE === 'engine') return engine.generateSimpleThumbnail(input);
  const plan = engine.buildScenePlan(input, input.approachIndex || 0);
  if (PIPELINE === 'legacy-route') {
    const built = engine.buildPromptFromScenePlan(plan, input, input.approachIndex || 0);
    const audit = engine.auditPromptProvenance(built.finalPrompt, plan, input.references);
    return { ...built, direction: built.directionPt, finalPrompt: audit.cleanedPrompt };
  }
  let enriched = plan;
  if (engine.isComplementaryEnginesEnabled()) {
    const theme = engine.resolveThemeContext(input, plan);
    const interaction = engine.planPhysicalInteraction(input, plan, theme, []);
    const spatial = engine.planSpatialHierarchy(input, plan, theme, interaction);
    enriched = engine.mergeComplementaryPlan(plan, input, theme, [], interaction, spatial);
  }
  return engine.generateSimpleThumbnail(input, { plan: enriched });
}

function evaluateCreate(c, model) {
  const input = { ...BASE_INPUT, ...c.input, targetModel: model };
  const out = runCreate(input);
  const prompt = out.finalPrompt;
  const positive = positiveOnly(prompt);
  const userWords = `${input.videoTitle} ${input.ideaDescription} ${input.thumbnailText || ''}`;
  const directionText = Object.values(out.direction || {}).join(' ');
  const e = c.expect || {};
  const r = [];

  for (const p of e.mustInclude || []) check(r, 'intent', `includes:${label(p)}`, 'FAIL', test(p, prompt));
  for (const p of e.mustNotInclude || []) check(r, 'coherence', `excludes:${label(p)}`, 'FAIL', !test(p, prompt));
  for (const p of e.mustNotIncludePositive || []) check(r, 'intent', `not-drawn:${label(p)}`, 'FAIL', !test(p, positive));

  // Self-contradiction produced by text rewriting inside negated clauses.
  check(r, 'coherence', 'no-negated-clean-background', 'FAIL', !/no (unrequested )?clean neutral background|negative spaces/i.test(prompt));
  check(r, 'coherence', 'no-duplicate-phrases', 'WARN', !/(\b[\w ]{25,}\b)(?:,\s*\1){2,}/i.test(prompt));

  // Archetype/fixture content the creator never asked for.
  for (const leak of TEMPLATE_LEAK_TERMS) {
    const leaked = (leak.term.test(prompt) || leak.term.test(directionText)) && !leak.allowIf.test(userWords);
    check(r, 'intent', `no-leak:${leak.label}`, 'FAIL', !leaked);
  }

  for (const s of POSITIVE_SLOP_TERMS) check(r, 'anti-slop', `no-positive:${label(s)}`, 'FAIL', !s.test(positive));
  check(r, 'anti-slop', 'no-unrequested-cinematic-light', 'WARN', !/dramatic (rim|back) ?light|golden hour|volumetric/i.test(positive) || /cinemat|dram[aá]tic/i.test(userWords));

  if (e.person === false) {
    // Any "creator" (e.g. the planner's "Creator and Smartphone ...") or hand interaction invents a person.
    check(r, 'intent', 'no-invented-person', 'FAIL', !/\b(creator|a person|facial identity|interacting hands)\b/i.test(positive));
    check(r, 'coherence', 'no-human-attributes-without-person', 'WARN', !/(skin texture|human expression|finger count)/i.test(positive));
  }
  // Midjourney V8.2 takes reference images attached in the Imagine bar (Edit Model), so the
  // prompt names "the attached face photo" and the file goes to modelNotes. Only checked when
  // the case has a PESSOA reference (a face to attach).
  const isMJ = model.startsWith('MIDJOURNEY');
  const hasPersonRef = (input.references || []).some(ref => ref.role === 'PESSOA');
  if (e.person === true && hasPersonRef) {
    check(r, 'reference', 'identity-guidance-present', 'FAIL', isMJ
      ? /attached face photo|attached target image/i.test(prompt)
      : /(facial identity|identity source|for facial identity|PESSOA|PERSON)/i.test(prompt));
  }
  if (e.productLock) check(r, 'product', 'product-fidelity-lock', 'FAIL', /(PRODUCT FIDELITY|industrial geometry|hardware geometry|product geometry)/i.test(prompt));

  // Reference names: meaningful inside prompts that map images by name (OpenAI, Google, FLUX,
  // GERAL). Midjourney cannot read file names: they must be in the attach instructions instead.
  const notes = (out.modelNotes || []).join(' ');
  for (const name of e.refNames || []) {
    if (isMJ) {
      check(r, 'reference', `mj-attach-instruction:${name}`, 'FAIL', notes.includes(name) && /Attach to prompt/.test(notes));
      check(r, 'reference', `mj-no-filename-in-prompt:${name}`, 'FAIL', !prompt.includes(name));
    } else {
      check(r, 'reference', `ref-named:${name}`, 'FAIL', prompt.includes(name));
    }
  }

  // Comparisons: every named product stays named; no collapse into one generic object.
  if (e.distinctProducts) {
    for (const p of e.distinctProducts) check(r, 'product', `distinct:${p}`, 'FAIL', prompt.includes(p));
    check(r, 'product', 'no-generic-single-object', 'FAIL', !/\b(?:Smartphone|Primary tech gadget) positioned\b/.test(prompt));
  }
  // Game covers: named titles must be the real art; unnamed covers must stay generic.
  if (e.coverTitles) check(r, 'product', 'cover-art-fidelity', 'FAIL', /real published (?:game )?cover/i.test(prompt));
  if (e.genericCovers) {
    check(r, 'product', 'no-fake-recognizable-covers', 'FAIL', /(unbranded|without invented|do not invent)/i.test(prompt));
    check(r, 'product', 'no-iconic-cover-claim', 'FAIL', !/iconic hero game covers|recognizable hero game covers/i.test(prompt));
  }
  // Creator exclusions ("sem neon") must reach the avoid/constraint part of the prompt.
  for (const p of e.excludedInAvoid || []) {
    const negativePart = prompt.slice(positiveOnly(prompt).length) + prompt.split('\n').filter(l => /^(zero|no|avoid|excluded)/i.test(l.trim()) || /Excluded by the creator|Zero /.test(l)).join(' ');
    check(r, 'coherence', `excluded:${label(p)}`, isMJ ? 'WARN' : 'FAIL', test(p, negativePart) || /--no\b/.test(prompt) && test(p, prompt));
  }

  if (e.exactText) {
    check(r, 'typography', 'exact-text-verbatim', 'FAIL', prompt.includes(e.exactText));
  } else {
    check(r, 'typography', 'no-text-when-none-given', 'WARN', !/only visible text must read/i.test(prompt));
  }

  return { prompt, modelNotes: out.modelNotes, direction: out.direction, typographyPlan: out.typographyPlan, approachTitle: out.approachTitle, words: words(prompt), checks: r };
}

function evaluateImprove(c) {
  const out = engine.improvePrompt(c.input);
  const prompt = out.improvedPrompt;
  const positive = positiveOnly(prompt);
  const e = c.expect || {};
  const r = [];
  for (const p of e.mustNotIncludePositive || []) check(r, 'anti-slop', `not-drawn:${label(p)}`, 'FAIL', !test(p, positive));
  if (e.exactText) check(r, 'typography', 'exact-text-verbatim', 'FAIL', prompt.includes(e.exactText));
  check(r, 'usability', 'explains-changes', 'FAIL', Array.isArray(out.changes) && out.changes.length >= 1);
  return { prompt, changes: out.changes, words: words(prompt), checks: r };
}

function evaluateAnalyze(c) {
  const out = engine.analyzeThumbnailLocally(c.input.videoTitle);
  const r = [];
  check(r, 'usability', 'functioning<=3', 'FAIL', out.functioning.length <= 3);
  check(r, 'usability', 'aiLooking<=3', 'FAIL', out.aiLooking.length <= 3);
  check(r, 'usability', 'single-top-problem', 'FAIL', typeof out.topProblem === 'string' && out.topProblem.length > 0);
  check(r, 'coherence', 'no-vanity-score', 'FAIL', !/\bCTR\b.*\d|\d+\s*\/\s*10|\d+%/i.test(JSON.stringify(out)));
  check(r, 'coherence', 'fix-prompt-preserves', 'FAIL', /PRESERVE/i.test(out.fixPrompt));
  return { prompt: out.fixPrompt, analysis: out, words: words(out.fixPrompt), checks: r };
}

const runs = [];
for (const c of GOLDEN_CASES) {
  const models = c.kind === 'create' ? LAB_MODELS : [c.input.targetModel || 'GERAL'];
  for (const model of models) {
    const res = c.kind === 'create' ? evaluateCreate(c, model) : c.kind === 'improve' ? evaluateImprove(c) : evaluateAnalyze(c);
    runs.push({ caseId: c.id, title: c.title, model, ...res });
  }
}

// ---------- summary ----------
const all = runs.flatMap(run => run.checks.map(ch => ({ ...ch, caseId: run.caseId, model: run.model })));
const failed = all.filter(ch => !ch.ok && ch.severity === 'FAIL');
const warned = all.filter(ch => !ch.ok && ch.severity === 'WARN');
const byDim = {};
for (const ch of all) {
  byDim[ch.dimension] ??= { pass: 0, fail: 0, warn: 0 };
  if (ch.ok) byDim[ch.dimension].pass++;
  else if (ch.severity === 'FAIL') byDim[ch.dimension].fail++;
  else byDim[ch.dimension].warn++;
}
const wordsByModel = {};
for (const run of runs) (wordsByModel[run.model] ??= []).push(run.words);
const avg = xs => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

let baseline = null;
const baselinePath = path.join(reportsDir, PIPELINE === 'engine' ? 'baseline.json' : 'baseline-route.json');
if (fs.existsSync(baselinePath) && !args.has('--save-baseline')) baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const key = ch => `${ch.caseId}|${ch.model}|${ch.id}`;
const baseFails = new Set((baseline?.checks || []).filter(ch => !ch.ok && ch.severity === 'FAIL').map(key));
const nowFails = new Set(failed.map(key));
const fixed = [...baseFails].filter(k => !nowFails.has(k));
const regressed = [...nowFails].filter(k => baseline && !baseFails.has(k));

const lines = [];
lines.push('# Thumbnail Quality Lab report', '');
lines.push('Scope: deterministic checks over generated PROMPT text. No images were generated or inspected.', '');
lines.push(`Complementary engines: ${process.env.COMPLEMENTARY_ENGINES_ENABLED} | pipeline: ${PIPELINE}`, '');
lines.push(`Runs: ${runs.length} | checks: ${all.length} | FAIL: ${failed.length} | WARN: ${warned.length}`, '');
lines.push('| Dimension | pass | fail | warn |', '|---|---|---|---|');
for (const [d, v] of Object.entries(byDim)) lines.push(`| ${d} | ${v.pass} | ${v.fail} | ${v.warn} |`);
lines.push('', '| Model | avg words | max words |', '|---|---|---|');
for (const [m, xs] of Object.entries(wordsByModel)) lines.push(`| ${m} | ${avg(xs)} | ${Math.max(...xs)} |`);
if (baseline) {
  lines.push('', `Compared with baseline (${baseline.label}): fixed ${fixed.length}, regressed ${regressed.length}`);
  for (const k of regressed) lines.push(`- REGRESSED ${k}`);
}
lines.push('', '## Failures', '');
for (const ch of failed) lines.push(`- [${ch.dimension}] ${ch.caseId} / ${ch.model}: ${ch.id}`);
lines.push('', '## Warnings', '');
for (const ch of warned) lines.push(`- [${ch.dimension}] ${ch.caseId} / ${ch.model}: ${ch.id}`);
const md = lines.join('\n') + '\n';

fs.mkdirSync(reportsDir, { recursive: true });
const runLabel = process.env.LAB_LABEL || 'working-tree';
const payload = { label: runLabel, complementary: process.env.COMPLEMENTARY_ENGINES_ENABLED, summary: { runs: runs.length, checks: all.length, fail: failed.length, warn: warned.length, byDim, wordsByModel }, checks: all, runs };
fs.writeFileSync(path.join(reportsDir, 'latest.json'), JSON.stringify(payload, null, 2));
fs.writeFileSync(path.join(reportsDir, 'latest.md'), md);
if (args.has('--save-baseline')) {
  fs.writeFileSync(baselinePath, JSON.stringify(payload));
  fs.writeFileSync(baselinePath.replace(/\.json$/, '.md'), md);
}

console.log(md.split('## Failures')[0]);
console.log(`FAIL checks: ${failed.length} (details in tests/quality-lab/reports/latest.md)`);
if (args.has('--strict') && (failed.length > 0 || regressed.length > 0)) process.exit(1);
