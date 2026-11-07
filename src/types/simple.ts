export type SimpleReferenceRole =
  | 'PESSOA'
  | 'PRODUTO'
  | 'CENÁRIO'
  | 'ESTILO'
  | 'COMPOSIÇÃO'
  | 'TIPOGRAFIA'
  | 'IMAGEM_ALVO'
  | 'OUTRA';

export type ScenarioInterpretation = 'MEU_AMBIENTE' | 'REFERENCIA_AMBIENTE';

export interface SimpleReference {
  id: string;
  url: string;
  name: string;
  role: SimpleReferenceRole;
  isTarget?: boolean;
  scenarioMode?: ScenarioInterpretation;
}

export type TargetModel =
  | 'GERAL'
  | 'OPENAI_GPT_IMAGE_2_5_SUNBURST'
  | 'OPENAI_GPT_IMAGE_2_5_FLARE'
  | 'GOOGLE_NANO_BANANA_2'
  | 'GOOGLE_NANO_BANANA_PRO'
  | 'MIDJOURNEY_V8_2'
  | 'MIDJOURNEY_NIJI_7'
  | 'FLUX_2_MAX'
  | 'FLUX_2_PRO'
  | 'FLUX_2_FLEX'
  | 'FLUX_2_KLEIN'
  | 'TEST_MODEL'
  | 'OPENAI'
  | 'GEMINI'
  | 'GOOGLE_IMAGEN'
  | 'MIDJOURNEY'
  | 'FLUX';

export type OpenAIImageQuality = 'auto' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export type ModelProvider = 'GENERAL' | 'OPENAI' | 'GOOGLE' | 'MIDJOURNEY' | 'BLACK_FOREST_LABS';

export interface ImageOutputMetadata {
  modelId: string;
  targetModel: TargetModel;
  aspectRatioHint: string;
  quality: OpenAIImageQuality | string;
  supportedQualities?: OpenAIImageQuality[];
}

export interface TargetModelConfig {
  id: TargetModel;
  provider: ModelProvider;
  providerGroup: string;
  displayName: string;
  family: string;
  apiModelId?: string;
  modelId?: string;
  description: string;
  selectable: boolean;
  promptStyle: 'neutral' | 'structured_contract' | 'natural_multireference' | 'concise_visual' | 'direct_natural_positive';
  supportsEditing: boolean;
  supportsReferences: boolean;
  supportsMultipleReferences: boolean;
  supportsTypography: boolean;
  negativePromptMode: 'standard' | 'strict_avoid' | 'none' | 'positive_conversion';
  legacyAliases?: string[];
  aspectRatio16_9Hint?: string;
  aspectRatio9_16Hint?: string;
  supportedQualities?: OpenAIImageQuality[];
  defaultQuality?: OpenAIImageQuality;
}

