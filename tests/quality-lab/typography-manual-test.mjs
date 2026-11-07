// Manual image test kit (Quality Lab). The same inputs go through the previous engine and the current one.
// Writes tests/quality-lab/reports/typography-manual-test.md: the full prompts, word counts, the typography
// judge per target, and a checklist for evaluating the images a person generates by hand.
// Deterministic: no image is generated and no model is called. Visual quality is NOT judged here.
//   node --experimental-strip-types tests/quality-lab/typography-manual-test.mjs --baseline=<previous engine.ts>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { judgeTypography, boilerplate } from './typography-judge.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
process.env.COMPLEMENTARY_ENGINES_ENABLED = 'false';
const baselinePath = arg('baseline');
if (!baselinePath) throw new Error('--baseline=<path to the previous engine.ts> is required');
const after = await import(pathToFileURL(path.join(root, 'src/lib/simpleEngine/engine.ts')).href);
const before = await import(pathToFileURL(path.resolve(baselinePath)).href);

// Targets a person is likely to paste into: the generic prompt, two adapters with different wording, Midjourney.
const TARGETS = ['GERAL', 'OPENAI_GPT_IMAGE_2_5_SUNBURST', 'GOOGLE_NANO_BANANA_2', 'MIDJOURNEY_V8_2'];

// Same content and reference constraints for the previous and the new prompt. No references, no face or product lock.
const CASES = [
  { id: 'gaming', label: 'Gaming: headline grande e expressiva', genre: 'gaming',
    videoTitle: 'Zerei GTA San Andreas em 2026', ideaDescription: 'Eu com cara de choque segurando o controle, cidade noturna ao fundo, luz neon', thumbnailText: 'SAN ANDREAS' },
  { id: 'tech', label: 'Tecnologia: comparação com título curto', genre: 'tech',
    videoTitle: 'iPhone 17 Pro vs Galaxy S26 Ultra', ideaDescription: 'Dois celulares lado a lado sobre a mesa, fundo gradiente azul', thumbnailText: 'QUAL COMPRAR?' },
  { id: 'opinion', label: 'Criador: opinião com manchete forte', genre: 'opinion',
    videoTitle: 'Vale a pena comprar o PS5 em 2026?', ideaDescription: 'Eu de braços cruzados, expressão séria, na sala de casa', thumbnailText: 'NÃO COMPRE AGORA' },
  { id: 'comparison', label: 'Comparação de produto (extra)', genre: undefined,
    videoTitle: 'Air fryer barata vs cara: teste real', ideaDescription: 'Duas air fryers lado a lado na bancada da cozinha', thumbnailText: 'VALE O PREÇO?' },
];

function create(engine, c, targetModel) {
  return engine.generateSimpleThumbnail({
    aspectRatio: '16:9', stylePreset: 'Natural', realismLevel: 'Alto', preserveFace: false, preserveProduct: false,
    textTreatment: 'AUTO', references: [], targetModel,
    videoTitle: c.videoTitle, ideaDescription: c.ideaDescription, thumbnailText: c.thumbnailText,
  }).finalPrompt;
}
const words = p => p.trim().split(/\s+/).filter(Boolean).length;
const meta = c => ({ exactText: c.thumbnailText, requestedText: true, genre: c.genre, mustNotContain: [] });

const perCase = [];
const afterGeral = {};
let judgedBefore = 0, judgedAfter = 0, total = 0;
const adapterFailures = [];
for (const c of CASES) {
  const row = { c, targets: {} };
  for (const t of TARGETS) {
    const pBefore = create(before, c, t);
    const pAfter = create(after, c, t);
    const jb = judgeTypography(pBefore, meta(c));
    const ja = judgeTypography(pAfter, meta(c));
    total++;
    if (jb.pass) judgedBefore++;
    if (ja.pass) judgedAfter++;
    if (!ja.pass) adapterFailures.push(c.id + '/' + t + ': ' + ja.checks.filter(x => !x.ok).map(x => x.id).join(', '));
    row.targets[t] = { pBefore, pAfter, jb, ja };
    if (t === 'GERAL') afterGeral[c.id] = pAfter;
  }
  perCase.push(row);
}

