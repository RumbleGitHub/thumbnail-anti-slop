// Free AI benchmark (Quality Lab extension).
//
//   npm run lab:free-ai
//
// Scores RECORDED LIVE outputs of Cloudflare Workers AI models (tests/quality-lab/fixtures/
// free-ai-live-*.json) and REPLAYS them through the real pipeline (analyzeWithFreeVision /
// improveWithFreeText with a binding that returns the recorded text). No network calls here:
// the live part happened when the fixture was recorded; this script makes the scoring repeatable.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const fixtureFile = fs.readdirSync(path.join(here, 'fixtures')).filter(f => /^free-ai-live-.*\.json$/.test(f)).sort().pop();
const fx = JSON.parse(fs.readFileSync(path.join(here, 'fixtures', fixtureFile), 'utf8'));

process.env.FREE_AI_PROVIDER = 'workers-ai';
process.env.FREE_AI_DAILY_NEURONS = '9500';
process.env.FREE_AI_MAX_REQUESTS_PER_MINUTE = '120';
const wai = await import(pathToFileURL(path.join(root, 'src/lib/ai/free/workersAi.ts')).href);
const free = await import(pathToFileURL(path.join(root, 'src/lib/ai/free/freeFeatures.ts')).href);
const { POSITIVE_SLOP_TERMS, positiveOnly } = await import(pathToFileURL(path.join(here, 'golden-cases.mjs')).href);

const replay = text => ({ async run() { return { choices: [{ message: { content: text } }] }; } });
const avg = xs => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);
const md = [`# Free AI benchmark (${fx.recordedAt})`, '', `Source: \`${fixtureFile}\`. ${fx.how}`, '', 'Scoring is deterministic over the recorded outputs; the pipeline step is a replay (no new API calls).', ''];

// ---------- vision ----------
md.push('## Vision (ANALYZE question)', '', '| Model | Subject correct | Text correct | Invented defects on real photos | Parsed by pipeline | Avg latency | Avg Neurons |', '|---|---|---|---|---|---|---|');
const visionSummary = {};
for (const [model, cases] of Object.entries(fx.vision)) {
  if (cases._all) {
    md.push(`| ${model} | 0/${Object.keys(fx.visionCases).length} | 0 | n/a | 0 | n/a | n/a (empty answers) |`);
    continue;
  }
  let subj = 0, textOk = 0, textCases = 0, invented = 0, real = 0, parsed = 0;
  const ms = [], neurons = [];
  for (const [id, exp] of Object.entries(fx.visionCases)) {
    const out = cases[id];
    if (!out) continue;
    const a = free.parseLabeledAnswer(out.answer);
    if (new RegExp(exp.expectSubject, 'i').test(a.SUBJECT || '')) subj++;
    if (exp.expectText) {
      textCases++;
      const norm = s => (s || '').replace(/[?!.]/g, '').trim().toUpperCase();
      if (norm(a.TEXT) === norm(exp.expectText)) textOk++;
    }
    if (exp.kind.startsWith('real')) {
      real++;
      if (!/^none\.?$/i.test((a.ARTIFICIAL || '').trim())) invented++;
    }
    wai.setWorkersAiBindingForTests(replay(out.answer));
    if (await free.analyzeWithFreeVision('data:image/jpeg;base64,AAAA', null)) parsed++;
    ms.push(out.ms); neurons.push(out.neurons);
  }
  visionSummary[model] = { subj, textOk, textCases, invented, real, parsed, ms: avg(ms), neurons: avg(neurons) };
  md.push(`| ${model} | ${subj}/${Object.keys(fx.visionCases).length} | ${textOk}/${textCases} | ${invented}/${real} | ${parsed}/${ms.length} | ${avg(ms)} ms | ${avg(neurons)} |`);
}
md.push('', 'Text comparison ignores trailing punctuation (see fixture note on the copied "?").', '');

// ---------- improve ----------
md.push('## Prompt rewrite (IMPROVE), replayed through improveWithFreeText', '', '| Model | Accepted by guards | Exact text kept | Slop left in positive text | Invented domestic setting (raw output) | Portuguese change notes | Avg latency | Avg Neurons |', '|---|---|---|---|---|---|---|---|');
const slopRe = [/\b8k\b/i, /ultra detailed/i, /neon glow/i, /red arrow/i, /\bepic\b/i, /lightning/i, /particles/i, /mouth wide open|screaming/i, /volumetric god rays/i, /hyper realistic/i];
for (const [model, outs] of Object.entries(fx.improve)) {
  let accepted = 0, textKept = 0, textCases = 0, slopLeft = 0, domestic = 0, pt = 0;
  for (let i = 0; i < outs.length; i++) {
    const c = fx.improveCases[i];
    const raw = outs[i].text;
    if (/living\s*room|bedroom|cozy|outdoor setting/i.test(raw)) domestic++;
    if (/"changes"\s*:\s*\[\s*"(Removid|Substitu|Mantid)/.test(raw)) pt++;
    wai.setWorkersAiBindingForTests(replay(raw));
    const res = await free.improveWithFreeText({ rawPrompt: c.raw, targetModel: 'GERAL' });
    if (!res) continue;
    accepted++;
    if (c.exactText) { textCases++; if (res.improvedPrompt.includes(c.exactText)) textKept++; }
    const positive = positiveOnly(res.improvedPrompt);
    if (slopRe.some(r => r.test(positive)) || (POSITIVE_SLOP_TERMS || []).some(r => r.test(positive))) slopLeft++;
  }
  md.push(`| ${model} | ${accepted}/${outs.length} | ${textKept}/${textCases} accepted | ${slopLeft}/${accepted} | ${domestic}/${outs.length} | ${pt}/${outs.length} | ${avg(outs.map(o => o.ms))} ms | ${avg(outs.map(o => o.neurons))} |`);
}
md.push('', '"Accepted by guards" counts rewrites that pass the exact-text and invented-domestic-setting checks; rejected ones fall back to the deterministic engine.', '');

// ---------- capacity ----------
const scout = visionSummary['@cf/meta/llama-4-scout-17b-16e-instruct'];
md.push('## Daily capacity at the default app cap (8,000 Neurons/day; free allocation 10,000)', '');
if (scout) md.push(`- ANALYZE with free vision: about ${Math.floor(8000 / scout.neurons)} per day (avg ${scout.neurons} Neurons).`);
const scoutImprove = fx.improve['@cf/meta/llama-4-scout-17b-16e-instruct'];
if (scoutImprove) md.push(`- IMPROVE with the free text model: about ${Math.floor(8000 / avg(scoutImprove.map(o => o.neurons)))} per day.`);
md.push('- CREATE reference checks: up to 3 images per generation, about 3x an ANALYZE call.', '- Local pixel analysis and the deterministic engine: unlimited, no quota.');

const out = path.join(here, 'reports', 'free-ai-benchmark.md');
fs.writeFileSync(out, md.join('\n') + '\n');
console.log(md.join('\n'));
console.log(`\nWrote ${path.relative(root, out)}`);
wai.setWorkersAiBindingForTests(undefined);
