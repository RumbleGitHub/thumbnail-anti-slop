// Typography before/after (Quality Lab extension). Same inputs, two engines:
//   node --experimental-strip-types tests/quality-lab/typography-before-after.mjs --baseline=<engine.ts of the previous version>
// Writes tests/quality-lab/reports/typography-before-after.md with the lettering instructions of each case,
// the judge result of each prompt and the boilerplate check across cases. Deterministic: no model is called.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GOLDEN_CASES } from './golden-cases.mjs';
import { judgeTypography, lettering, boilerplate } from './typography-judge.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
process.env.COMPLEMENTARY_ENGINES_ENABLED = 'false';

const after = await import(pathToFileURL(path.join(root, 'src/lib/simpleEngine/engine.ts')).href);
const baselinePath = arg('baseline');
if (!baselinePath) throw new Error('--baseline=<path to the previous engine.ts> is required');
const before = await import(pathToFileURL(path.resolve(baselinePath)).href);

// Genre each case is judged against (the engine must decide it from the request, the judge only checks fit).
const GENRE = {
  '21_typography_gta_stylized_title': 'gaming',
  '22_typography_tech_short': 'tech',
  '23_typography_opinion_pt': 'opinion',
  '24_typography_comparison': 'tech',
  '25_typography_accents_cedilha': 'general',
  '26_typography_overloaded_improve': 'gaming',
  '27_typography_no_text': undefined,
  '28_typography_game_logo_preserved': 'gaming',
};
const cases = GOLDEN_CASES.filter(c => GENRE_KEYS().includes(c.id));
function GENRE_KEYS() { return Object.keys(GENRE); }

const MUST_NOT = {
  '26_typography_overloaded_improve': [/3D bevel|chrome letters|thick outline|heavy drop shadow|glowing neon text|8k ultra detailed text/i],
};

function run(engine, c) {
  if (c.kind === 'improve') return engine.improvePrompt({ rawPrompt: c.input.rawPrompt, targetModel: c.input.targetModel }).improvedPrompt;
  return engine.generateSimpleThumbnail({
    aspectRatio: '16:9', stylePreset: 'Natural', realismLevel: 'Alto', preserveFace: false, preserveProduct: false,
    textTreatment: 'AUTO', thumbnailText: '', references: [], targetModel: 'GERAL', ...c.input,
  }).finalPrompt;
}

const rows = [];
const afterPrompts = {};
for (const c of cases) {
  const exactText = c.expect?.exactText;
  const requestedText = Boolean(exactText) || c.kind === 'improve';
  const meta = {
    exactText,
    requestedText: requestedText && c.id !== '27_typography_no_text',
    genre: GENRE[c.id],
    protectsLogo: c.id === '28_typography_game_logo_preserved',
    mustNotContain: MUST_NOT[c.id] || [],
  };
  const pBefore = run(before, c);
  const pAfter = run(after, c);
  afterPrompts[c.id] = pAfter;
  const jb = judgeTypography(pBefore, meta);
  const ja = judgeTypography(pAfter, meta);
  rows.push({ c, meta, pBefore, pAfter, jb, ja });
}

const shared = boilerplate(afterPrompts, 4);

const lines = [
  '# Typography before/after',
  '',
  `Engine before: \`${path.relative(root, path.resolve(baselinePath))}\`. Engine after: the current \`src/lib/simpleEngine/engine.ts\`.`,
  'Deterministic: the prompts are generated, not drawn. The judge reads the lettering instructions (see `typography-judge.mjs`).',
  '',
  '| Case | Before | After | Failed checks (before) | Failed checks (after) |',
  '|---|---|---|---|---|',
];
for (const r of rows) {
  const failB = r.jb.checks.filter(x => !x.ok).map(x => x.id).join(', ') || '—';
  const failA = r.ja.checks.filter(x => !x.ok).map(x => x.id).join(', ') || '—';
  lines.push(`| ${r.c.id} | ${(r.jb.score * 100).toFixed(0)}% | ${(r.ja.score * 100).toFixed(0)}% | ${failB} | ${failA} |`);
}
lines.push('', `Boilerplate across the ${rows.length} cases after the change (sentences in 4 or more cases): ${shared.length ? shared.map(b => `${b.cases}x "${b.sentence.slice(0, 90)}…"`).join('; ') : 'none'}.`, '');

for (const r of rows) {
  lines.push(`## ${r.c.id}`, '', `**Request:** ${r.c.title}`, '');
  lines.push('**Before (lettering):**', '', '> ' + (lettering(r.pBefore) || '(none)'), '');
  lines.push('**After (lettering):**', '', '> ' + (lettering(r.pAfter) || '(none)'), '');
  lines.push(`Judge after: ${r.ja.checks.map(x => `${x.ok ? '✓' : '✗'} ${x.id}`).join(' · ')}`, '');
}

const out = path.join(here, 'reports', 'typography-before-after.md');
fs.writeFileSync(out, lines.join('\n') + '\n');
const passAfter = rows.filter(r => r.ja.pass).length;
console.log(lines.slice(0, 16).join('\n'));
console.log(`\nJudge: ${passAfter}/${rows.length} prompts pass every check after the change. Wrote ${path.relative(root, out)}`);
