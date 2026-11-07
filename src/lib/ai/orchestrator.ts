import type {
  VisualDirector,
  VisualAuditor,
  SystemAIStatus,
  DirectorResult,
  DirectorReferenceInput
} from './types';
import { OpenAIDirector } from './director/openaiDirector.ts';
import { GeminiDirector } from './director/geminiDirector.ts';
import { GeminiAuditor } from './auditor/geminiAuditor.ts';
import { WorkersAIDirector } from './director/workersAiDirector.ts';
import { freeAiStatus, WORKERS_AI_MODELS } from './free/workersAi.ts';
import type {
  CreateThumbnailInput,
  ScenePlan,
  SimpleReference
} from '@/types/simple';
import { detectExplicitEnvironment } from '../simpleEngine/engine.ts';

export function getReferencePurpose(role: SimpleReference['role']): string {
  switch (role) {
    case 'IMAGEM_ALVO':
      return 'structural target master (pose, framing, skull angle, props)';
    case 'PESSOA':
      return 'identity source only (facial proportions, bone structure, age cues)';
    case 'PRODUTO':
      return 'product hardware geometry source only';
    case 'CENÁRIO':
      return 'environment and atmosphere source only';
    case 'ESTILO':
      return 'aesthetic lighting, color grading and texture source only';
    case 'COMPOSIÇÃO':
      return 'framing and focal hierarchy source only';
    case 'TIPOGRAFIA':
      return 'typography personality source only';
    default:
      return 'supporting visual reference';
  }
}

export function mapReferencesToDirectorInput(refs: SimpleReference[]): DirectorReferenceInput[] {
  return refs.map(r => ({
    id: r.id,
    role: r.role,
    name: r.name,
    url: r.url,
    purpose: getReferencePurpose(r.role),
    scenarioMode: r.scenarioMode,
    isTarget: r.role === 'IMAGEM_ALVO' || r.isTarget
  }));
}

/**
 * Gemini free-tier keys: Google may use inputs to improve its products and human reviewers may read
 * them (Gemini API terms, unpaid services). With GEMINI_FREE_TIER=true, face photos (PESSOA) are
 * never sent; the rest of the reference understanding still works.
 */
export function isGeminiFreeTier(): boolean {
  return process.env.GEMINI_FREE_TIER?.trim().toLowerCase() === 'true';
}

function withoutFacePhotos(director: VisualDirector): VisualDirector {
  return {
    name: director.name,
    isConfigured: () => director.isConfigured(),
    analyze: input => director.analyze({ ...input, references: input.references.filter(r => r.role !== 'PESSOA') }),
  };
}

export type DirectorProviderName = 'openai' | 'gemini' | 'workers-ai' | 'local';

export function getVisualDirector(): { director: VisualDirector | null; providerName: DirectorProviderName } {
  const providerSetting = (process.env.AI_DIRECTOR_PROVIDER?.trim().toLowerCase() || 'auto') as 'auto' | DirectorProviderName;
  const gemini = () => {
    const d = new GeminiDirector();
    return d.isConfigured() ? (isGeminiFreeTier() ? withoutFacePhotos(d) : d) : null;
  };
  const workersAi = () => {
    const d = new WorkersAIDirector();
    return d.isConfigured() ? d : null;
  };

  if (providerSetting === 'local') {
    return { director: null, providerName: 'local' };
  }

  if (providerSetting === 'openai') {
    const d = new OpenAIDirector();
    if (d.isConfigured()) return { director: d, providerName: 'openai' };
    return { director: null, providerName: 'local' };
  }

  if (providerSetting === 'gemini') {
    const d = gemini();
    return d ? { director: d, providerName: 'gemini' } : { director: null, providerName: 'local' };
  }

  if (providerSetting === 'workers-ai') {
    const d = workersAi();
    return d ? { director: d, providerName: 'workers-ai' } : { director: null, providerName: 'local' };
  }

  // 'auto' cascade: owner-paid keys first (OpenAI, then Gemini), then the free Workers AI layer, then Local.
  const openAiDir = new OpenAIDirector();
  if (openAiDir.isConfigured()) {
    return { director: openAiDir, providerName: 'openai' };
  }

  const geminiDir = gemini();
  if (geminiDir) {
    return { director: geminiDir, providerName: 'gemini' };
  }

  const freeDir = workersAi();
  if (freeDir) {
    return { director: freeDir, providerName: 'workers-ai' };
  }

  return { director: null, providerName: 'local' };
}