const shared = boilerplate(afterGeral, 3);
const report = [
  '# Teste manual de imagem: prompt anterior x prompt atual',
  '',
  'Gerado por tests/quality-lab/typography-manual-test.mjs. Nenhuma imagem foi gerada por este script e nenhum modelo foi chamado.',
  '',
  '**Verificado aqui (prompt):** texto exato entre aspas, pedido de renderização, ausência de contradição, número e foco das instruções de letra, gênero coerente, preservação da cena, ausência de promessa de fonte, e ausência de frase colada entre casos.',
  '',
  '**Não verificado aqui (imagem):** se o gerador desenha as letras bem, se a leitura é boa, se há bevel, brilho ou contorno excessivo, e se a identidade visual se mantém. Isso só se sabe pelo teste manual abaixo.',
  '',
  'Juiz de prompt: anterior ' + judgedBefore + '/' + total + ' aprovados, atual ' + judgedAfter + '/' + total + ' aprovados (' + CASES.length + ' casos x ' + TARGETS.length + ' alvos).',
  adapterFailures.length ? 'Falhas restantes no atual: ' + adapterFailures.join('; ') + '.' : 'Nenhuma falha restante no atual.',
  '',
  'Frases de tipografia repetidas em 3 ou mais casos (alvo GERAL, atual): ' + (shared.length ? shared.map(b => b.cases + 'x "' + b.sentence.slice(0, 100) + '..."').join('; ') : 'nenhuma') + '.',
  '',
];

for (const row of perCase) {
  const c = row.c;
  const g = row.targets.GERAL;
  report.push(
    '## ' + c.label,
    '',
    'Entrada idêntica nos dois motores: título "' + c.videoTitle + '" | ideia "' + c.ideaDescription + '" | texto da thumbnail "' + c.thumbnailText + '" | sem referências | tratamento AUTO | Natural | realismo Alto.',
    '',
    'Palavras (alvo GERAL): anterior ' + words(g.pBefore) + ', atual ' + words(g.pAfter) + '.',
    '',
    '### Prompt anterior (GERAL)',
    '',
    '```text', g.pBefore, '```', '',
    '### Prompt atual (GERAL)',
    '',
    '```text', g.pAfter, '```', '',
    '### Juiz de prompt por alvo',
    '',
    '| Alvo | Anterior | Atual | Falhas no atual |',
    '|---|---|---|---|',
  );
  for (const t of TARGETS) {
    const r = row.targets[t];
    const fails = r.ja.checks.filter(x => !x.ok).map(x => x.id).join(', ') || '-';
    report.push('| ' + t + ' | ' + (r.jb.pass ? 'aprovado' : 'reprovado') + ' | ' + (r.ja.pass ? 'aprovado' : 'reprovado') + ' | ' + fails + ' |');
  }
  for (const t of TARGETS.slice(1)) report.push('### Prompt atual (' + t + ')', '', '```text', row.targets[t].pAfter, '```', '');
  report.push('', '### Avaliação manual (cole os dois prompts no mesmo gerador, com a mesma semente quando houver)', '',
    '| Critério | Anterior | Atual |', '|---|---|---|',
    '| Consistência das letras (sem letras deformadas) | [ ] | [ ] |',
    '| Legibilidade em tamanho de celular | [ ] | [ ] |',
    '| Texto exato, com acentos e pontuação | [ ] | [ ] |',
    '| Aparência natural (sem cara de adesivo) | [ ] | [ ] |',
    '| Bevel, brilho, sombra ou contorno desnecessários | [ ] | [ ] |',
    '| Identidade visual preservada (cena, rosto, produto, fundo) | [ ] | [ ] |',
    '| Composição geral (espaço, hierarquia) | [ ] | [ ] |',
    '');
}

const out = path.join(here, 'reports', 'typography-manual-test.md');
fs.writeFileSync(out, report.join('\n') + '\n');
console.log(report.slice(0, 12).join('\n'));
console.log('\nWrote ' + path.relative(root, out) + '. Prompt judge: before ' + judgedBefore + '/' + total + ', after ' + judgedAfter + '/' + total + '.');
for (const f of adapterFailures) console.log('  remaining:', f);