export const TARGET_MODEL_CONFIGS: Record<TargetModel, TargetModelConfig> = {
  GERAL: {
    id: 'GERAL',
    provider: 'GENERAL',
    providerGroup: 'GERAL',
    displayName: 'Geral — Compatível com todos',
    family: 'General',
    description: 'Prompt limpo e agnóstico de provedor para qualquer gerador moderno.',
    selectable: true,
    promptStyle: 'neutral',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: true,
    negativePromptMode: 'standard',
    aspectRatio16_9Hint: '16:9',
    aspectRatio9_16Hint: '9:16'
  },
  OPENAI_GPT_IMAGE_2_5_SUNBURST: {
    id: 'OPENAI_GPT_IMAGE_2_5_SUNBURST',
    provider: 'OPENAI',
    providerGroup: 'OPENAI',
    displayName: 'OpenAI — GPT Image 2.5 Sunburst',
    family: 'GPT Image 2.5',
    apiModelId: 'gpt-image-2.5-sunburst',
    modelId: 'gpt-image-2.5-sunburst',
    description: 'Máxima fidelidade para thumbnails exigentes, preservação estrita de identidade, produtos e edições precisas.',
    selectable: true,
    promptStyle: 'structured_contract',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: true,
    negativePromptMode: 'strict_avoid',
    legacyAliases: ['OPENAI'],
    aspectRatio16_9Hint: '3840x2160',
    aspectRatio9_16Hint: '2160x3840',
    supportedQualities: ['auto', 'low', 'medium', 'high', 'xhigh', 'max'],
    defaultQuality: 'high'
  },
  OPENAI_GPT_IMAGE_2_5_FLARE: {
    id: 'OPENAI_GPT_IMAGE_2_5_FLARE',
    provider: 'OPENAI',
    providerGroup: 'OPENAI',
    displayName: 'OpenAI — GPT Image 2.5 Flare',
    family: 'GPT Image 2.5',
    apiModelId: 'gpt-image-2.5-flare',
    modelId: 'gpt-image-2.5-flare',
    description: 'Geração rápida e eficiente para thumbnails diárias e experimentação iterativa.',
    selectable: true,
    promptStyle: 'structured_contract',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: true,
    negativePromptMode: 'strict_avoid',
    aspectRatio16_9Hint: '2048x1152',
    aspectRatio9_16Hint: '1152x2048',
    supportedQualities: ['auto', 'low', 'medium', 'high', 'xhigh'],
    defaultQuality: 'auto'
  },
  GOOGLE_NANO_BANANA_2: {
    id: 'GOOGLE_NANO_BANANA_2',
    provider: 'GOOGLE',
    providerGroup: 'GOOGLE',
    displayName: 'Google — Nano Banana 2',
    family: 'Nano Banana',
    apiModelId: 'gemini-3.1-flash-image',
    modelId: 'gemini-3.1-flash-image',
    description: 'Geração e edição ágil com múltiplas referências, consistência de personagem e tipografia nítida.',
    selectable: true,
    promptStyle: 'natural_multireference',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: true,
    negativePromptMode: 'standard',
    legacyAliases: ['GEMINI', 'GOOGLE_IMAGEN'],
    aspectRatio16_9Hint: '2048x1152',
    aspectRatio9_16Hint: '1152x2048',
    supportedQualities: ['auto', 'high'],
    defaultQuality: 'auto'
  },
  GOOGLE_NANO_BANANA_PRO: {
    id: 'GOOGLE_NANO_BANANA_PRO',
    provider: 'GOOGLE',
    providerGroup: 'GOOGLE',
    displayName: 'Google — Nano Banana Pro',
    family: 'Nano Banana',
    apiModelId: 'gemini-3-pro-image',
    modelId: 'gemini-3-pro-image',
    description: 'Composições profissionais difíceis, alta fidelidade de detalhes e cenas carregadas de referências.',
    selectable: true,
    promptStyle: 'natural_multireference',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: true,
    negativePromptMode: 'standard',
    aspectRatio16_9Hint: '3840x2160',
    aspectRatio9_16Hint: '2160x3840',
    supportedQualities: ['auto', 'high', 'max'],
    defaultQuality: 'high'
  },
  MIDJOURNEY_V8_2: {
    id: 'MIDJOURNEY_V8_2',
    provider: 'MIDJOURNEY',
    providerGroup: 'MIDJOURNEY',
    displayName: 'Midjourney — V8.2',
    family: 'Midjourney',
    apiModelId: 'v8.2',
    modelId: 'v8.2',
    description: 'Prompt visual conciso com proporção (--ar) e parâmetros atuais da versão 8.2.',
    selectable: true,
    promptStyle: 'concise_visual',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: false,
    negativePromptMode: 'none',
    legacyAliases: ['MIDJOURNEY'],
    aspectRatio16_9Hint: '--ar 16:9',
    aspectRatio9_16Hint: '--ar 9:16'
  },
  MIDJOURNEY_NIJI_7: {
    id: 'MIDJOURNEY_NIJI_7',
    provider: 'MIDJOURNEY',
    providerGroup: 'MIDJOURNEY',
    displayName: 'Midjourney — Niji 7',
    family: 'Niji',
    apiModelId: 'niji-7',
    modelId: 'niji-7',
    description: 'Tratamentos ilustrados, anime, mangá e composição visual com estética oriental refinada.',
    selectable: true,
    promptStyle: 'concise_visual',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: false,
    negativePromptMode: 'none',
    aspectRatio16_9Hint: '--ar 16:9',
    aspectRatio9_16Hint: '--ar 9:16'
  },
  FLUX_2_MAX: {
    id: 'FLUX_2_MAX',
    provider: 'BLACK_FOREST_LABS',
    providerGroup: 'BLACK FOREST LABS',
    displayName: 'FLUX.2 Max',
    family: 'FLUX.2',
    apiModelId: 'flux-2-max',
    modelId: 'flux-2-max',
    description: 'Saída fotográfica de máxima qualidade, seguimento estrito de instruções e texturas realistas.',
    selectable: true,
    promptStyle: 'direct_natural_positive',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: true,
    negativePromptMode: 'positive_conversion',
    legacyAliases: ['FLUX'],
    aspectRatio16_9Hint: '3840x2160',
    aspectRatio9_16Hint: '2160x3840',
    supportedQualities: ['auto', 'high', 'max'],
    defaultQuality: 'high'
  },
  FLUX_2_PRO: {
    id: 'FLUX_2_PRO',
    provider: 'BLACK_FOREST_LABS',
    providerGroup: 'BLACK FOREST LABS',
    displayName: 'FLUX.2 Pro',
    family: 'FLUX.2',
    apiModelId: 'flux-2-pro',
    modelId: 'flux-2-pro',
    description: 'Equilíbrio ideal entre velocidade e qualidade para fluxos profissionais do dia a dia.',
    selectable: true,
    promptStyle: 'direct_natural_positive',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: true,
    negativePromptMode: 'positive_conversion',
    aspectRatio16_9Hint: '2048x1152',
    aspectRatio9_16Hint: '1152x2048',
    supportedQualities: ['auto', 'high'],
    defaultQuality: 'auto'
  },
  FLUX_2_FLEX: {
    id: 'FLUX_2_FLEX',
    provider: 'BLACK_FOREST_LABS',
    providerGroup: 'BLACK FOREST LABS',
    displayName: 'FLUX.2 Flex',
    family: 'FLUX.2',
    apiModelId: 'flux-2-flex',
    modelId: 'flux-2-flex',
    description: 'Controle refinado e renderização tipográfica precisa diretamente na composição da imagem.',
    selectable: true,
    promptStyle: 'direct_natural_positive',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: true,
    negativePromptMode: 'positive_conversion',
    aspectRatio16_9Hint: '2048x1152',
    aspectRatio9_16Hint: '1152x2048',
    supportedQualities: ['auto', 'high'],
    defaultQuality: 'auto'
  },
  FLUX_2_KLEIN: {
    id: 'FLUX_2_KLEIN',
    provider: 'BLACK_FOREST_LABS',
    providerGroup: 'BLACK FOREST LABS',
    displayName: 'FLUX.2 Klein',
    family: 'FLUX.2',
    apiModelId: 'flux-2-klein',
    modelId: 'flux-2-klein',
    description: 'Iteração rápida, prévias imediatas e menor latência de geração.',
    selectable: true,
    promptStyle: 'direct_natural_positive',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: true,
    negativePromptMode: 'positive_conversion',
    aspectRatio16_9Hint: '1536x864',
    aspectRatio9_16Hint: '864x1536',
    supportedQualities: ['auto', 'low', 'medium'],
    defaultQuality: 'auto'
  },
  TEST_MODEL: {
    id: 'TEST_MODEL',
    provider: 'GENERAL',
    providerGroup: 'TEST',
    displayName: 'Test Model (Validação)',
    family: 'Test',
    apiModelId: 'test-model',
    modelId: 'test-model',
    description: 'Modelo temporário para validação de ponta a ponta da arquitetura.',
    selectable: false,
    promptStyle: 'neutral',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: true,
    negativePromptMode: 'standard',
    aspectRatio16_9Hint: '16:9',
    aspectRatio9_16Hint: '9:16'
  },
  OPENAI: {
    id: 'OPENAI',
    provider: 'OPENAI',
    providerGroup: 'OPENAI',
    displayName: 'OpenAI (Legado)',
    family: 'GPT Image 2.5',
    apiModelId: 'gpt-image-2.5-sunburst',
    modelId: 'gpt-image-2.5-sunburst',
    description: 'Redirecionado automaticamente para GPT Image 2.5 Sunburst.',
    selectable: false,
    promptStyle: 'structured_contract',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: true,
    negativePromptMode: 'strict_avoid',
    aspectRatio16_9Hint: '3840x2160',
    aspectRatio9_16Hint: '2160x3840',
    supportedQualities: ['auto', 'low', 'medium', 'high', 'xhigh', 'max'],
    defaultQuality: 'high'
  },
  GEMINI: {
    id: 'GEMINI',
    provider: 'GOOGLE',
    providerGroup: 'GOOGLE',
    displayName: 'Google Gemini Image (Legado)',
    family: 'Nano Banana',
    apiModelId: 'gemini-3.1-flash-image',
    modelId: 'gemini-3.1-flash-image',
    description: 'Redirecionado automaticamente para Google Nano Banana 2.',
    selectable: false,
    promptStyle: 'natural_multireference',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: true,
    negativePromptMode: 'standard',
    aspectRatio16_9Hint: '2048x1152',
    aspectRatio9_16Hint: '1152x2048'
  },
  GOOGLE_IMAGEN: {
    id: 'GOOGLE_IMAGEN',
    provider: 'GOOGLE',
    providerGroup: 'GOOGLE',
    displayName: 'Google Imagen (Legado)',
    family: 'Nano Banana',
    apiModelId: 'gemini-3.1-flash-image',
    modelId: 'gemini-3.1-flash-image',
    description: 'Redirecionado automaticamente para Google Nano Banana 2.',
    selectable: false,
    promptStyle: 'natural_multireference',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: true,
    negativePromptMode: 'standard',
    aspectRatio16_9Hint: '2048x1152',
    aspectRatio9_16Hint: '1152x2048'
  },
  MIDJOURNEY: {
    id: 'MIDJOURNEY',
    provider: 'MIDJOURNEY',
    providerGroup: 'MIDJOURNEY',
    displayName: 'Midjourney (Legado)',
    family: 'Midjourney',
    apiModelId: 'v8.2',
    modelId: 'v8.2',
    description: 'Redirecionado automaticamente para Midjourney V8.2.',
    selectable: false,
    promptStyle: 'concise_visual',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: false,
    negativePromptMode: 'none',
    aspectRatio16_9Hint: '--ar 16:9',
    aspectRatio9_16Hint: '--ar 9:16'
  },
  FLUX: {
    id: 'FLUX',
    provider: 'BLACK_FOREST_LABS',
    providerGroup: 'BLACK FOREST LABS',
    displayName: 'FLUX (Legado)',
    family: 'FLUX.2',
    apiModelId: 'flux-2-max',
    modelId: 'flux-2-max',
    description: 'Redirecionado automaticamente para FLUX.2 Max.',
    selectable: false,
    promptStyle: 'direct_natural_positive',
    supportsEditing: true,
    supportsReferences: true,
    supportsMultipleReferences: true,
    supportsTypography: true,
    negativePromptMode: 'positive_conversion',
    aspectRatio16_9Hint: '3840x2160',
    aspectRatio9_16Hint: '2160x3840'
  }
};

