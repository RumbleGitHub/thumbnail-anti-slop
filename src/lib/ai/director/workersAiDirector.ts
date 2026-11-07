import type { VisualDirector, DirectorInput, DirectorResult, VisualFact, DirectorReferenceInput } from '../types';
import { askImage, isFreeAiEnabled } from '../free/workersAi.ts';

/**
 * Free reference understanding for CREATE via Workers AI (Llama 4 Scout vision).
 *
 * Deliberately narrow, so a small model cannot weaken source ownership:
 * - PESSOA (face) photos are never sent: face ownership is decided by local rules, so the model
 *   would add nothing and the photo would leave the app for no benefit.
 * - Only roles that own visual facts are described: IMAGEM_ALVO (props, clothing, head angle),
 *   CENÁRIO "meu ambiente" (environment), PRODUTO (identification check). At most 3 images.
 * - Confidence is fixed at 0.65: high enough for reconcileDirectorWithLocalRules to add the facts
 *   to PRESERVE, far below the 0.8 needed to change the task type.
 * - A product reference that does not look like a product produces a warning for the creator,
 *   never a silent change.
 */
const FACT_CONFIDENCE = 0.65;
const MAX_IMAGES = 3;

const QUESTIONS: Partial<Record<DirectorReferenceInput['role'], string>> = {
  IMAGEM_ALVO: 'Describe this image for an editor in three short lines:\nPROPS: objects held or carried, or NONE\nCLOTHING: clothing or armor, or NONE\nHEAD: head direction (for example facing camera, turned left)',
  'CENÁRIO': 'Describe this place in one line:\nPLACE: type of place and its main visible features (max 20 words)',
  PRODUTO: 'Identify the product in one line:\nPRODUCT: what the object is, with brand and model if visible, or NOT A PRODUCT',
};

function line(answer: string, key: string): string {
  const m = answer.match(new RegExp(`${key}\\s*[:：]\\s*(.+)`, 'i'));
  const v = (m?.[1] || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  return /^(none|n\/a|no)\.?$/i.test(v) ? '' : v;
}

export class WorkersAIDirector implements VisualDirector {
  readonly name = 'workers-ai';

  isConfigured(): boolean {
    return isFreeAiEnabled();
  }

  async analyze(input: DirectorInput): Promise<DirectorResult> {
    const facts: VisualFact[] = [];
    const warnings: string[] = [];

    const eligible = input.references
      .filter(r => r.role !== 'PESSOA' && QUESTIONS[r.role])
      .filter(r => r.role !== 'CENÁRIO' || r.scenarioMode !== 'REFERENCIA_AMBIENTE')
      .filter(r => /^data:image\/(png|jpe?g|webp);base64,/.test(r.url))
      .slice(0, MAX_IMAGES);

    for (const ref of eligible) {
      const res = await askImage(ref.url, QUESTIONS[ref.role]!, 120);
      if (!res.ok) continue; // Budget, throttle or error: keep whatever we have; local rules decide.
      const answer = res.data;

      if (ref.role === 'IMAGEM_ALVO' || ref.isTarget) {
        const props = line(answer, 'PROPS');
        const clothing = line(answer, 'CLOTHING');
        const head = line(answer, 'HEAD');
        if (props) facts.push({ referenceId: ref.id, category: 'PROPS', fact: props, confidence: FACT_CONFIDENCE });
        if (clothing) facts.push({ referenceId: ref.id, category: 'CLOTHING_ARMOR', fact: clothing, confidence: FACT_CONFIDENCE });
        if (head) facts.push({ referenceId: ref.id, category: 'HEAD_ORIENTATION', fact: head, confidence: FACT_CONFIDENCE });
      } else if (ref.role === 'CENÁRIO') {
        const place = line(answer, 'PLACE');
        if (place) facts.push({ referenceId: ref.id, category: 'ENVIRONMENT', fact: place, confidence: FACT_CONFIDENCE });
      } else if (ref.role === 'PRODUTO') {
        const product = line(answer, 'PRODUCT');
        if (/not a product/i.test(product)) {
          warnings.push(`A referência de produto "${ref.name}" não parece mostrar um produto. Confira se o papel está certo.`);
        } else if (product) {
          facts.push({ referenceId: ref.id, category: 'PRODUCT_HARDWARE', fact: product, confidence: FACT_CONFIDENCE });
          warnings.push(`IA gratuita identificou a referência de produto "${ref.name}" como: ${product}. Se não for isso, troque a imagem.`);
        }
      }
    }

    return {
      // Never decisive: local rules keep the task type (needs > 0.8 to override).
      taskType: input.taskType || 'CREATE_NEW_SCENE',
      confidence: 0.5,
      visualFacts: facts,
      attributeOwners: {},
      preserve: [],
      change: [],
      adapt: [],
      avoid: [],
      ambiguities: [],
      directorWarnings: warnings,
      rawInterpretation: 'workers-ai reference facts',
    };
  }
}