export function getVisualAuditor(directorProviderName?: string): { auditor: VisualAuditor | null; providerName: 'gemini' | 'none' } {
  // Section 25 MODE C: "Do not audit the model with itself and pretend it is independent."
  if (directorProviderName === 'gemini') {
    return { auditor: null, providerName: 'none' };
  }

  const auditor = new GeminiAuditor();
  if (auditor.isConfigured()) {
    return { auditor, providerName: 'gemini' };
  }

  return { auditor: null, providerName: 'none' };
}

export function getSystemAIStatus(): SystemAIStatus {
  const { director, providerName: dirProvider } = getVisualDirector();
  const { auditor } = getVisualAuditor(dirProvider);

  const directorConfigured = Boolean(director && director.isConfigured());
  const auditorConfigured = Boolean(auditor && auditor.isConfigured());

  return {
    localEngine: true,
    director: {
      configured: directorConfigured,
      provider: directorConfigured ? dirProvider : 'none'
    },
    auditor: {
      configured: auditorConfigured,
      provider: auditorConfigured ? 'gemini' : 'none'
    },
    freeAi: freeAiStatus(),
    // Backwards compatibility fields
    configured: directorConfigured || auditorConfigured,
    provider: directorConfigured
      ? (dirProvider === 'openai' ? 'OpenAI Multimodal Director' : dirProvider === 'workers-ai' ? 'Cloudflare Workers AI (gratuito)' : 'Gemini Director')
      : 'Motor Local Determinístico',
    model: directorConfigured
      ? (dirProvider === 'openai' ? (process.env.OPENAI_MODEL || 'gpt-4o') : dirProvider === 'workers-ai' ? WORKERS_AI_MODELS.vision : (process.env.GEMINI_MODEL || 'gemini-2.5-flash'))
      : 'none',
    supportsVision: directorConfigured || auditorConfigured
  };
}

/**
 * SECTION 11: MERGE POLICY — Deterministic Director -> Local merge.
 * Priority:
 * 1. Explicit user instruction
 * 2. Explicit user-selected reference role
 * 3. TARGET structural authority for edit tasks
 * 4. Existing deterministic local rules
 * 5. AI Director grounded visual facts
 * 6. Necessary physical adaptation
 * 7. Justified inference
 * 8. Generic inference
 */