const TARGET_MODEL_ALIASES: Record<string, TargetModel> = {
  // OpenAI
  'OPENAI': 'OPENAI_GPT_IMAGE_2_5_SUNBURST',
  'DALL-E 3': 'OPENAI_GPT_IMAGE_2_5_SUNBURST',
  'DALLE3': 'OPENAI_GPT_IMAGE_2_5_SUNBURST',
  'GPT-4O': 'OPENAI_GPT_IMAGE_2_5_SUNBURST',
  'GPT-IMAGE-2.5-SUNBURST': 'OPENAI_GPT_IMAGE_2_5_SUNBURST',
  'SUNBURST': 'OPENAI_GPT_IMAGE_2_5_SUNBURST',
  'GPT-IMAGE-2.5-FLARE': 'OPENAI_GPT_IMAGE_2_5_FLARE',
  'FLARE': 'OPENAI_GPT_IMAGE_2_5_FLARE',

  // Google
  'GEMINI': 'GOOGLE_NANO_BANANA_2',
  'GOOGLE_IMAGEN': 'GOOGLE_NANO_BANANA_2',
  'IMAGEN': 'GOOGLE_NANO_BANANA_2',
  'GOOGLE': 'GOOGLE_NANO_BANANA_2',
  'GOOGLE GEMINI IMAGE': 'GOOGLE_NANO_BANANA_2',
  'GOOGLE GEMINI IMAGEN': 'GOOGLE_NANO_BANANA_2',
  'NANO_BANANA_2': 'GOOGLE_NANO_BANANA_2',
  'GEMINI-3.1-FLASH-IMAGE': 'GOOGLE_NANO_BANANA_2',
  'NANO BANANA 2': 'GOOGLE_NANO_BANANA_2',
  'NANO_BANANA_PRO': 'GOOGLE_NANO_BANANA_PRO',
  'GEMINI-3-PRO-IMAGE': 'GOOGLE_NANO_BANANA_PRO',
  'NANO BANANA PRO': 'GOOGLE_NANO_BANANA_PRO',

  // Midjourney
  'MIDJOURNEY': 'MIDJOURNEY_V8_2',
  'V8.2': 'MIDJOURNEY_V8_2',
  'V8_2': 'MIDJOURNEY_V8_2',
  'MIDJOURNEY_V8': 'MIDJOURNEY_V8_2',
  'NIJI_7': 'MIDJOURNEY_NIJI_7',
  'NIJI 7': 'MIDJOURNEY_NIJI_7',
  'NIJI': 'MIDJOURNEY_NIJI_7',

  // FLUX
  'FLUX': 'FLUX_2_MAX',
  'FLUX (ULTRA-DETALHES FOTO)': 'FLUX_2_MAX',
  'FLUX_ULTRA': 'FLUX_2_MAX',
  'FLUX ULTRA': 'FLUX_2_MAX',
  'FLUX-2-MAX': 'FLUX_2_MAX',
  'FLUX 2 MAX': 'FLUX_2_MAX',
  'FLUX-2-PRO': 'FLUX_2_PRO',
  'FLUX 2 PRO': 'FLUX_2_PRO',
  'FLUX-2-FLEX': 'FLUX_2_FLEX',
  'FLUX 2 FLEX': 'FLUX_2_FLEX',
  'FLUX-2-KLEIN': 'FLUX_2_KLEIN',
  'FLUX 2 KLEIN': 'FLUX_2_KLEIN'
};

