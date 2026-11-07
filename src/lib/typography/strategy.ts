/**
 * Where the thumbnail's visible text comes from.
 *
 * Thumbnail Anti-Slop is a prompt generator: most users copy the final prompt into an external image
 * generator. So by default (AUTO) a requested headline IS rendered by the generator, with rules that
 * discourage malformed lettering. The real-font text layer is an explicit choice (CAMADA_REAL), because
 * the editor in ANALISAR is the only place that composes real typography onto a finished image.
 */
export type TypographyStrategy = 'NONE' | 'IN_IMAGE' | 'REAL_LAYER';

export interface StrategyDecision {
  strategy: TypographyStrategy;
  /** Plain-language reason, shown in the result. Never a promise about the generator's font. */
  reason: string;
}

export function chooseTypographyStrategy(input: { text?: string; treatment?: string }): StrategyDecision {
  const text = (input.text || '').trim();
  if (!text || input.treatment === 'SEM_TEXTO') {
    return { strategy: 'NONE', reason: 'Sem texto na thumbnail.' };
  }
  if (input.treatment === 'CAMADA_REAL') {
    return {
      strategy: 'REAL_LAYER',
      reason: 'Camada depois: o gerador deixa um espaço limpo. Depois, o texto exato entra com fonte real no editor de ANALISAR.'
    };
  }
  return {
    strategy: 'IN_IMAGE',
    reason: 'O gerador renderiza o texto exato. Confira ortografia e acentos; se as letras saírem tortas, gere de novo ou use "Camada depois".'
  };
}

const QUOTED = /"([^"\n]{1,80})"|“([^”\n]{1,80})”|«([^»\n]{1,80})»/u;
const TEXT_CUE = /(?<!\p{L})(?:texto(?:\s+exato)?|text|escrit[oa]s?|escrevendo|letreiro|headline|t[íi]tulo|legenda|frase|dizendo|caption|saying|written)(?!\p{L})\s*:?\s*/iu;

/**
 * Visible text the user asked for inside a prompt: quoted text first (`text "VALE A PENA?"`), otherwise
 * the ALL-CAPS words after a text cue (`texto NÃO COMPRE em destaque` -> `NÃO COMPRE`). Returns '' when
 * no visible text was requested. Lowercase words after a cue are not taken: they may be descriptions.
 */
export function extractRequestedText(raw: string): string {
  const text = (raw || '').trim();
  if (!text) return '';
  const quoted = text.match(QUOTED);
  if (quoted) return (quoted[1] || quoted[2] || quoted[3] || '').trim();
  const cue = text.match(TEXT_CUE);
  if (!cue || cue.index === undefined) return '';
  const words: string[] = [];
  for (const w of text.slice(cue.index + cue[0].length).split(/\s+/)) {
    const bare = w.replace(/[^\p{L}]/gu, '');
    if (!bare || bare !== bare.toUpperCase()) break;
    words.push(w.replace(/[,;]+$/, ''));
    if (words.length >= 6) break;
  }
  return words.join(' ').trim();
}
