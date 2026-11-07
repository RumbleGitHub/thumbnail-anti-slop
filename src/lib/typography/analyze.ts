/**
 * Turns the vision model's TYPE observation into specific corrections. Deterministic: the model only
 * describes what it sees; the rules below decide the wording. Bold, colourful gaming lettering is NOT a
 * defect by itself; only misspelling, distortion, inconsistency, illegibility or excess is.
 */
export interface TypographyReview {
  /** What was observed, in Portuguese. Empty when there is no visible text to review. */
  findings: string[];
  /** One specific correction sentence, or null when nothing needs changing. */
  correction: string | null;
}

const NONE = /^(none|nenhum|nao|não|n\/a|-)\.?$/i;

function plain(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const RULES: { test: RegExp; finding: string; correction: string }[] = [
  {
    test: /letra.{0,30}(defor|estranh|errad|falsa|derret|garbl|torta|tort)|deform|garbled|distort|misspell|pseudo|melted/,
    finding: 'letras aparentemente deformadas ou falsas',
    correction: 'troque as letras deformadas por texto em fonte real, sobre uma versão limpa da imagem',
  },
  {
    test: /mistur|diferentes? (fontes|estilos)|varia|inconsist|mix|mais de uma (fonte|familia)/,
    finding: 'mais de um estilo tipográfico no mesmo texto',
    correction: 'use uma única fonte display real para o título',
  },
  {
    test: /(contorno|outline|borda|stroke).{0,25}(excess|grossa?|pesad|muit|heavy|thick)|(excess|grossa?|pesad|heavy|thick)\w*.{0,15}(contorno|outline|borda|stroke)/,
    finding: 'contorno do texto excessivo',
    correction: 'reduza a espessura do contorno',
  },
  {
    test: /sombra|shadow|brilho|glow|gradiente|gradient|bevel|3d/,
    finding: 'sombras, brilhos ou efeitos redundantes no texto',
    correction: 'remova sombras e brilhos redundantes e deixe o texto com uma cor principal',
  },
  {
    test: /ileg|legib|pequen|difícil|dificil|hard to read|small|cansativ/,
    finding: 'legibilidade baixa em tamanho de celular',
    correction: 'aumente o tamanho e o contraste do texto para ler no celular',
  },
];

export function reviewTypography(textSeen: string, typeObservation: string): TypographyReview {
  const seen = (textSeen || '').trim();
  if (!seen || NONE.test(seen)) return { findings: [], correction: null };

  const obs = plain(typeObservation || '');
  const picked = RULES.filter(r => r.test.test(obs));
  if (picked.length === 0 || (picked.length === 1 && NONE.test((typeObservation || '').trim()))) {
    return { findings: ['Tipografia sem defeito evidente pela leitura da IA; confira letras e acentos de perto.'], correction: null };
  }
  const findings = picked.map(r => r.finding);
  const steps = picked.map(r => r.correction);
  const correction = `Preserve a composição, o fundo e os logotipos originais; ${steps.join('; ')}. Estilo de jogo intencional, com cor e destaque, pode ficar.`;
  return { findings, correction };
}