export function normalizeTargetModel(model?: string | null): TargetModel {
  if (!model) return 'GERAL';
  const m = model.trim().toUpperCase();

  if (m in TARGET_MODEL_ALIASES) {
    return TARGET_MODEL_ALIASES[m];
  }

  if (m in TARGET_MODEL_CONFIGS) {
    return m as TargetModel;
  }

  return 'GERAL';
}

export interface TargetModelOption {
  id: TargetModel;
  displayName: string;
  description: string;
}

export interface TargetModelGroup {
  groupLabel: string;
  models: TargetModelOption[];
}

export function getSelectableTargetModels(): TargetModelGroup[] {
  const groupsMap = new Map<string, TargetModelOption[]>();

  for (const [, cfg] of Object.entries(TARGET_MODEL_CONFIGS)) {
    if (cfg.selectable !== true) continue;

    const group = cfg.providerGroup || 'GERAL';
    if (!groupsMap.has(group)) {
      groupsMap.set(group, []);
    }
    groupsMap.get(group)!.push({
      id: cfg.id,
      displayName: cfg.displayName,
      description: cfg.description
    });
  }

  return Array.from(groupsMap.entries()).map(([groupLabel, models]) => ({
    groupLabel,
    models
  }));
}

export type TextTreatment = 'AUTO' | 'USAR_REFERENCIA' | 'RENDER_IN_IMAGE' | 'SEM_TEXTO';
export type ReservedSpacePosition = 'ESQUERDA' | 'DIREITA' | 'SUPERIOR' | 'INFERIOR';

