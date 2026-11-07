/**
 * Where the thumbnail's text comes from. Image generators draw letters badly (misshapen,
 * inconsistent, invented glyphs), so by default the text is added afterwards as a REAL typography
 * layer with an installed font. Only an explicit request keeps the text inside the generated image.
 */
export type TypographyStrategy = 'NONE' | 'IN_IMAGE' | 'REAL_LAYER';

export interface StrategyDecision {
  strategy: TypographyStrategy;
  /** Plain-language reason, shown in the result (never a claim about the model's font). */
  reason: string;
}

export function chooseTypographyStrategy(input: { text?: string; treatment?: string }): StrategyDecision {
  const text = (input.text || '').trim();
  if (!text || input.treatment === 'SEM_TEXTO') {
    return { strategy: 'NONE', reason: 'Sem texto na thumbnail.' };
  }
  if (input.treatment === 'RENDER_IN_IMAGE' || input.treatment === 'USAR_REFERENCIA') {
    return {
      strategy: 'IN_IMAGE',
      reason: 'Você pediu o texto no estilo da imagem. O gerador tenta desenhar as letras e pode errá-las: confira de perto ou use a camada de texto real.'
    };
  }
  return {
    strategy: 'REAL_LAYER',
    reason: 'Recomendado: o gerador deixa um espaço limpo e o texto exato entra depois, com fonte real, sem letras desenhadas pela IA.'
  };
}