export function reconcileDirectorWithLocalRules(
  directorResult: DirectorResult | null,
  localPlan: ScenePlan,
  input: CreateThumbnailInput
): ScenePlan {
  if (!directorResult) {
    return localPlan;
  }

  const { videoTitle, ideaDescription } = input;
  const userText = `${videoTitle} ${ideaDescription}`.trim();
  const lower = userText.toLowerCase();

  const reconciled: ScenePlan = {
    ...localPlan,
    change: [...localPlan.change],
    preserve: [...localPlan.preserve],
    avoid: [...localPlan.avoid],
    provenanceMap: { ...localPlan.provenanceMap }
  };

  // 1. Task type: If local identified an edit task (e.g. IDENTITY_TRANSFER) with explicit references, local rule holds
  if (localPlan.taskType === 'IDENTITY_TRANSFER' || localPlan.taskType === 'REPLACE_OBJECT' || localPlan.taskType === 'CHANGE_ENVIRONMENT') {
    reconciled.taskType = localPlan.taskType;
  } else if (directorResult.taskType && directorResult.confidence > 0.8) {
    reconciled.taskType = directorResult.taskType;
  }

  // 2. Attribute ownership reconciliation (Level 1: User Instruction, Level 2: User Role, Level 3: Target Authority)
  if (reconciled.taskType === 'IDENTITY_TRANSFER') {
    // Face strictly belongs to Person Reference (Level 2)
    reconciled.faceOwner = localPlan.faceOwner;
    reconciled.headAngleOwner = 'TARGET';
    reconciled.bodyOwner = 'TARGET';
    reconciled.poseOwner = 'TARGET';
    reconciled.clothingOwner = 'TARGET';
    reconciled.armorOwner = 'TARGET';
    reconciled.propsOwner = 'TARGET';
    reconciled.handsOwner = 'ADAPTED';
    reconciled.compositionOwner = 'TARGET';

    // Hair Ownership: Explicit user prompt check (Level 1)
    const keepsMyHair = /(meu\s*cabelo|minha\s*cabe[çc]a|my\s*hair)/i.test(lower);
    const keepsTargetHair = /(cabelo\s*do\s*personagem|target\s*hair|character\s*hair|mantenha.*cabelo|keep.*hair|visual\s*do\s*personagem)/i.test(lower);
    if (keepsMyHair && !keepsTargetHair) {
      reconciled.hairOwner = 'PERSON_REF';
    } else {
      reconciled.hairOwner = 'TARGET';
    }

    // Beard Ownership: Explicit user prompt check (Level 1)
    const keepsMyBeard = /(minha\s*barba|my\s*beard|use\s*minha\s*barba|com\s*minha\s*barba)/i.test(lower);
    const keepsTargetBeard = /(barba\s*do\s*personagem|target\s*beard|character\s*beard|visual\s*do\s*personagem)/i.test(lower);
    if (keepsMyBeard && !keepsTargetBeard) {
      reconciled.beardOwner = 'PERSON_REF';
    } else {
      reconciled.beardOwner = 'TARGET';
    }

    // Environment Ownership: Level 1 (User explicit) > Level 3 (Scenario ref) > Target
    const explicitEnv = detectExplicitEnvironment(userText);
    if (explicitEnv.hasExplicitEnv) {
      reconciled.environmentOwner = 'USER';
    } else if (localPlan.environmentSource) {
      reconciled.environmentOwner = 'SCENARIO_REF';
    } else if (localPlan.targetImage) {
      reconciled.environmentOwner = 'TARGET';
    } else {
      reconciled.environmentOwner = 'NONE';
    }
  }

  // 3. Grounded Visual Facts from Director (Level 5): Incorporate into preserve / change
  if (directorResult.visualFacts && directorResult.visualFacts.length > 0) {
    for (const vf of directorResult.visualFacts) {
      if (vf.confidence < 0.6) continue;

      if (vf.category === 'HAND_ACTION' || vf.category === 'PROPS') {
        const factDesc = `Target prop & interaction: ${vf.fact}`;
        if (!reconciled.preserve.some(p => p.toLowerCase().includes(vf.fact.toLowerCase()))) {
          reconciled.preserve.push(factDesc);
          reconciled.provenanceMap[`fact_props_${vf.referenceId}`] = 'TARGET_IMAGE';
        }
      } else if (vf.category === 'CLOTHING_ARMOR') {
        const factDesc = `Target costume & armor: ${vf.fact}`;
        if (!reconciled.preserve.some(p => p.toLowerCase().includes(vf.fact.toLowerCase()))) {
          reconciled.preserve.push(factDesc);
          reconciled.provenanceMap[`fact_armor_${vf.referenceId}`] = 'TARGET_IMAGE';
        }
      } else if (vf.category === 'HEAD_ORIENTATION') {
        const factDesc = `Target head geometry: ${vf.fact}`;
        if (!reconciled.preserve.some(p => p.toLowerCase().includes(vf.fact.toLowerCase()))) {
          reconciled.preserve.push(factDesc);
          reconciled.provenanceMap[`fact_head_${vf.referenceId}`] = 'TARGET_IMAGE';
        }
      } else if (vf.category === 'ENVIRONMENT' && reconciled.environmentOwner === 'SCENARIO_REF') {
        const factDesc = `Environment scenery: ${vf.fact}`;
        if (!reconciled.preserve.some(p => p.toLowerCase().includes(vf.fact.toLowerCase()))) {
          reconciled.preserve.push(factDesc);
          reconciled.provenanceMap[`fact_env_${vf.referenceId}`] = 'SCENARIO_REFERENCE';
        }
      }
    }
  }

  // 4. Incorporate Director preserve / change items that don't violate rules
  if (Array.isArray(directorResult.preserve)) {
    for (const item of directorResult.preserve) {
      const lowerItem = item.toLowerCase();
      // Block domestic leakage
      if (
        (lowerItem.includes('room') || lowerItem.includes('bedroom') || lowerItem.includes('sofa') || lowerItem.includes('desk lamp')) &&
        reconciled.environmentOwner === 'NONE'
      ) {
        continue;
      }
      if (!reconciled.preserve.includes(item)) {
        reconciled.preserve.push(item);
      }
    }
  }

  // 5. Warnings from Director
  if (directorResult.directorWarnings && directorResult.directorWarnings.length > 0) {
    reconciled.unsupportedDetailsRemoved = [
      ...(reconciled.unsupportedDetailsRemoved || []),
      ...directorResult.directorWarnings
    ];
  }

  return reconciled;
}