export type TaskType =
  | 'CREATE_NEW_SCENE'
  | 'EDIT_EXISTING_IMAGE'
  | 'IDENTITY_TRANSFER'
  | 'REPLACE_OBJECT'
  | 'CHANGE_ENVIRONMENT'
  | 'CHANGE_APPEARANCE'
  | 'STYLE_TRANSFER'
  | 'COMPOSITION_TRANSFER'
  | 'MIXED_EDIT';

export type AttributeOwner =
  | 'USER'
  | 'TARGET'
  | 'PERSON_REF'
  | 'PRODUCT_REF'
  | 'SCENARIO_REF'
  | 'STYLE_REF'
  | 'COMPOSITION_REF'
  | 'ADAPTED'
  | 'INFERRED'
  | 'NONE';

export type ProvenanceOrigin =
  | 'USER_EXPLICIT'
  | 'TARGET_IMAGE'
  | 'PERSON_REFERENCE'
  | 'PRODUCT_REFERENCE'
  | 'SCENARIO_REFERENCE'
  | 'STYLE_REFERENCE'
  | 'COMPOSITION_REFERENCE'
  | 'WEB_RESEARCH'
  | 'NECESSARY_ADAPTATION'
  | 'JUSTIFIED_INFERENCE'
  | 'UNSUPPORTED_DEFAULT';

export type ProductSourceState =
  | 'PRODUCT_REFERENCE_LOCKED'
  | 'PRODUCT_RESEARCH_GROUNDED'
  | 'PRODUCT_INFERRED';

export type AllowedResearchEntityType =
  | 'PRODUCT'
  | 'GAME_OR_FICTIONAL_WORLD'
  | 'PUBLIC_PLACE_OR_LANDMARK'
  | 'VEHICLE_MODEL';

export type AllowedResearchCategory =
  | 'PRODUCT_GEOMETRY'
  | 'CONTROL_LAYOUT'
  | 'SILHOUETTE'
  | 'MATERIAL'
  | 'COLOR'
  | 'ENVIRONMENT_TYPE'
  | 'TERRAIN'
  | 'ARCHITECTURE'
  | 'CLOTHING'
  | 'PROP'
  | 'SPATIAL_FEATURE'
  | 'VISUAL_MOTIF';

export interface ResearchFact {
  entity: string;
  category: AllowedResearchCategory;
  fact: string;
  confidence: number;
  visualRelevance: number;
  provenance: 'WEB_RESEARCH';
}

export interface ResearchResult {
  entity: string;
  category: AllowedResearchCategory;
  entityType?: AllowedResearchEntityType;
  facts: ResearchFact[];
  provider: string;
  cached?: boolean;
  latencyMs?: number;
  success: boolean;
  failureReason?: string;
  attempted?: boolean;
  timedOut?: boolean;
}

export interface ThemeContext {
  theme?: string;
  subjectDomain?: string;
  namedEntities: string[];
  narrativeGoal?: string;
  userEmotion?: string;
  importantSubjects: string[];
  importantObjects: string[];
  visualWorld?: string;
  environmentNeed: boolean;
  contextConfidence: number;
  researchCandidate: boolean;
  primaryVisualStory?: string;
}

export interface PhysicalInteractionPlan {
  numberOfHands?: number;
  gripType?: string;
  handPlacement?: string;
  objectOrientation?: string;
  distanceFromBody?: string;
  wristRelationship?: string;
  elbowRelationship?: string;
  faceVisibility?: string;
  objectVisibility?: string;
  cameraRelationship?: string;
  minimalAnatomicalAdaptation?: string;
  interactionConfidence: number;
  applied: boolean;
}

export interface SpatialHierarchyPlan {
  primarySubject: string;
  primaryObject?: string;
  heroSupportingItems?: string[];
  secondaryElements?: string[];
  subjectScale: string;
  objectScale: string;
  subjectObjectDistance: string;
  cropTightness: string;
  foregroundPriority: string;
  overlapStrategy: string;
  negativeSpaceNeed: string;
  thumbnailReadabilityRisk?: string;
  confidence: number;
  applied: boolean;
  compositionDirective?: string;
}

export interface ComplementaryDebugInfo {
  theme?: string;
  primaryVisualStory?: string;
  themeResolverUsed: boolean;
  researchEligible: boolean;
  researchEnabled: boolean;
  researchAttempted?: boolean;
  researchSucceeded?: boolean;
  researchTimedOut?: boolean;
  researchDurationMs?: number;
  researchProvider?: string;
  researchFacts?: ResearchFact[];
  environmentDecision?: string;
  environmentSource?: string;
  productSource?: ProductSourceState;
  interactionPlannerUsed: boolean;
  interactionPlan?: PhysicalInteractionPlan;
  spatialHierarchyPlannerUsed?: boolean;
  spatialHierarchyPlan?: SpatialHierarchyPlan;
  complementaryFieldsFilled: string[];
  complementaryFieldsRejectedDueToHigherAuthority: string[];
  researchFailureReason?: string;
}

export interface ScenePlan {
  taskType: TaskType;
  primarySubject: string;
  secondarySubject?: string;
  targetImage?: SimpleReference;
  identitySource?: SimpleReference;
  productSource?: SimpleReference;
  environmentSource?: SimpleReference;
  styleSource?: SimpleReference;
  compositionSource?: SimpleReference;
  // Ownership
  faceOwner: AttributeOwner;
  hairOwner: AttributeOwner;
  beardOwner: AttributeOwner;
  bodyOwner: AttributeOwner;
  poseOwner: AttributeOwner;
  headAngleOwner: AttributeOwner;
  clothingOwner: AttributeOwner;
  armorOwner?: AttributeOwner;
  propsOwner?: AttributeOwner;
  handsOwner: AttributeOwner;
  productOwner: AttributeOwner;
  environmentOwner: AttributeOwner;
  lightingOwner: AttributeOwner;
  compositionOwner: AttributeOwner;
  styleOwner: AttributeOwner;
  // Details
  camera?: string;
  pose?: string;
  expression?: string;
  environment?: string;
  lighting?: string;
  background?: string;
  text?: string;
  change: string[];
  preserve: string[];
  avoid: string[];
  provenanceMap: Record<string, ProvenanceOrigin>;
  unsupportedDetailsRemoved?: string[];
  // Complementary Engine Fields
  primaryVisualStory?: string;
  productSourceState?: ProductSourceState;
  themeContext?: ThemeContext;
  physicalInteractionPlan?: PhysicalInteractionPlan;
  spatialHierarchyPlan?: SpatialHierarchyPlan;
  researchFacts?: ResearchFact[];
  complementaryDebug?: ComplementaryDebugInfo;
}

export interface CreateThumbnailInput {
  videoTitle: string;
  ideaDescription: string;
  thumbnailText?: string;
  textTreatment?: TextTreatment;
  fontName?: string;
  reserveSpaceForText?: boolean;
  reservedSpacePosition?: ReservedSpacePosition;
  references: SimpleReference[];
  targetModel: TargetModel;
  aspectRatio: '16:9' | '9:16';
  stylePreset: 'Natural' | 'Cinematográfico' | 'Editorial' | 'Fotojornalismo';
  realismLevel: 'Alto' | 'Estilizado';
  preserveFace: boolean;
  preserveProduct: boolean;
  extraInstructions?: string;
  approachIndex?: number;
}

export interface VisualDirectionOutput {
  ideia: string;
  foco: string;
  composicao: string;
  expressao: string;
  visual: string;
}

export interface CreateThumbnailResult {
  direction: VisualDirectionOutput;
  finalPrompt: string;
  approachTitle: string;
  approachIndex: number;
  typographyPlan?: string;
  scenePlan?: ScenePlan;
  outputMetadata?: ImageOutputMetadata;
  targetModel?: TargetModel;
  /** How to use the prompt with the chosen model (attach references, text limits); never part of the prompt. */
  modelNotes?: string[];
}

export interface ImprovePromptInput {
  rawPrompt: string;
  targetModel?: TargetModel;
}

export interface ImprovePromptResult {
  changes: string[];
  improvedPrompt: string;
  targetModel?: TargetModel;
  outputMetadata?: ImageOutputMetadata;
}

export interface AnalyzeThumbnailSimpleResult {
  functioning: string[];
  aiLooking: string[];
  topProblem: string;
  fixPrompt: string;
  /** True when no multimodal director inspected the image (title-based heuristic only). */
  isLocal?: boolean;
  /**
   * Who produced the analysis:
   * - 'provider': paid key configured by the owner (OpenAI/Gemini director)
   * - 'workers-ai': free hosted vision model (Cloudflare Workers AI) grounded on local measurements
   * - 'local-pixels': browser measurements only (nothing uploaded, no AI)
   * - 'title-only': no image data available (generic checklist)
   */
  analysisSource?: 'provider' | 'workers-ai' | 'local-pixels' | 'title-only';
}

export interface SimpleHistoryItem {
  id: string;
  timestamp: string;
  mode: 'CRIAR' | 'MELHORAR' | 'ANALISAR';
  title: string;
  previewSummary: string;
  data: CreateThumbnailResult | ImprovePromptResult | AnalyzeThumbnailSimpleResult;
}
