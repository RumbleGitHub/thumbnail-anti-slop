import type {
  CreateThumbnailInput,
  CreateThumbnailResult,
  ImprovePromptInput,
  ImprovePromptResult,
  AnalyzeThumbnailSimpleResult,
  VisualDirectionOutput,
  ReservedSpacePosition,
  TextTreatment,
  SimpleReference,
  TaskType,
  ScenePlan,
  AttributeOwner,
  ProvenanceOrigin,
  TargetModel,
  TargetModelConfig,
  ImageOutputMetadata,
  TargetModelOption,
  TargetModelGroup,
  ResearchResult,
  ResearchFact,
  AllowedResearchCategory
} from '../../types/simple.ts';

import {
  normalizeTargetModel,
  TARGET_MODEL_CONFIGS,
  getSelectableTargetModels
} from '../../types/simple.ts';

export {
  normalizeTargetModel,
  TARGET_MODEL_CONFIGS,
  getSelectableTargetModels
};
export type { TargetModel, TargetModelConfig, TargetModelOption, TargetModelGroup };

import { resolveThemeContext, filterIrrelevantVisualClutter, isEligibleNamedEntity } from './themeResolver.ts';
import { ResearchBroker } from './researchBroker.ts';
import { planPhysicalInteraction } from './interactionPlanner.ts';
import { planSpatialHierarchy, isCompositionAuthoritativelyOwned } from './spatialHierarchyPlanner.ts';
import { mergeComplementaryPlan } from './complementaryMerge.ts';
import { PERSON_KEYWORDS } from './personDetection.ts';

export {
  resolveThemeContext,
  filterIrrelevantVisualClutter,
  isEligibleNamedEntity,
  ResearchBroker,
  planPhysicalInteraction,
  planSpatialHierarchy,
  isCompositionAuthoritativelyOwned,
  mergeComplementaryPlan
};
export type { ResearchResult, ResearchFact, AllowedResearchCategory };

/**
 * Master kill switch for complementary engines pass.
 * Default: false
 */
export function isComplementaryEnginesEnabled(): boolean {
  return process.env.COMPLEMENTARY_ENGINES_ENABLED === 'true';
}

// Internal Anti-Slop Safeguards grouped strictly by Section 8 requirements
export const CORE_ANTI_SLOP_AVOID = [
  // ROSTO
  'generic AI beauty face',
  'same-face syndrome',
  'perfect facial symmetry',
  'plastic skin',
  'waxy skin texture',
  'excessive beauty filter',
  'oversized eyes',
  'unnatural teeth',
  'generic shocked expression',
  'unnecessary mouth-open reaction',
  'identity drift from reference',
  'age change',
  'hair change',
  'beard change',
  'artificial beauty filter jaw slimming',
  // MÃOS / CORPO (Regra 1: Oclusão natural, sem exigir 5 dedos visíveis)
  'no duplicated or fused fingers',
  'no fingers intersecting the product',
  'no unnatural hand grip',
  'impossible arm pose',
  'body proportion drift',
  // PRODUTO
  'wrong geometry',
  'incorrect buttons',
  'incorrect analog sticks',
  'wrong ports',
  'invented vents',
  'wrong screen ratio',
  'incorrect thickness',
  'warped logo',
  'unrecognizable silhouette',
  'deformed hardware geometry',
  // LUZ
  'unmotivated rim light',
  'orange/teal lighting by default',
  'purple/blue gaming neon by default',
  'glowing edges',
  'impossible reflections',
  'multiple incompatible light directions',
  'volumetric light without source',
  // COMPOSIÇÃO
  'too many focal points',
  'everything equally sharp',
  'everything equally saturated',
  'everything equally contrasted',
  'background competing with subject',
  'generic centered stock-photo composition',
  'random floating elements',
  'too many visual metaphors',
  'tiny important story elements',
  'composition failing at thumbnail size',
  // PÓS-PROCESSAMENTO
  'overprocessed HDR',
  'excessive sharpening',
  'fake bokeh',
  'extreme color grading',
  'excessive contrast',
  'artificial clarity',
  'uniform micro-detail',
  'over-saturated skin',
  // THUMBNAIL CLICHÉS
  'random red arrows',
  'random circles',
  'floating emojis',
  'floating logos',
  'lightning',
  'sparks',
  'fire',
  'particles',
  'giant text',
  'generic shocked creator',
  'fake UI',
  'random VS',
  'generic before/after division',
  // TIPOGRAFIA (Regra 19: Evitar a "fonte de IA")
  'no malformed typography',
  'no pseudo-text',
  'no random letters',
  'no inconsistent glyphs',
  'no melted letterforms',
  'no distorted baseline',
  'no incorrect spelling',
  'no unnecessary 3D extrusion',
  'no fake metallic type by default'
];

// Helper to filter avoid tokens conditionally if the user narratively requested them (Rule 9)
export function buildAntiSlopAvoid(userText: string): string[] {
  const lower = userText.toLowerCase();
  return CORE_ANTI_SLOP_AVOID.filter(item => {
    if (/neon/i.test(item) && /neon/i.test(lower)) return false;
    if (item === 'fire' && /(fogo|fire|chama|fogueira)/i.test(lower)) return false;
    if (/arrow/i.test(item) && /(seta|arrow)/i.test(lower)) return false;
    if (/circles/i.test(item) && /(c[íi]rculo|circle)/i.test(lower)) return false;
    if (item === 'lightning' && /(raio|rel[âa]mpago|lightning)/i.test(lower)) return false;
    if (item === 'random VS' && /(vs\b|versus)/i.test(lower)) return false;
    return true;
  });
}

// Helper to detect gaming/tech/hardware in text
export function detectTechHardware(text: string): boolean {
  const pattern = /(legion|steam\s*deck|rog\s*ally|switch|gameboy|console|\bps[1-5]\b|\bpsp\b|ps\s*vita|dualsense|dualshock|headset|celular|joystick|controlador|videogame|gpu|rtx|playstation|xbox|nintendo|iphone|macbook|ipad|android|smartphone|pc\s*gamer|computador|setup|teclado|mouse|hardware|placa\s*de\s*v[íi]deo|intel|amd|ryzen|gadget|monitor|notebook|laptop|chip|circuito|bancada|teardown)/i;
  return pattern.test(text);
}

const HELD_OBJECT_EN: Record<string, string> = {
  mapa: 'map', espada: 'sword', escudo: 'shield', livro: 'book', caneca: 'mug', copo: 'cup',
  controle: 'controller', celular: 'phone', microfone: 'microphone', troféu: 'trophy', trofeu: 'trophy',
  capa: 'game case', jogo: 'game case', console: 'console', câmera: 'camera', camera: 'camera',
};

/**
 * Returns the English name of the object the user explicitly says is being held
 * ("segurando o mapa" -> "map"), or null. Only known nouns are translated so the
 * engine never invents a prop that the creator did not mention.
 */
export function describeHeldObjectEn(text: string): string | null {
  const m = (text || '').match(/segurando\s+(?:o|a|os|as|um|uma|meu|minha|seu|sua)?\s*([\p{L}]+)/iu);
  if (!m) return null;
  return HELD_OBJECT_EN[m[1].toLowerCase()] || null;
}

const KNOWN_BRAND_WORDS = /^(iphone|ipad|macbook|airpods|galaxy|pixel|xiaomi|redmi|poco|motorola|moto|samsung|apple|sony|playstation|xbox|nintendo|switch|steam|legion|rog|lenovo|asus|acer|dell|alienware|razer|logitech|corsair|hyperx|nvidia|geforce|radeon|ryzen|intel|gopro|dji|canon|nikon|fujifilm|tesla|honda|toyota|civic|corolla|volkswagen|fiat|chevrolet|ford|bmw|porsche|ferrari|lego|minecraft|fortnite|zelda|mario|pokemon|pokémon)$/i;

// Words that describe the video, not the object ("Gameplay", "Review", "Unboxing", "Vs").
const TITLE_VIDEO_WORDS = /^(gameplay|review|reviews|unboxing|teste|testei|tutorial|novidades|vale|vs|versus|top|melhores|piores|dicas|guia|tier|ranking|análise|analise|comparativo)$/i;

/** A token that clearly signals a product/proper name rather than an ordinary capitalized word. */
function isStrongNameToken(token: string): boolean {
  return /[A-Za-z]\d|\d[A-Za-z]/.test(token) ||   // S26, PS5, RTX4090, 4K
    /^[a-z]+[A-Z]/.test(token) ||                 // iPhone, eFootball
    /^[A-Z]{2,5}$/.test(token) ||                 // OLED, GTA, DLC
    KNOWN_BRAND_WORDS.test(token);
}

/**
 * Product/proper names that appear in the video title, e.g. "iPhone 17 Pro vs Galaxy S26 Ultra"
 * -> ["iPhone 17 Pro", "Galaxy S26 Ultra"]. Conservative: a run of capitalized/numeric tokens is kept
 * only when it contains a strong name token, so "Unboxing Gamer" or "Testei" never qualify.
 */
export function extractTitleNames(title: string): string[] {
  const text = (title || '').trim();
  // An all-caps title has no usable capitalization signal.
  if (!text || text === text.toUpperCase()) return [];
  const tokens = text.split(/\s+/);
  const names: string[] = [];
  let run: string[] = [];
  const flush = () => {
    // A lone brand or acronym ("Apple", "GTA") names a topic, not a specific object to draw.
    const qualifies = run.length > 1
      ? run.some(isStrongNameToken)
      : run.length === 1 && (/[A-Za-z]\d|\d[A-Za-z]/.test(run[0]) || /^[a-z]+[A-Z]/.test(run[0]));
    if (qualifies) names.push(run.join(' '));
    run = [];
  };
  for (const raw of tokens) {
    const token = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}+]+$/gu, '');
    if (TITLE_VIDEO_WORDS.test(token)) { flush(); continue; }
    const startsName = /^\p{Lu}/u.test(token) || /^[a-z]+[A-Z]/.test(token) || /[A-Za-z]\d|\d[A-Za-z]/.test(token);
    const continuesName = run.length > 0 && /^\d+$/.test(token); // "iPhone 17"
    if (token && (startsName || continuesName)) run.push(token);
    else flush();
    if (/[,:;!?()|]$|—|–/.test(raw)) flush();
  }
  flush();
  return names;
}

/**
 * Scene text for new compositions: the creator's idea, plus product/proper names that appear only in
 * the title ("iPhone 17 Pro vs Galaxy S26 Ultra" + "os dois celulares lado a lado"). With a TARGET image
 * the composition is locked, so nothing from the title is added.
 */
export function resolveSceneDescription(
  input: Pick<CreateThumbnailInput, 'videoTitle' | 'ideaDescription'>,
  hasTargetImage = false
): string {
  const idea = (input.ideaDescription || '').trim();
  const title = (input.videoTitle || '').trim();
  if (!idea) return title;
  if (hasTargetImage) return idea;
  const ideaLower = idea.toLowerCase();
  const missing = extractTitleNames(title).filter(name => !ideaLower.includes(name.toLowerCase()));
  if (missing.length === 0) return idea;
  return `${idea.replace(/[.!\s]+$/, '')} (featuring ${missing.join(' and ')}, as named in the video title)`;
}

// Translates vague buzzwords into concrete visual decisions (Rule 10)
export function translateVagueBuzzwords(text: string): string[] {
  const decisions: string[] = [];
  const lower = text.toLowerCase();

  if (/epic|dramatic|awesome|bomb[aá]stico|incr[íi]vel/.test(lower)) {
    decisions.push('High local contrast on the primary hero subject to command immediate visual attention while keeping overall lighting grounded');
  }

  if (/viral|high\s*ctr|scroll\s*stopping|chama\s*aten[çc][ãa]o|eye[\s-]catching/.test(lower)) {
    decisions.push('Bold figure-ground separation with a clean unmistakable silhouette that remains instantly legible at 120px mobile thumbnail scale');
  }

  if (/profissional|high[\s-]end|pro\s*look/.test(lower)) {
    decisions.push('Controlled physical lighting with motivated directional falloff and authentic material textures');
  }

  if (/cinematic/.test(lower)) {
    decisions.push('Deliberate narrative atmosphere and grounded optical depth rather than cartoon saturation or artificial studio glow');
  }

  return decisions;
}

// Helper for unicode-safe word/phrase boundary matching
function matchBoundary(text: string, subPattern: string): boolean {
  const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${subPattern})(?:[^\\p{L}\\p{N}]|$)`, 'iu');
  return re.test(text);
}

// Detects explicit environment request from user text (Rule: Authority order for environment)
export function detectExplicitEnvironment(text: string): {
  hasExplicitEnv: boolean;
  type?: 'sofa' | 'living_room' | 'bedroom' | 'office' | 'desk' | 'studio' | 'workshop' | 'street' | 'nature';
  descriptionEn?: string;
  lightingEn?: string;
} {
  const lower = text.toLowerCase();

  // 1. Sofa / Couch (Explicitly requested by user)
  if (matchBoundary(lower, 'no\\s*sof[aá]|num\\s*sof[aá]|em\\s*cima\\s*do\\s*sof[aá]|sof[aá]|couch|on\\s*(?:a\\s*)?sofa|on\\s*(?:the\\s*)?couch')) {
    return {
      hasExplicitEnv: true,
      type: 'sofa',
      descriptionEn: 'Comfortable living room sofa with authentic fabric texture and natural cushions',
      lightingEn: 'Warm motivated interior illumination from physical ambient room sources, balanced and natural'
    };
  }

  // 2. Living Room
  if (matchBoundary(lower, 'na\\s*sala(?:\\s*de\\s*estar)?|sala\\s*de\\s*estar|living\\s*room')) {
    return {
      hasExplicitEnv: true,
      type: 'living_room',
      descriptionEn: 'Authentic living room setting with natural interior architecture and decor',
      lightingEn: 'Motivated interior illumination from physical room sources, grounded and balanced'
    };
  }

  // 3. Bedroom
  if (matchBoundary(lower, 'no\\s*quarto|num\\s*quarto|quarto|bedroom')) {
    return {
      hasExplicitEnv: true,
      type: 'bedroom',
      descriptionEn: 'Authentic bedroom interior with natural personal decor and grounded physical atmosphere',
      lightingEn: 'Soft motivated room lighting with natural directional falloff'
    };
  }

  // 4. Desk / Table / Workbench
  if (matchBoundary(lower, 'na\\s*bancada|numa\\s*bancada|bancada|workbench')) {
    return {
      hasExplicitEnv: true,
      type: 'workshop',
      descriptionEn: 'Organized workbench with clean work surface and authentic tools',
      lightingEn: 'Diffused high-CRI task lighting with soft natural shadows'
    };
  }

  if (matchBoundary(lower, 'na\\s*mesa|numa\\s*mesa|mesa|on\\s*(?:a\\s*)?desk|on\\s*(?:the\\s*)?desk|on\\s*(?:a\\s*)?table|on\\s*(?:the\\s*)?table|desk')) {
    return {
      hasExplicitEnv: true,
      type: 'desk',
      descriptionEn: 'Clean neutral table surface with soft optical falloff',
      lightingEn: 'Diffused task illumination with natural soft shadow falloff'
    };
  }

  // 5. Office
  if (matchBoundary(lower, 'no\\s*escrit[oó]rio|num\\s*escrit[oó]rio|escrit[oó]rio|office')) {
    return {
      hasExplicitEnv: true,
      type: 'office',
      descriptionEn: 'Authentic office space with professional background elements and depth',
      lightingEn: 'Even motivated office ambient illumination with soft directional key'
    };
  }

  // 6. Studio
  if (matchBoundary(lower, 'no\\s*est[uú]dio|num\\s*est[uú]dio|est[uú]dio|studio')) {
    return {
      hasExplicitEnv: true,
      type: 'studio',
      descriptionEn: 'Professional studio background with deliberate tonal separation and clean depth',
      lightingEn: 'Controlled studio key and fill lighting with natural shadow gradation'
    };
  }

  // 7. Street / Urban
  if (matchBoundary(lower, 'na\\s*rua|na\\s*avenida|na\\s*cidade|cen[aá]rio\\s*urbano|street|city')) {
    return {
      hasExplicitEnv: true,
      type: 'street',
      descriptionEn: 'Authentic outdoor urban street background with realistic architectural depth',
      lightingEn: 'Natural outdoor daylight with environmental bounce and atmospheric falloff'
    };
  }

  // 8. Nature / Outdoors
  if (matchBoundary(lower, 'na\\s*praia|no\\s*mar|no\\s*campo|na\\s*floresta|no\\s*parque|na\\s*montanha|outdoors?|nature|beach|forest')) {
    return {
      hasExplicitEnv: true,
      type: 'nature',
      descriptionEn: 'Authentic natural outdoor environment with organic depth and textures',
      lightingEn: 'Natural open-air daylight with realistic environmental shadow falloff'
    };
  }

  return { hasExplicitEnv: false };
}

// Helper to determine context-aware depth of field
export function determineDepthOfField(idea: string, approachIndex: number): string {
  const explicitEnv = detectExplicitEnvironment(idea);

  if (approachIndex === 1) {
    // Hero close-up on object
    return 'natural optical separation softly isolating the foreground subject while preserving the secondary presence behind it';
  }

  if (explicitEnv.hasExplicitEnv) {
    if (explicitEnv.type === 'sofa' || explicitEnv.type === 'living_room') {
      return 'balanced optical depth that preserves the lived-in environmental context without distracting from the subject';
    }
    return 'balanced optical depth that preserves environmental context without distracting from the subject';
  }

  return 'natural photographic depth of field with organic optical falloff, softly defocusing the background to prioritize subject readability';
}

export interface TaskClassificationResult {
  taskType: TaskType;
  confidence: number;
  reasoning: string;
}

/**
 * 1. INTENT ROUTER: Deterministically classifies what the user actually wants to achieve.
 */
export function classifyTask(
  title: string,
  idea: string,
  references: SimpleReference[] = []
): TaskClassificationResult {
  const combined = `${title} ${idea}`.trim().toLowerCase();

  const hasTargetRef = references.some(r => r.role === 'IMAGEM_ALVO' || r.isTarget);
  const hasPersonRef = references.some(r => r.role === 'PESSOA');
  const hasProductRef = references.some(r => r.role === 'PRODUTO');
    const hasStyleRef = references.some(r => r.role === 'ESTILO');
  const hasCompRef = references.some(r => r.role === 'COMPOSIÇÃO');

  const characterRef = references.find(r =>
    /(personagem|character|alvo|target|crimson|heroi|hero|protagonista)/i.test(r.name)
  );

  // 1. IDENTITY TRANSFER: Adapting user's face/identity into a target character or master image
  const identityTransferPatterns = [
    /(adapte|coloc(ar|que)|troque|substitu(ir|a)|transfer(ir|a))\s*(o|meu)?\s*(rosto|face|identidade)\s*(n[oa]|para\s*o|em|into|onto)/i,
    /(meu\s*rosto\s*n[oa]|minha\s*face\s*n[oa]|adapt\s*my\s*face|put\s*my\s*face|transfer\s*identity|swap\s*face)/i,
    /(adapte|colocar?|botar?)\s*me\s*no\s*personagem/i,
    /(rosto\s*(no|nesse)\s*personagem|face\s*on\s*character)/i,
    /(adapt.*into.*character|put.*face.*character)/i
  ];

  const matchesIdentityTransfer = identityTransferPatterns.some(p => p.test(combined));
  if (matchesIdentityTransfer || (hasPersonRef && (hasTargetRef || characterRef) && /(rosto|face|personagem|character)/i.test(combined))) {
    return {
      taskType: 'IDENTITY_TRANSFER',
      confidence: 0.95,
      reasoning: 'O usuário deseja adaptar/reconstruir sua identidade facial em um personagem ou imagem-alvo estrutural.'
    };
  }

  // 2. REPLACE OBJECT: Replacing an object/device in an existing photo/master with another object
  const replaceObjectPatterns = [
    /(troqu?e|trocar|trocando|substitu[ia]|substituindo|mude|mudando|replace|replacing|swap|swapping)\s*(o|a|o\s*meu|o\s*produto|o\s*console|o\s*aparelho|o\s*objeto|o\s*controle|o\s*item)\s*(pel[oa]|por|com|for|with)/i,
    /(trocar|troque|trocando)\s*.*(pela\s*segunda|pelo\s*segundo|da\s*segunda\s*foto|da\s*outra\s*imagem|pelo\s*console|pelo\s*produto|pelo\s*controle)/i,
    /(substitua|substituir|substituindo)\s*o\s*(aparelho|console|controle|objeto|produto)/i,
    /(troque|trocando|substitua|substituindo|replace|replacing)\s*o\s*(console|aparelho|hardware|produto|dispositivo|controle)/i
  ];
  if (replaceObjectPatterns.some(p => p.test(combined)) || (hasProductRef && hasTargetRef && /(trocar|troque|trocando|substituir|substitua|substituindo|replace|replacing|swap)/i.test(combined))) {
    return {
      taskType: 'REPLACE_OBJECT',
      confidence: 0.9,
      reasoning: 'O usuário deseja substituir um objeto específico na imagem preservando a cena, pose e ambiente mestre.'
    };
  }

  // 3. CHANGE ENVIRONMENT: Replacing background while keeping subject
  const changeEnvironmentPatterns = [
    /(troqu?e|mude|altere|substitu[ia]|change|replace)\s*(o\s*)?(fundo|cen[aá]rio|background|ambiente)\s*(pel[oa]|por|com|for|with)/i,
    /(coloque|botar?)\s*n[oa]\s*(outro|outra|cen[aá]rio|fundo)/i,
    /(mudar|trocar)\s*o\s*fundo/i
  ];
  if (changeEnvironmentPatterns.some(p => p.test(combined))) {
    return {
      taskType: 'CHANGE_ENVIRONMENT',
      confidence: 0.88,
      reasoning: 'O usuário deseja substituir o fundo/cenário preservando o sujeito e a composição principal.'
    };
  }

  // 4. CHANGE APPEARANCE: Altering clothing, hair, colors on an existing subject
  const changeAppearancePatterns = [
    /(mude|troque|altere|pinte|change)\s*(a\s*roupa|o\s*cabelo|a\s*barba|a\s*cor|o\s*visual)/i
  ];
  if (hasTargetRef && changeAppearancePatterns.some(p => p.test(combined))) {
    return {
      taskType: 'CHANGE_APPEARANCE',
      confidence: 0.85,
      reasoning: 'O usuário deseja alterar aspectos estéticos específicos (roupa/cabelo) preservando a pessoa e enquadramento.'
    };
  }

  // 5. STYLE TRANSFER: Applying visual language / grading / textures only
  if (hasStyleRef && !hasTargetRef && /(estilo|visual\s*de|aesthetic|style)/i.test(combined) && !hasPersonRef && !hasProductRef) {
    return {
      taskType: 'STYLE_TRANSFER',
      confidence: 0.82,
      reasoning: 'O usuário deseja transferir apenas a linguagem visual e tratamento de cor/textura da referência.'
    };
  }

  // 6. COMPOSITION TRANSFER: Emulating camera / framing only
  if (hasCompRef && !hasTargetRef && /(enquadramento|composi[çc][ãa]o|posi[çc][ãa]o)/i.test(combined)) {
    return {
      taskType: 'COMPOSITION_TRANSFER',
      confidence: 0.8,
      reasoning: 'O usuário deseja reproduzir a proporção espacial e enquadramento da referência.'
    };
  }

  // 7. EDIT EXISTING IMAGE: General target modification
  if (hasTargetRef && /(edite|altere|corrija|inpaint|modifique)/i.test(combined)) {
    return {
      taskType: 'EDIT_EXISTING_IMAGE',
      confidence: 0.8,
      reasoning: 'O usuário forneceu uma imagem-alvo para edição cirúrgica preservando a estrutura mestre.'
    };
  }

  // 8. CREATE NEW SCENE: Default generative visual storytelling
  return {
    taskType: 'CREATE_NEW_SCENE',
    confidence: 0.9,
    reasoning: 'Criação de nova composição fotográfica a partir da descrição e referências conceituais.'
  };
}

export interface ResolvedTargetSources {
  targetImage?: SimpleReference;
  identitySource?: SimpleReference;
  productSource?: SimpleReference;
  environmentSource?: SimpleReference;
  styleSource?: SimpleReference;
  compositionSource?: SimpleReference;
}

/**
 * 2. TARGET & SOURCE RESOLVER: Distinguishes Target master from Source references.
 */
export function resolveTargetAndSources(
  taskType: TaskType,
  userIdea: string,
  references: SimpleReference[] = []
): ResolvedTargetSources {
  const result: ResolvedTargetSources = {};

  // 1. Explicit target by role or flag
  const explicitTarget = references.find(r => r.role === 'IMAGEM_ALVO' || r.isTarget);
  if (explicitTarget) {
    result.targetImage = explicitTarget;
  }

  // 2. Identity source (PESSOA)
  result.identitySource = references.find(r => r.role === 'PESSOA' && r !== result.targetImage);

  // 3. Environment source (CENÁRIO)
  result.environmentSource = references.find(r => r.role === 'CENÁRIO' && r !== result.targetImage);

  // 4. Product source (PRODUTO)
  result.productSource = references.find(r => r.role === 'PRODUTO' && r !== result.targetImage);

  // 5. Style source (ESTILO)
  result.styleSource = references.find(r => r.role === 'ESTILO' && r !== result.targetImage);

  // 6. Composition source (COMPOSIÇÃO)
  result.compositionSource = references.find(r => r.role === 'COMPOSIÇÃO' && r !== result.targetImage);

  // If target not explicitly set, infer based on taskType
  if (!result.targetImage) {
    if (taskType === 'IDENTITY_TRANSFER') {
      const characterNamedRef = references.find(
        r => r !== result.identitySource &&
             r !== result.environmentSource &&
             /(personagem|character|alvo|target|crimson|jogo|protagonista|modelo|foto\s*original)/i.test(r.name)
      );
      if (characterNamedRef) {
        result.targetImage = characterNamedRef;
      } else {
        const otherRef = references.find(r => r !== result.identitySource && r !== result.environmentSource);
        if (otherRef) {
          result.targetImage = otherRef;
        }
      }
    } else if (taskType === 'REPLACE_OBJECT') {
      if (references.length >= 2) {
        result.targetImage = references[0];
        result.productSource = references.find(r => r !== result.targetImage && (r.role === 'PRODUTO' || /console|produto|objeto/i.test(r.name))) || references[1];
      }
    } else if (taskType === 'CHANGE_ENVIRONMENT') {
      if (references.length >= 2) {
        result.targetImage = references[0];
        result.environmentSource = references.find(r => r !== result.targetImage && (r.role === 'CENÁRIO' || /cen[aá]rio|fundo|background/i.test(r.name))) || references[1];
      }
    }
  }

  return result;
}

export interface AttributeOwnershipMap {
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
}

/**
 * 3. ATTRIBUTE OWNERSHIP: Resolves attribute ownership before prompt building.
 */
export function resolveAttributeOwnership(
  taskType: TaskType,
  userIdea: string,
  resolved: ResolvedTargetSources
): AttributeOwnershipMap {
  const lower = userIdea.toLowerCase();

  let faceOwner: AttributeOwner = 'NONE';
  let hairOwner: AttributeOwner = 'NONE';
  let beardOwner: AttributeOwner = 'NONE';
  let bodyOwner: AttributeOwner = 'NONE';
  let poseOwner: AttributeOwner = 'NONE';
  let headAngleOwner: AttributeOwner = 'NONE';
  let clothingOwner: AttributeOwner = 'NONE';
  let armorOwner: AttributeOwner = 'NONE';
  let propsOwner: AttributeOwner = 'NONE';
  let handsOwner: AttributeOwner = 'NONE';
  let productOwner: AttributeOwner = 'NONE';
  let environmentOwner: AttributeOwner = 'NONE';
  let lightingOwner: AttributeOwner = 'INFERRED';
  let compositionOwner: AttributeOwner = 'INFERRED';
  const styleOwner: AttributeOwner = resolved.styleSource ? 'STYLE_REF' : 'NONE';

  if (taskType === 'IDENTITY_TRANSFER') {
    faceOwner = resolved.identitySource ? 'PERSON_REF' : 'USER';

    // Hair Ownership (Section 10)
    const keepsMyHair = /(meu\s*cabelo|minha\s*cabe[çc]a|my\s*hair)/i.test(lower);
    const keepsTargetHair = /(cabelo\s*do\s*personagem|target\s*hair|character\s*hair|mantenha.*cabelo|keep.*hair|visual\s*do\s*personagem)/i.test(lower);

    if (keepsMyHair && !keepsTargetHair) {
      hairOwner = 'PERSON_REF';
    } else {
      hairOwner = resolved.targetImage ? 'TARGET' : 'INFERRED';
    }

    // Beard Ownership (Section 10)
    const keepsMyBeard = /(minha\s*barba|my\s*beard|use\s*minha\s*barba|com\s*minha\s*barba)/i.test(lower);
    const keepsTargetBeard = /(barba\s*do\s*personagem|target\s*beard|character\s*beard|visual\s*do\s*personagem)/i.test(lower);

    if (keepsMyBeard && !keepsTargetBeard) {
      beardOwner = 'PERSON_REF';
    } else {
      beardOwner = resolved.targetImage ? 'TARGET' : 'INFERRED';
    }

    bodyOwner = resolved.targetImage ? 'TARGET' : 'INFERRED';
    poseOwner = resolved.targetImage ? 'TARGET' : 'INFERRED';
    headAngleOwner = resolved.targetImage ? 'TARGET' : 'INFERRED';
    clothingOwner = resolved.targetImage ? 'TARGET' : 'INFERRED';
    armorOwner = resolved.targetImage ? 'TARGET' : 'INFERRED';
    propsOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    handsOwner = 'ADAPTED';
    compositionOwner = resolved.targetImage ? 'TARGET' : 'INFERRED';
    productOwner = 'NONE';

    if (resolved.environmentSource) {
      environmentOwner = 'SCENARIO_REF';
      lightingOwner = 'SCENARIO_REF';
    } else if (resolved.targetImage) {
      environmentOwner = 'TARGET';
      lightingOwner = 'TARGET';
    } else {
      environmentOwner = 'NONE';
      lightingOwner = 'INFERRED';
    }
  } else if (taskType === 'REPLACE_OBJECT') {
    faceOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    hairOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    beardOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    bodyOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    poseOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    headAngleOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    clothingOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    productOwner = resolved.productSource ? 'PRODUCT_REF' : 'USER';
    handsOwner = 'ADAPTED';
    environmentOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    lightingOwner = resolved.targetImage ? 'TARGET' : 'INFERRED';
    compositionOwner = resolved.targetImage ? 'TARGET' : 'INFERRED';
  } else if (taskType === 'CHANGE_ENVIRONMENT') {
    faceOwner = resolved.targetImage ? 'TARGET' : (resolved.identitySource ? 'PERSON_REF' : 'NONE');
    hairOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    beardOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    bodyOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    poseOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    headAngleOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    clothingOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    productOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    handsOwner = resolved.targetImage ? 'TARGET' : 'NONE';
    environmentOwner = resolved.environmentSource ? 'SCENARIO_REF' : 'USER';
    lightingOwner = resolved.environmentSource ? 'SCENARIO_REF' : 'INFERRED';
    compositionOwner = resolved.targetImage ? 'TARGET' : 'INFERRED';
  } else {
    faceOwner = resolved.identitySource ? 'PERSON_REF' : 'USER';
    hairOwner = resolved.identitySource ? 'PERSON_REF' : 'USER';
    beardOwner = resolved.identitySource ? 'PERSON_REF' : 'USER';
    bodyOwner = 'USER';
    poseOwner = 'INFERRED';
    headAngleOwner = 'INFERRED';
    const isTech = detectTechHardware(userIdea);
    productOwner = resolved.productSource ? 'PRODUCT_REF' : (isTech || /produto|console|hardware|device|notebook/i.test(userIdea) ? 'USER' : 'NONE');
    handsOwner = productOwner !== 'NONE' ? 'ADAPTED' : 'INFERRED';
    const explicitEnv = detectExplicitEnvironment(userIdea);
    environmentOwner = resolved.environmentSource ? 'SCENARIO_REF' : (explicitEnv.hasExplicitEnv ? 'USER' : 'NONE');
    lightingOwner = explicitEnv.hasExplicitEnv ? 'USER' : 'INFERRED';
    compositionOwner = resolved.compositionSource ? 'COMPOSITION_REF' : 'INFERRED';
  }

  return {
    faceOwner,
    hairOwner,
    beardOwner,
    bodyOwner,
    poseOwner,
    headAngleOwner,
    clothingOwner,
    armorOwner,
    propsOwner,
    handsOwner,
    productOwner,
    environmentOwner,
    lightingOwner,
    compositionOwner,
    styleOwner
  };
}

/**
 * 4. PROVENANCE GUARD: Audits visual statements and purges unsupported defaults or reference leakages.
 */
/**
 * True when the environment was resolved by the user, an assigned scenario reference,
 * or the TARGET image. In those cases the prompt must not forbid the chosen setting.
 */
export function hasAuthoritativeEnvironment(plan: Pick<ScenePlan, 'environmentOwner'>): boolean {
  return plan.environmentOwner === 'USER' ||
    plan.environmentOwner === 'SCENARIO_REF' ||
    plan.environmentOwner === 'TARGET';
}

/**
 * True when `offset` falls inside an instruction that forbids something
 * (an AVOID/NEGATIVE section, or a clause such as "without ... (no bedrooms, desks)").
 * Rewriting tokens there would turn "no desks" into "no clean neutral background".
 */
function isInsideNegatedInstruction(text: string, offset: number): boolean {
  const before = text.slice(0, offset);
  const headings = before.match(/^[A-Z][A-Z /&()'-]+:/gm);
  const lastHeading = headings ? headings[headings.length - 1] : '';
  if (/AVOID|NEGATIVE/.test(lastHeading)) return true;
  const clauseStart = Math.max(before.lastIndexOf('\n'), before.lastIndexOf('.'), before.lastIndexOf(';'), before.lastIndexOf(':'));
  const clause = before.slice(clauseStart + 1);
  return /\b(no|not|zero|without|avoid|avoiding|never)\b/i.test(clause);
}

export function auditPromptProvenance(
  promptText: string,
  scenePlan: ScenePlan,
  references: SimpleReference[] = []
): { cleanedPrompt: string; purged: string[]; warnings: string[] } {
  let cleaned = promptText;
  const purged: string[] = [];
  const warnings: string[] = [];

  // 1. UNSUPPORTED DOMESTIC ENVIRONMENT PURGE
  const hasExplicitEnv = hasAuthoritativeEnvironment(scenePlan);

  if (!hasExplicitEnv) {
    const domesticTokens = [
      /(a\s+)?(cozy\s+)?(real\s+)?apartment\s+living\s+room/gi,
      /(a\s+)?(domestic\s+)?(bedroom|living\s+room|home\s+office|gaming\s+room|streamer\s+setup)/gi,
      /(authentic\s+)?sofa(\s+cushions)?/gi,
      /(a\s+)?(wooden\s+)?(work\s+)?desk(\s+lamp)?/gi,
      /floor\s+lamp/gi,
      /abajur(\s+de\s+sala)?/gi,
      /window\s+light(\s+bounce)?/gi
    ];

    for (const pattern of domesticTokens) {
      let replacedAny = false;
      cleaned = cleaned.replace(pattern, (match: string, ...rest: unknown[]) => {
        const offset = rest[rest.length - 2] as number;
        const source = rest[rest.length - 1] as string;
        // Leave exclusions intact: "no bedrooms" already forbids the setting.
        if (isInsideNegatedInstruction(source, offset)) return match;
        replacedAny = true;
        return 'clean neutral background with generous negative space';
      });
      if (replacedAny) {
        purged.push(`Removed unsupported domestic environment fallback matching ${pattern}`);
      }
    }
  }

  // 2. UNSUPPORTED PRODUCT / DEVICE HERO PURGE
  if (scenePlan.productOwner === 'NONE') {
    const productHeroTokens = [
      /HARDWARE\s*&\s*PRODUCT\s*FIDELITY[^\n]*\n?/gi,
      /holding\s+the\s+(handheld\s+)?(gaming\s+)?console[^\n,.]*/gi,
      /holding\s+the\s+device[^\n,.]*/gi,
      /opened\s+laptop\s+chassis[^\n,.]*/gi,
      /physical\s+product\s+hero[^\n,.]*/gi,
      /creator\s+standing\s+behind\s+(a\s+)?(glowing\s+)?product/gi
    ];

    for (const pattern of productHeroTokens) {
      if (pattern.test(cleaned)) {
        purged.push(`Removed unsupported product hero framing matching ${pattern}`);
        cleaned = cleaned.replace(pattern, '');
      }
    }
  }

  // 3. REFERENCE LEAKAGE GUARDS (Section 17)
  const personRefs = references.filter(r => r.role === 'PESSOA');
  if (personRefs.length > 0 && scenePlan.environmentOwner !== 'SCENARIO_REF') {
    const personLeakTokens = [
      /selfie\s+background/gi,
      /bed\s+in\s+the\s+background/gi,
      /bedroom\s+wall/gi
    ];
    for (const pattern of personLeakTokens) {
      if (pattern.test(cleaned)) {
        purged.push(`Prevented person reference environment leakage matching ${pattern}`);
        cleaned = cleaned.replace(pattern, '');
      }
    }
  }

  const productRefs = references.filter(r => r.role === 'PRODUTO');
  if (productRefs.length > 0) {
    const productLeakTokens = [
      /product\s+photo\s+studio\s+cyclorama/gi,
      /studio\s+lightbox/gi
    ];
    for (const pattern of productLeakTokens) {
      if (pattern.test(cleaned)) {
        purged.push(`Prevented product reference studio leakage matching ${pattern}`);
        cleaned = cleaned.replace(pattern, '');
      }
    }
  }

  const styleRefs = references.filter(r => r.role === 'ESTILO');
  if (styleRefs.length > 0) {
    const styleLeakTokens = [
      /woman\s+in\s+red\s+jacket/gi,
      /specific\s+person\s+from\s+style\s+reference/gi
    ];
    for (const pattern of styleLeakTokens) {
      if (pattern.test(cleaned)) {
        purged.push(`Prevented style reference subject leakage matching ${pattern}`);
        cleaned = cleaned.replace(pattern, '');
      }
    }
  }

  const compRefs = references.filter(r => r.role === 'COMPOSIÇÃO');
  if (compRefs.length > 0) {
    const compLeakTokens = [
      /motorcycle/gi,
      /vehicle\s+from\s+composition\s+reference/gi
    ];
    for (const pattern of compLeakTokens) {
      if (pattern.test(cleaned)) {
        purged.push(`Prevented composition reference object leakage matching ${pattern}`);
        cleaned = cleaned.replace(pattern, '');
      }
    }
  }

  // 4. FACE PASTE SANITIZER (Section 8 & 9)
  // Only sanitize positive instruction blocks (before NEGATIVE / STRICTLY AVOID)
  const [positivePart, ...negParts] = cleaned.split('NEGATIVE / STRICTLY AVOID:');
  let cleanPos = positivePart;
  const facePasteTokens = [
    /paste\s+(the\s+)?(user'?s?\s+)?face/gi,
    /overlay\s+(the\s+)?(user'?s?\s+)?face/gi,
    /cut\s+and\s+paste\s+face/gi,
    /swap\s+face\s+texture/gi,
    /frontal\s+face\s+onto\s+target/gi
  ];
  for (const pattern of facePasteTokens) {
    if (pattern.test(cleanPos)) {
      purged.push(`Sanitized face-paste phrasing matching ${pattern}`);
      cleanPos = cleanPos.replace(pattern, 'reconstruct the target character facial anatomy to authentically match the identity');
    }
  }

  cleaned = negParts.length > 0
    ? `${cleanPos.trim()}\n\nNEGATIVE / STRICTLY AVOID:\n${negParts.join('NEGATIVE / STRICTLY AVOID:').trim()}`
    : cleanPos.trim();

  // 5. UNTRUSTED WEB CONTENT & PROMPT-INJECTION PURGE
  const injectionOrWebTokens = [
    /https?:\/\/[\S]+/gi,
    /www\.[\S]+/gi,
    /ignore\s+previous\s+instructions/gi,
    /system\s*prompt/gi,
    /developer\s*message/gi,
    /assistant\s*must/gi
  ];
  for (const pattern of injectionOrWebTokens) {
    if (pattern.test(cleaned)) {
      purged.push(`Purged untrusted web or injection token matching ${pattern}`);
      cleaned = cleaned.replace(pattern, '');
    }
  }

  // 6. VALIDATE WEB_RESEARCH PROVENANCE (Must have valid accepted research facts)
  const hasValidResearchFacts = Array.isArray(scenePlan.researchFacts) && scenePlan.researchFacts.length > 0;
  for (const [key, prov] of Object.entries(scenePlan.provenanceMap || {})) {
    if (prov === 'WEB_RESEARCH' && !hasValidResearchFacts) {
      scenePlan.provenanceMap[key] = 'JUSTIFIED_INFERENCE';
      warnings.push(`Downgraded ungrounded WEB_RESEARCH provenance on "${key}" to JUSTIFIED_INFERENCE`);
    }
  }

  cleaned = cleaned.replace(/,\s*(?=,)/g, '').replace(/,\s*\./g, '.');

  return {
    cleanedPrompt: cleaned,
    purged,
    warnings
  };
}

/**
 * Detects explicit user requests to change or adjust lighting in prompts.
 * Crucial rule: "make it more impactful", "make it better", "bigger and closer" MUST NOT trigger relighting.
 */
export function detectExplicitLightingRequest(text: string): { requested: boolean; direction?: string } {
  if (/(?:make\s+(?:the\s+)?(?:lighting|light)\s+brighter|brighter\s+(?:lighting|light)|increase\s+exposure|higher\s+key|ilumina[çc][ãa]o\s+mais\s+clara)/i.test(text)) {
    return { requested: true, direction: 'BRIGHTER' };
  }
  if (/(?:make\s+(?:the\s+)?(?:lighting|light)\s+darker|darker\s+(?:lighting|light)|lower\s+key|ilumina[çc][ãa]o\s+mais\s+escura)/i.test(text)) {
    return { requested: true, direction: 'DARKER' };
  }
  if (/(?:change|switch|turn)\s+(?:the\s+)?(?:lighting|light)\s+to\s+night|(?:ilumina[çc][ãa]o|luz)\s+noturna/i.test(text)) {
    return { requested: true, direction: 'NIGHT' };
  }
  if (/(?:fix|balance)\s+(?:the\s+)?shadows?|ajustar\s+sombras/i.test(text)) {
    return { requested: true, direction: 'FIX_SHADOWS' };
  }
  if (/(?:make\s+(?:the\s+)?(?:lighting|light)\s+(?:softer|warmer|cooler)|(?:change|adjust)\s+(?:the\s+)?(?:lighting|light)\b)/i.test(text)) {
    return { requested: true, direction: 'CUSTOM' };
  }
  return { requested: false };
}

/**
 * Extracts existing scene lighting from prompt text to preserve it verbatim.
 * Filters out artificial slop lighting (neon, rim light, glow).
 */
export function extractExistingLighting(text: string): string | null {
  // Check for explicit LIGHTING section
  const sectionMatch = text.match(/LIGHTING:\s*([^.\n]+(?:\.[^.\n]+)*)/i);
  if (sectionMatch && sectionMatch[1]) {
    const val = sectionMatch[1].trim();
    if (!/(?:neon|rim\s*light|laser|outer\s*glow|cinematic|dramatic\s*lighting)/i.test(val)) {
      return val;
    }
  }

  // Check sentences in text
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  for (const sentence of sentences) {
    const s = sentence.trim().replace(/[.!?]+$/, '');
    if (!s) continue;
    // Ignore if it's artificial slop lighting
    if (/(?:neon|rim\s*light|laser|outer\s*glow|sparks|particles)/i.test(s)) {
      continue;
    }
    // Match authentic physical lighting descriptions
    if (
      /(?:(?:soft|warm|diffuse|subtle|directional|clean|natural|overhead|tungsten|daylight|sunlight|ambient)\s+(?:natural\s+)?(?:window\s+light|room\s+light|lighting|illumination|light|shadow\s+falloff))/i.test(s) ||
      /(?:window\s+light|natural\s+light|shadow\s+falloff|directional\s+light|ambient\s+light)\s+(?:from|with|side)/i.test(s)
    ) {
      return s;
    }
  }

  return null;
}

/**
 * 5. SCENE PLAN BUILDER: Assembles the ScenePlan data structure.
 */
export function buildScenePlan(
  input: CreateThumbnailInput,
  _approachIndex = 0
): ScenePlan {
  void _approachIndex;
  const { videoTitle, ideaDescription, references = [] } = input;
  const userText = `${videoTitle} ${ideaDescription}`.trim();

  const { taskType } = classifyTask(videoTitle, userText, references);
  const resolved = resolveTargetAndSources(taskType, userText, references);
  const ownership = resolveAttributeOwnership(taskType, userText, resolved);

  const change: string[] = [];
  const preserve: string[] = [];
  const provenanceMap: Record<string, ProvenanceOrigin> = {};

  if (taskType === 'IDENTITY_TRANSFER') {
    const targetName = resolved.targetImage?.name || 'personagem-alvo';
    const idName = resolved.identitySource?.name || 'sua foto';

    change.push(
      `Reconstruct facial anatomy to embody the authentic identity from reference (${idName}): facial proportions, eye shape, nose structure, mouth, bone structure, and true age.`
    );
    provenanceMap['face'] = 'PERSON_REFERENCE';

    preserve.push(`Target character head pose, 3D skull orientation, perspective, tilt, and gaze direction from master (${targetName}).`);
    provenanceMap['head_pose'] = 'TARGET_IMAGE';

    if (ownership.hairOwner === 'TARGET') {
      preserve.push(`Exact target character hairstyle, hair color, and hair volume from master (${targetName}).`);
      provenanceMap['hair'] = 'TARGET_IMAGE';
    } else {
      change.push(`User personal hairstyle from identity reference (${idName}).`);
      provenanceMap['hair'] = 'PERSON_REFERENCE';
    }

    if (ownership.beardOwner === 'TARGET') {
      preserve.push(`Exact target character facial hair / beard styling and texture from master (${targetName}).`);
      provenanceMap['beard'] = 'TARGET_IMAGE';
    } else if (ownership.beardOwner === 'PERSON_REF') {
      change.push(`User personal beard style from identity reference (${idName}).`);
      provenanceMap['beard'] = 'PERSON_REFERENCE';
    }

    preserve.push(`Exact target character armor, costume, clothing, materials, and physical textures.`);
    provenanceMap['costume'] = 'TARGET_IMAGE';

    preserve.push(`Target body pose, physical build, and held props (${describeHeldObjectEn(input.ideaDescription) ? `including holding the ${describeHeldObjectEn(input.ideaDescription)} / equipment` : 'any object or equipment already held in the target'}) with anatomically plausible hands.`);
    provenanceMap['body_and_props'] = 'TARGET_IMAGE';

    preserve.push(`Camera angle, framing distance, and optical perspective from target master.`);
    provenanceMap['camera'] = 'TARGET_IMAGE';

    if (resolved.environmentSource) {
      change.push(`Background and setting seamlessly replaced with supplied environment reference (${resolved.environmentSource.name}).`);
      preserve.push(`Motivated physical illumination harmonized with the supplied environment.`);
      provenanceMap['environment'] = 'SCENARIO_REFERENCE';
      provenanceMap['lighting'] = 'SCENARIO_REFERENCE';
    } else if (resolved.targetImage) {
      const explicitLighting = detectExplicitLightingRequest(userText);
      if (explicitLighting.requested) {
        change.push(`Adjust lighting as explicitly requested: ${explicitLighting.direction === 'BRIGHTER' ? 'brighter illumination and increased exposure' : explicitLighting.direction === 'DARKER' ? 'darker moody lighting' : explicitLighting.direction === 'NIGHT' ? 'night illumination' : 'adjusted lighting and shadow balance'}.`);
        provenanceMap['lighting'] = 'USER_EXPLICIT';
        preserve.push(`Target environment and background setting exactly as in master image (${targetName}).`);
        provenanceMap['environment'] = 'TARGET_IMAGE';
      } else {
        preserve.push(`Target environment and background setting exactly as in master image (${targetName}).`);
        provenanceMap['environment'] = 'TARGET_IMAGE';
        provenanceMap['lighting'] = 'TARGET_IMAGE';
      }
    } else {
      provenanceMap['environment'] = 'UNSUPPORTED_DEFAULT';
    }
  } else if (taskType === 'REPLACE_OBJECT') {
    const targetName = resolved.targetImage?.name || 'foto base';
    const prodName = resolved.productSource?.name || 'novo produto';

    change.push(`Replace target object/device with exact hardware geometry, buttons, ports, and silhouette of (${prodName}).`);
    provenanceMap['product'] = 'PRODUCT_REFERENCE';

    change.push(`Adapt hand grip naturally around the new hardware with anatomically plausible fingers and natural occlusion.`);
    provenanceMap['hands'] = 'NECESSARY_ADAPTATION';

    preserve.push(`Preserve person facial identity, expression, gaze, body pose, and clothing from (${targetName}).`);
    provenanceMap['person'] = 'TARGET_IMAGE';

    const explicitLighting = detectExplicitLightingRequest(userText);
    if (explicitLighting.requested) {
      change.push(`Adjust lighting as explicitly requested: ${explicitLighting.direction === 'BRIGHTER' ? 'brighter illumination and increased exposure' : explicitLighting.direction === 'DARKER' ? 'darker moody lighting' : explicitLighting.direction === 'NIGHT' ? 'night illumination' : 'adjusted lighting and shadow balance'}.`);
      provenanceMap['lighting'] = 'USER_EXPLICIT';
      preserve.push(`Preserve background setting, camera angle, and framing from (${targetName}).`);
      provenanceMap['environment'] = 'TARGET_IMAGE';
    } else {
      preserve.push(`Preserve background setting, camera angle, framing, and scene lighting from (${targetName}).`);
      provenanceMap['environment'] = 'TARGET_IMAGE';
      provenanceMap['lighting'] = 'TARGET_IMAGE';
    }
  } else if (taskType === 'CHANGE_ENVIRONMENT') {
    const targetName = resolved.targetImage?.name || 'sujeito base';
    const envName = resolved.environmentSource?.name || 'novo cenário';

    change.push(`Replace background with authentic location/atmosphere from (${envName}).`);
    provenanceMap['environment'] = 'SCENARIO_REFERENCE';

    preserve.push(`Preserve primary subject, face, body pose, clothing, and any held objects exactly from (${targetName}).`);
    provenanceMap['subject'] = 'TARGET_IMAGE';

    preserve.push(`Camera angle and subject scale hierarchy from master (${targetName}).`);
    provenanceMap['camera'] = 'TARGET_IMAGE';
  } else {
    provenanceMap['concept'] = 'USER_EXPLICIT';
    if (resolved.environmentSource) {
      provenanceMap['environment'] = 'SCENARIO_REFERENCE';
    } else if (/sof[aá]|quarto|sala|rua|praia|est[uú]dio|mesa|bancada/i.test(userText)) {
      provenanceMap['environment'] = 'USER_EXPLICIT';
    } else {
      provenanceMap['environment'] = 'JUSTIFIED_INFERENCE';
    }
  }

  const avoid = buildAntiSlopAvoid(userText);
  if (taskType === 'IDENTITY_TRANSFER') {
    avoid.push('paste face', 'overlay face', 'flat frontal face on rotated head', 'plastic waxy skin', 'beauty filter jaw slimming');
    avoid.push('domestic room', 'sofa', 'desk lamp', 'floor lamp', 'living room furniture', 'physical product hero', 'device teardown');
  }

  return {
    taskType,
    primarySubject: resolved.targetImage?.name || ideaDescription || videoTitle,
    secondarySubject: resolved.productSource?.name,
    targetImage: resolved.targetImage,
    identitySource: resolved.identitySource,
    productSource: resolved.productSource,
    environmentSource: resolved.environmentSource,
    styleSource: resolved.styleSource,
    compositionSource: resolved.compositionSource,
    ...ownership,
    change,
    preserve,
    avoid,
    provenanceMap
  };
}

export interface PromptBuilderResult {
  finalPrompt: string;
  directionPt: VisualDirectionOutput;
  approachTitle: string;
  typographyPlan?: string;
  cleanedPlan: ScenePlan;
  outputMetadata?: ImageOutputMetadata;
}

export function resolveOutputMetadata(
  targetModel: TargetModel = 'GERAL',
  aspectRatio: '16:9' | '9:16' = '16:9'
): ImageOutputMetadata | undefined {
  const norm = normalizeTargetModel(targetModel);
  const cfg = TARGET_MODEL_CONFIGS[norm];
  if (!cfg || !cfg.modelId) return undefined;

  const aspectHint = aspectRatio === '9:16'
    ? (cfg.aspectRatio9_16Hint || '1152x2048')
    : (cfg.aspectRatio16_9Hint || '2048x1152');

  return {
    modelId: cfg.modelId,
    targetModel: norm,
    aspectRatioHint: aspectHint,
    quality: cfg.defaultQuality || 'auto',
    supportedQualities: cfg.supportedQualities || ['auto', 'high']
  };
}

/**
 * Builds structured prompt for OpenAI GPT Image 2.5 targets (Sunburst / Flare).
 * Enforces structured sections:
 * GOAL, REFERENCE ROLES, TARGET IMAGE (or TARGET STRUCTURE / IDENTITY SOURCE),
 * CHANGE, ADAPT, PRESERVE, ENVIRONMENT, COMPOSITION, LIGHTING, AVOID.
 * Note: Aspect ratio resolutions and qualities are maintained in metadata, NOT hardcoded in prompt.
 */
/**
 * New-scene decisions the engine has already resolved (person present, which PESSOA
 * references own the face, whether a product must keep its real geometry). Passed to
 * every model adapter so each renders the same locks in its own idiom. When absent,
 * adapters keep their previous behavior (edit tasks, legacy callers).
 */
export interface NewSceneSubject {
  hasPerson: boolean;
  identityRefs: SimpleReference[];
  productLock: boolean;
  productRefs: SimpleReference[];
  productFacts: string[];
}

const refNameList = (refs: SimpleReference[]) => refs.map(r => `"${r.name}"`).join(', ');
const refImageList = (all: SimpleReference[], refs: SimpleReference[]) =>
  refs.map(r => `Image ${all.findIndex(x => x.id === r.id) + 1} ("${r.name}")`).join(', ');
const factSentence = (facts: string[]) => (facts.length > 0 ? ` Grounded physical characteristics: ${facts.join('. ')}.` : '');

export function buildOpenAIStructuredPrompt({
  plan,
  input,
  variant,
  typographyDirective,
  arParam,
  subject
}: {
  plan: ScenePlan;
  input: CreateThumbnailInput;
  variant: 'SUNBURST' | 'FLARE';
  typographyDirective: string;
  arParam: string;
  subject?: NewSceneSubject;
}): string {
  const { videoTitle = '', ideaDescription = '', references = [], extraInstructions } = input;
  const cleanIdea = resolveSceneDescription(input, Boolean(plan.targetImage));
  const targetName = plan.targetImage?.name || 'personagem/imagem mestre';
  const idName = plan.identitySource?.name || 'foto de identidade';
  const prodName = plan.productSource?.name || 'novo produto';
  const envName = plan.environmentSource?.name || 'novo cenário';

  const isSunburst = variant === 'SUNBURST';

  // 1. GOAL
  let goal = '';
  if (plan.taskType === 'IDENTITY_TRANSFER') {
    goal = isSunburst
      ? `Execute high-fidelity photographic YouTube thumbnail with precise anatomical identity reconstruction, organically embodying source individual facial identity into target character body and world without synthetic AI gloss or beauty filters.`
      : `Photographic YouTube thumbnail with anatomical identity reconstruction of the target character embodying source identity.`;
  } else if (plan.taskType === 'REPLACE_OBJECT') {
    goal = isSunburst
      ? `Surgically replace the held object with the referenced physical hardware with exact industrial geometry, chassis proportions, matte tactile finish, and natural hand grip contact.`
      : `Surgically replace held object with referenced hardware while preserving human pose, lighting, and scene context.`;
  } else if (plan.taskType === 'CHANGE_ENVIRONMENT') {
    goal = isSunburst
      ? `Seamlessly transport the primary subject into the referenced environment, preserving authentic human identity, clothing, and posture while realistically harmonizing directional environmental lighting.`
      : `Replace background with referenced environment while preserving subject identity, clothing, and framing.`;
  } else {
    goal = isSunburst
      ? `Generate an authentic, high-impact photographic YouTube thumbnail for "${cleanIdea}". Maximize click-through readability at small mobile feed scale (120px) through clean figure-ground separation and tactile physical realism.`
      : `Generate a photographic YouTube thumbnail for "${cleanIdea}". Clean visual hierarchy and strong mobile readability.`;
  }

  // 2. REFERENCE ROLES
  let refRolesText = '';
  if (references && references.length > 0) {
    const roleLines = references.map(r => {
      const roleLabel =
        r.role === 'IMAGEM_ALVO' ? 'TARGET IMAGE / MASTER' :
        r.role === 'PESSOA' ? 'PERSON / IDENTITY SOURCE' :
        r.role === 'PRODUTO' ? 'PRODUCT / HARDWARE' :
        r.role === 'CENÁRIO' ? (r.scenarioMode === 'REFERENCIA_AMBIENTE' ? 'SCENARIO / MOOD ATMOSPHERE' : 'SCENARIO / EXACT ENVIRONMENT') :
        r.role === 'ESTILO' ? 'STYLE / MOOD' :
        r.role === 'COMPOSIÇÃO' ? 'COMPOSITION' :
        r.role === 'TIPOGRAFIA' ? 'TYPOGRAPHY' : 'SUPPORT REFERENCE';
      return `- ${roleLabel}: "${r.name}"`;
    });
    refRolesText = roleLines.join('\n');
  } else {
    refRolesText = 'No external image references. Ground all elements from explicit concept description.';
  }

  // 3. TARGET STRUCTURE & IDENTITY SOURCE (or TARGET IMAGE)
  let targetSection = '';
  const hairDesc = plan.hairOwner === 'TARGET'
    ? `hairstyle, hair color, and texture preserved from target master (${targetName})`
    : plan.hairOwner === 'PERSON_REF'
    ? `personal hairstyle from identity reference (${idName})`
    : 'natural hair styling';

  const beardDesc = plan.beardOwner === 'TARGET'
    ? `facial hair styling preserved from target master (${targetName})`
    : plan.beardOwner === 'PERSON_REF'
    ? `personal beard from identity reference (${idName})`
    : 'natural clean facial finish';

  if (plan.taskType === 'IDENTITY_TRANSFER') {
    const targetStructureText = isSunburst
      ? `Master character image ("${targetName}"): Strictly preserves master composition, camera angle, 16:9 framing distance, body posture, head tilt, and 3D skull orientation. Exact target character armor, physical fabrics, metal finishes, weathered textures, hair styling (${hairDesc}), and handheld physical props.`
      : `Master character ("${targetName}"): Preserves composition, camera angle, body posture, skull angle, armor, hair styling (${hairDesc}), and held props.`;

    const identitySourceText = isSunburst
      ? `Person reference ("${idName}"): Reconstruct the target subject so it naturally has the recognizable identity of the source person while preserving target geometry, perspective, pose and lighting. Incorporate recognizable bone structure, eye shape, nose structure, mouth proportions, natural facial asymmetry, and true age.`
      : `Person reference ("${idName}"): Reconstruct the target subject so it naturally has the recognizable identity of the source person while preserving target geometry, perspective, pose and lighting. Preserves natural bone structure, eye shape, and age.`;

    targetSection = `TARGET STRUCTURE:\n${targetStructureText}\n\nIDENTITY SOURCE:\n${identitySourceText}`;
  } else if (plan.targetImage) {
    const targetImageText = isSunburst
      ? `Master photo ("${targetName}"): Master photographic anchor. Preserves camera perspective, subject framing, scene lighting direction, and all original elements not explicitly marked for replacement in CHANGE.`
      : `Master photo ("${targetName}"): Master visual anchor for framing, perspective, and unedited elements.`;
    targetSection = `TARGET IMAGE:\n${targetImageText}`;
  } else {
    targetSection = isSunburst
      ? `TARGET IMAGE:\nNone (original photographic composition established from scratch).`
      : `TARGET IMAGE:\nNone (original scene generated from scratch).`;
  }

  // 4. CHANGE
  let changeText = '';
  if (plan.taskType === 'IDENTITY_TRANSFER') {
    changeText = isSunburst
      ? `Reconstruct facial anatomy to embody the source individual ("${idName}"). Strictly map facial bone structure and features onto target character's 3D skull angle, head tilt, and gaze direction without altering target body posture, armor, hair styling, or physical equipment.`
      : `Reconstruct facial anatomy to match source identity ("${idName}") mapped to target 3D skull angle and gaze.`;
  } else if (plan.taskType === 'REPLACE_OBJECT') {
    changeText = isSunburst
      ? `Replace original held object with exact physical hardware geometry, chassis proportions, ports, button seams, screen ratio, and tactile matte materials from product reference ("${prodName}").`
      : `Replace held object with hardware geometry, ports, and materials from product reference ("${prodName}").`;
  } else if (plan.taskType === 'CHANGE_ENVIRONMENT') {
    changeText = isSunburst
      ? `Replace background setting entirely with authentic architectural space, spatial depth, perspective, and lighting atmosphere from scenario reference ("${envName}").`
      : `Replace background setting with environment and atmosphere from scenario reference ("${envName}").`;
  } else {
    changeText = isSunburst
      ? `Establish complete photographic composition and hero subject based on: "${cleanIdea}".`
      : `Establish photographic composition for: "${cleanIdea}".`;
  }

  if (extraInstructions && extraInstructions.trim().length > 0) {
    changeText += `\nDIRECTOR NOTES: ${extraInstructions.trim()}`;
  }

  // 5. ADAPT
  let adaptText = '';
  if (plan.taskType === 'IDENTITY_TRANSFER') {
    adaptText = isSunburst
      ? `Harmonize skin tones, directional key lighting, and ambient light bounce to match target scene. Motivated specular highlights on skin pores without plastic smoothing. Seamless anatomical transition at hairline and neck. Natural hand grip around equipment with correct visible finger count according to pose and natural occlusion.`
      : `Harmonize skin tones and light bounce to target scene lighting with clean natural hairline and neck transition. Natural hand grip.`;
  } else if (plan.taskType === 'REPLACE_OBJECT') {
    adaptText = isSunburst
      ? `Hand grip and fingers naturally interacting with the new hardware: anatomically plausible hands, natural grip around the device, correct visible finger count according to pose and natural occlusion, no duplicated or fused fingers, no fingers intersecting chassis surfaces.`
      : `Hand grip naturally wrapped around new hardware with anatomically correct fingers and contact.`;
  } else if (plan.taskType === 'CHANGE_ENVIRONMENT') {
    adaptText = isSunburst
      ? `Subtle motivated environmental light bounce on shoulders and silhouette edges consistent with new setting light sources, physically grounding subject without artificial halos or green-screen cut-and-paste artifacts.`
      : `Subtle environmental light bounce on subject edges to physically ground in new environment without halos.`;
  } else if (subject && !subject.hasPerson) {
    adaptText = isSunburst
      ? `Balanced optical falloff between subject and background with true relative scale between objects.`
      : `Authentic optical depth and true relative scale.`;
  } else {
    adaptText = isSunburst
      ? `Anatomically plausible hands with natural grip, correct visible finger count according to pose and natural occlusion. Balanced optical falloff between subject and background.`
      : `Anatomically correct hands with natural grip and authentic optical depth.`;
  }

  // 6. PRESERVE
  let preserveText = '';
  if (plan.taskType === 'IDENTITY_TRANSFER') {
    preserveText = isSunburst
      ? `1. Master character body posture, head angle, 3D skull rotation, and eye gaze direction.\n2. Exact armor / clothing fabrics, metal finishes, weathered textures, and physical seams.\n3. Handheld props, equipment, and finger contact placement.\n4. Hair & beard styling: ${hairDesc}, ${beardDesc}.\n5. Target background setting and atmospheric depth.`
      : `1. Character posture, skull angle, and gaze direction.\n2. Armor/clothing, held props, and natural hand grip.\n3. Hair and facial hair styling: ${hairDesc}, ${beardDesc}.\n4. Target background setting.`;
  } else if (plan.taskType === 'REPLACE_OBJECT') {
    preserveText = isSunburst
      ? `1. Exact subject facial identity, true age, expression, and gaze direction from master photo.\n2. Subject clothing, body posture, and camera distance.\n3. Scene background, ambient lighting direction, and 16:9 framing.`
      : `1. Subject identity, facial expression, and posture.\n2. Clothing, background setting, and lighting direction.`;
  } else if (plan.taskType === 'CHANGE_ENVIRONMENT') {
    preserveText = isSunburst
      ? `1. Exact subject facial identity, true age, and composed facial expression.\n2. Subject body posture, clothing fabrics, and any held objects.\n3. Framing scale and camera distance from master photo.`
      : `1. Subject facial identity, expression, and posture.\n2. Clothing and held items.`;
  } else if (subject) {
    const lines: string[] = [];
    if (subject.identityRefs.length > 0) {
      lines.push(isSunburst
        ? `Facial identity from person reference ${refNameList(subject.identityRefs)}: recognizable bone structure, eye shape, nose and mouth proportions, natural asymmetry, true age, hairline, and facial hair. Do not copy clothing, background, lighting, or pose from that photo.`
        : `Facial identity from ${refNameList(subject.identityRefs)} (bone structure, eye shape, true age); not its clothing, background, or lighting.`);
    }
    if (subject.hasPerson) {
      lines.push(isSunburst
        ? `Natural human facial asymmetry, closed-mouth composed expression, and natural skin texture without plastic smoothing.`
        : `Natural facial asymmetry, closed-mouth expression, and skin texture.`);
    }
    if (subject.productLock) {
      const owner = subject.productRefs.length > 0 ? ` from product reference ${refNameList(subject.productRefs)}` : ' of the named product';
      lines.push(isSunburst
        ? `Product fidelity${owner}: authentic industrial geometry, true proportions and scale, real button, port, and logo placement, factory materials, and an instantly recognizable silhouette; never a generic or invented look-alike.${factSentence(subject.productFacts)}`
        : `Product fidelity${owner}: real geometry, proportions, buttons, ports, and materials.${factSentence(subject.productFacts)}`);
    }
    lines.push(isSunburst ? `Authentic physical materials and tactile textures.` : `Physical materials and camera perspective.`);
    if (isSunburst) lines.push(`Grounded real-world scale and camera perspective.`);
    preserveText = lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
  } else {
    preserveText = isSunburst
      ? `1. Natural human facial asymmetry, closed-mouth composed expression, and natural skin texture without plastic smoothing.\n2. Authentic physical materials and tactile textures.\n3. Grounded real-world scale and camera perspective.`
      : `1. Natural facial asymmetry, closed-mouth expression, and skin texture.\n2. Physical materials and camera perspective.`;
  }

  // 7. ENVIRONMENT
  let envText = '';
  if (plan.environmentSource) {
    envText = isSunburst
      ? `Authentic environment integrated from scenario reference ("${plan.environmentSource.name}"), preserving real-world spatial architecture, perspective, and atmospheric depth.`
      : `Environment integrated from reference ("${plan.environmentSource.name}").`;
  } else if (plan.environmentOwner === 'USER') {
    envText = isSunburst
      ? `Grounded physical setting as explicitly requested ("${cleanIdea}"), avoiding generic clutter.`
      : `Physical setting as explicitly described by user.`;
  } else if (plan.targetImage) {
    envText = isSunburst
      ? `Exact background environment preserved from master photo ("${targetName}").`
      : `Background preserved from master photo.`;
  } else {
    envText = isSunburst
      ? `Clean minimalist background with soft optical falloff and generous negative space, keeping total visual priority on primary subject without domestic clutter (no unrequested bedrooms, living rooms, sofas, desks or lamps).`
      : `Clean minimalist backdrop with optical falloff, generous negative space, and zero domestic clutter.`;
  }

  // 8. COMPOSITION
  const compText = isSunburst
    ? `16:9 widescreen photographic framing (${arParam}). Clean figure-ground separation with bold subject silhouette optimized for instant readability at 120px mobile thumbnail scale. 35mm lens perspective preserving authentic spatial depth. ${typographyDirective}`
    : `16:9 widescreen framing (${arParam}). Clear visual hierarchy for 120px mobile readability with 35mm perspective. ${typographyDirective}`;

  // 9. LIGHTING
  const lightText = isSunburst
    ? `Physically motivated illumination with clean directional key light, subtle natural fill, and soft realistic shadow falloff. Directional coherence across all elements. Zero unmotivated neon rim lights, laser glows, or synthetic halos.`
    : `Motivated directional key light with natural shadow falloff. Zero neon rim light or synthetic glow.`;

  // 10. AVOID
  const avoidList = isSunburst
    ? `face swap, face paste, flat frontal face pasted on angled head, distorted skull geometry, plastic waxy skin, beauty filter jaw slimming, open mouth screaming shock face, deformed hands, extra fingers, duplicated digits, intersecting hardware, floating embers, flying sparks, neon blue-purple wash, unmotivated rim light, domestic clutter (sofas, bedroom lamps, desks unless requested), ${CORE_ANTI_SLOP_AVOID.slice(0, 18).join(', ')}.`
    : `face swap, face paste, flat face overlay, plastic skin, open mouth screaming face, extra fingers, neon glow, unmotivated rim light, domestic clutter, ${CORE_ANTI_SLOP_AVOID.slice(0, 12).join(', ')}.`;

  return `GOAL:
${goal}

REFERENCE ROLES:
${refRolesText}

${targetSection}

CHANGE:
${changeText}

ADAPT:
${adaptText}

PRESERVE:
${preserveText}

ENVIRONMENT:
${envText}

COMPOSITION:
${compText}

LIGHTING:
${lightText}

AVOID:
${avoidList}`;
}

/**
 * Options for Google prompt generation (Nano Banana 2 / Nano Banana Pro)
 */
export interface GooglePromptOptions {
  plan: ScenePlan;
  input: CreateThumbnailInput;
  variant: 'BANANA_2' | 'BANANA_PRO';
  typographyDirective: string;
  arParam: string;
  subject?: NewSceneSubject;
}

/**
 * Builds prompt formatted for Google Gemini image models (Nano Banana 2 / Pro).
 * Follows natural-language multi-reference instructions:
 * - Numbered references (Image 1, Image 2, etc.)
 * - WHICH IMAGE CONTROLS EACH VISUAL ATTRIBUTE
 * - WHAT CHANGES
 * - WHAT REMAINS / PRESERVE
 * - Natural photographic directives without domestic room bias
 * - Typography directive
 */
export function buildGooglePrompt({
  plan,
  input,
  variant,
  typographyDirective,
  arParam,
  subject
}: GooglePromptOptions): string {
  const cleanIdea = resolveSceneDescription(input, Boolean(plan.targetImage));
  const refs = input.references || [];
  const targetName = plan.targetImage?.name || 'personagem mestre';
  const idName = plan.identitySource?.name || 'foto de identidade';
  const prodName = plan.productSource?.name || 'produto';
  const envName = plan.environmentSource?.name || 'cenário';

  const targetIdx = plan.targetImage ? (refs.findIndex(r => r.id === plan.targetImage?.id) + 1 || 1) : 1;
  const idIdx = plan.identitySource ? (refs.findIndex(r => r.id === plan.identitySource?.id) + 1 || 1) : 1;
  const prodIdx = plan.productSource ? (refs.findIndex(r => r.id === plan.productSource?.id) + 1 || 1) : 1;
  const envIdx = plan.environmentSource ? (refs.findIndex(r => r.id === plan.environmentSource?.id) + 1 || 1) : 1;

  // 1. Reference mapping
  let refMapping = 'REFERENCE ROLES:\nNone (standalone visual composition generated from scratch).';
  if (refs.length > 0) {
    refMapping = `REFERENCE ROLES:\n` + refs.map((r, i) => `Image ${i + 1} = [Role: ${r.role}] "${r.name}"`).join('\n');
  }

  // 2. Attribute control mapping
  let attributeControl = 'WHICH IMAGE CONTROLS EACH VISUAL ATTRIBUTE:\n';
  if (plan.taskType === 'IDENTITY_TRANSFER') {
    attributeControl += `- Facial Identity: Image ${idIdx} ("${idName}") controls recognizable facial bone structure, true age, eye shape, and expressions.\n`;
    attributeControl += `- Body & Master Structure: Image ${targetIdx} ("${targetName}") controls exact body posture, 3D skull angle, head tilt, armor/clothing fabrics, and equipment.\n`;
    attributeControl += `- Hairstyle & Hair Texture: ${plan.hairOwner === 'TARGET' ? `Strictly controlled by Image ${targetIdx} ("${targetName}")` : `Controlled by Image ${idIdx} ("${idName}")`}.\n`;
    attributeControl += `- Facial Hair / Beard: ${plan.beardOwner === 'TARGET' ? `Strictly controlled by Image ${targetIdx} ("${targetName}")` : plan.beardOwner === 'PERSON_REF' ? `Controlled by Image ${idIdx} ("${idName}")` : 'Clean natural finish consistent with character'}.\n`;
    if (plan.environmentSource) {
      attributeControl += `- Environment & Lighting: Image ${envIdx} ("${envName}") controls architectural setting and spatial atmosphere.\n`;
    } else {
      attributeControl += `- Environment & Lighting: Preserved from Image ${targetIdx} ("${targetName}").\n`;
    }
  } else if (plan.taskType === 'REPLACE_OBJECT') {
    attributeControl += `- Subject & Background: Image ${targetIdx} ("${targetName}") controls person identity, posture, expression, framing, and environment.\n`;
    attributeControl += `- Hardware / Product: Image ${prodIdx} ("${prodName}") controls exact hardware geometry, chassis, ports, buttons, and matte materials.\n`;
  } else if (plan.taskType === 'CHANGE_ENVIRONMENT') {
    attributeControl += `- Subject: Image ${targetIdx} ("${targetName}") controls subject identity, body posture, clothing, and props.\n`;
    attributeControl += `- Environment: Image ${envIdx} ("${envName}") controls background architecture, spatial perspective, and lighting atmosphere.\n`;
  } else if (subject && (subject.identityRefs.length > 0 || subject.productLock)) {
    if (subject.identityRefs.length > 0) {
      attributeControl += `- Facial Identity: ${refImageList(refs, subject.identityRefs)} controls recognizable bone structure, eye shape, true age, hairline, and facial hair only. Clothing, background, lighting, and pose come from this scene, not from that photo.\n`;
    }
    if (subject.productLock) {
      attributeControl += subject.productRefs.length > 0
        ? `- Product: ${refImageList(refs, subject.productRefs)} controls exact industrial geometry, proportions, buttons, ports, and materials only, not its studio background.\n`
        : `- Product: the named product keeps its real industrial geometry, proportions, button and port layout, and materials, never a generic look-alike.\n`;
    }
    const otherRefs = refs.filter(r => !subject.identityRefs.includes(r) && !subject.productRefs.includes(r));
    if (otherRefs.length > 0) {
      attributeControl += `- Other references: ${refImageList(refs, otherRefs)} control only the attributes of their assigned roles.\n`;
    }
  } else {
    attributeControl += refs.length > 0
      ? `- Visual Elements: Controlled by provided references as primary visual anchors.\n`
      : `- Visual Elements: Harmonious natural composition generated with realistic physical fidelity.\n`;
  }

  // 3. WHAT CHANGES
  let whatChanges = 'WHAT CHANGES:\n';
  if (plan.taskType === 'IDENTITY_TRANSFER') {
    whatChanges += `Reconstruct the target character's facial anatomy so that the character naturally embodies the recognizable identity of the individual in Image ${idIdx} ("${idName}"): authentic bone structure, eye shape, nose, mouth proportions, natural asymmetry, and true age. Reconstruct organically onto the target 3D skull angle without flat face pasting.`;
  } else if (plan.taskType === 'REPLACE_OBJECT') {
    whatChanges += `Replace the original held object with the exact physical hardware geometry, chassis proportions, ports, button seams, and tactile materials from Image ${prodIdx} ("${prodName}"). Adapt hand grip naturally around the device.`;
  } else if (plan.taskType === 'CHANGE_ENVIRONMENT') {
    whatChanges += `Replace the background environment entirely with the authentic architectural space, spatial depth, and lighting atmosphere from Image ${envIdx} ("${envName}"). Adapt subtle light bounce on subject shoulders.`;
  } else {
    whatChanges += `Establish complete photographic thumbnail composition based on: "${cleanIdea}".`;
  }
  if (input.extraInstructions && input.extraInstructions.trim().length > 0) {
    whatChanges += `\nDIRECTOR NOTES: ${input.extraInstructions.trim()}`;
  }

  // 4. WHAT REMAINS / PRESERVE
  let whatRemains = 'WHAT REMAINS:\n';
  if (plan.taskType === 'IDENTITY_TRANSFER') {
    whatRemains += `1. Master character body posture, head rotation, eye gaze direction, and 16:9 framing.\n`;
    whatRemains += `2. Exact armor finishes, physical fabrics, weathered textures, and physical seams from Image ${targetIdx} ("${targetName}").\n`;
    whatRemains += `3. Handheld props and equipment held naturally with anatomically plausible hands and correct visible finger count.\n`;
    whatRemains += `4. Hairstyle and facial hair strictly preserved from target character master.\n`;
    whatRemains += `5. Target background setting and directional lighting coherence.`;
  } else if (plan.taskType === 'REPLACE_OBJECT') {
    whatRemains += `1. Person facial identity, expression, gaze direction, and body posture from master photo.\n`;
    whatRemains += `2. Person clothing and camera distance.\n`;
    whatRemains += `3. Original background setting and ambient lighting direction.`;
  } else if (plan.taskType === 'CHANGE_ENVIRONMENT') {
    whatRemains += `1. Exact subject facial identity, true age, and composed expression.\n`;
    whatRemains += `2. Subject body posture, clothing, and any held objects.\n`;
    whatRemains += `3. Framing scale and camera distance.`;
  } else if (subject) {
    const lines: string[] = [];
    if (subject.hasPerson) lines.push('Composed human expression with closed mouth and natural skin texture without plastic smoothing.');
    if (subject.productLock) lines.push(`Authentic product geometry, true proportions, and recognizable silhouette.${factSentence(subject.productFacts)}`);
    lines.push('Grounded real-world scale and authentic physical materials.');
    lines.push('Clean optical separation with generous negative space.');
    whatRemains += lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
  } else {
    whatRemains += `1. Composed human expression with closed mouth and natural skin texture without plastic smoothing.\n`;
    whatRemains += `2. Grounded real-world scale and authentic physical materials.\n`;
    whatRemains += `3. Clean optical separation with generous negative space.`;
  }

  // 5. PHOTOGRAPHIC DIRECTIVES
  const fidelityNote = variant === 'BANANA_PRO' ? ' Maximum micro-contrast rendering with multi-reference fidelity.' : '';
  // Never forbid a setting the user, a scenario reference, or the TARGET image chose.
  const domesticExclusion = hasAuthoritativeEnvironment(plan)
    ? 'Zero synthetic AI gloss, waxy smoothing, or neon rim lights.'
    : 'Zero synthetic AI gloss, waxy smoothing, neon rim lights, or unrequested domestic clutter (no bedrooms, sofas, desks, or lamps).';
  const photoDirectives = `PHOTOGRAPHIC DIRECTIVES:
16:9 widescreen format (${arParam}). 35mm lens perspective preserving authentic spatial depth. Directed visual storytelling with bold subject silhouette optimized for 120px mobile thumbnail scale. Motivated physical lighting with natural directional key light and soft shadow falloff. ${domesticExclusion}${fidelityNote}`;

  // 6. TYPOGRAPHY
  const typoSection = `TYPOGRAPHY:
${typographyDirective}`;

  return `SCENE:
${cleanIdea}

${refMapping}

${attributeControl}
${whatChanges}

${whatRemains}

${photoDirectives}

${typoSection}`;
}

/**
 * Options for Midjourney prompt generation (V8.2 / Niji 7)
 */
export interface MidjourneyPromptOptions {
  plan: ScenePlan;
  input: CreateThumbnailInput;
  variant: 'V8_2' | 'NIJI_7';
  subject?: NewSceneSubject;
}

/**
 * Builds concise visual prompt for Midjourney (V8.2 / Niji 7).
 * Strips verbose internal engine syntax (HAIR OWNER, TASK, contract labels).
 * Emits --ar 16:9 or --ar 9:16.
 * Emits --v 8.2 or --niji 7.
 * Applies --style raw only when explicitly requested by user (never as automatic default).
 */
export function buildMidjourneyPrompt({
  plan,
  input,
  variant,
  subject
}: MidjourneyPromptOptions): string {
  const cleanIdea = resolveSceneDescription(input, Boolean(plan.targetImage));
  const arFlag = input.aspectRatio === '9:16' ? '--ar 9:16' : '--ar 16:9';
  const targetName = plan.targetImage?.name || 'target character';
  const idName = plan.identitySource?.name || 'reference person';
  const prodName = plan.productSource?.name || 'hardware device';
  const envName = plan.environmentSource?.name || 'environment';

  let visualText = '';

  if (plan.taskType === 'IDENTITY_TRANSFER') {
    const hairDesc = plan.hairOwner === 'TARGET'
      ? `preserving the target character's authentic hairstyle, hair texture, and volume from "${targetName}"`
      : `with natural hairstyle from "${idName}"`;
    const beardDesc = plan.beardOwner === 'TARGET'
      ? `and exact facial hair from "${targetName}"`
      : '';

    visualText = `Photographic YouTube thumbnail, ${cleanIdea}, featuring the person from "${idName}" organically embodied as the character from "${targetName}", ${hairDesc} ${beardDesc}, keeping the exact costume from "${targetName}", ${describeHeldObjectEn(cleanIdea) ? `holding the ${describeHeldObjectEn(cleanIdea)} naturally` : 'keeping any held objects'} with anatomically plausible hands. Grounded realism, motivated directional physical lighting, 35mm lens perspective, sharp subject focus with clean separation, authentic textures without plastic smoothing`;
  } else if (plan.taskType === 'REPLACE_OBJECT') {
    visualText = `Photographic YouTube thumbnail, ${cleanIdea}, featuring the creator holding the physical hardware device from "${prodName}" with natural plausible hand grip, authentic chassis seams, ports, and buttons, natural composed facial expression, motivated lighting matching the scene, 35mm lens perspective, tactile matte materials`;
  } else if (plan.taskType === 'CHANGE_ENVIRONMENT') {
    visualText = `Photographic YouTube thumbnail, ${cleanIdea}, subject from "${targetName}" naturally integrated into the architectural setting of "${envName}", subtle motivated environmental light bounce on shoulders and silhouette edges, authentic spatial depth, 35mm perspective, clean negative space`;
  } else if (subject) {
    // Midjourney takes identity from image parameters (e.g. --oref), so only text-expressible locks go here.
    const parts = [
      `Photographic YouTube thumbnail, ${cleanIdea}`,
      'compelling hero presentation with clean silhouette and immediate readability at 120px mobile thumbnail scale',
    ];
    if (subject.hasPerson) parts.push('natural composed human expression with closed mouth');
    if (subject.productLock) parts.push('the real product with authentic industrial geometry, true proportions, and real buttons and ports');
    parts.push('motivated directional physical key light with soft shadow falloff', '35mm lens perspective', 'authentic tactile textures', 'generous negative space');
    visualText = parts.join(', ');
  } else {
    visualText = `Photographic YouTube thumbnail, ${cleanIdea}, compelling hero presentation with clean silhouette and immediate readability at 120px mobile thumbnail scale, natural composed human expression with closed mouth, motivated directional physical key light with soft shadow falloff, 35mm lens perspective, authentic tactile textures, generous negative space`;
  }

  if (variant === 'NIJI_7') {
    return `${visualText}\n\n${arFlag} --niji 7`;
  }

  // Midjourney V8.2: Only emit --style raw when explicitly requested by user (never as hidden default)
  const explicitRawRequested = Boolean(
    input.extraInstructions &&
    /(--style\s*raw|\bstyle\s*raw\b)/i.test(input.extraInstructions)
  );

  return explicitRawRequested
    ? `${visualText}\n\n${arFlag} --style raw --v 8.2`
    : `${visualText}\n\n${arFlag} --v 8.2`;
}

/**
 * Options for FLUX prompt generation (Max, Pro, Flex, Klein)
 */
export interface FluxPromptOptions {
  plan: ScenePlan;
  input: CreateThumbnailInput;
  variant: 'MAX' | 'PRO' | 'FLEX' | 'KLEIN';
  typographyDirective: string;
  arParam: string;
  subject?: NewSceneSubject;
}

/**
 * Builds direct natural-language prompt for FLUX.2 models (Max / Pro / Flex / Klein).
 * Uses explicit multi-reference sourcing.
 * Converts generic negatives into positive desired states.
 * Keeps hard preservation constraints concise.
 */
export function buildFluxPrompt({
  plan,
  input,
  variant,
  typographyDirective,
  arParam,
  subject
}: FluxPromptOptions): string {
  const cleanIdea = resolveSceneDescription(input, Boolean(plan.targetImage));
  const refs = input.references || [];
  const targetName = plan.targetImage?.name || 'target character';
  const idName = plan.identitySource?.name || 'identity photo';
  const prodName = plan.productSource?.name || 'product reference';
  const envName = plan.environmentSource?.name || 'scenery reference';

  const targetIdx = plan.targetImage ? (refs.findIndex(r => r.id === plan.targetImage?.id) + 1 || 1) : 1;
  const idIdx = plan.identitySource ? (refs.findIndex(r => r.id === plan.identitySource?.id) + 1 || 1) : 1;
  const prodIdx = plan.productSource ? (refs.findIndex(r => r.id === plan.productSource?.id) + 1 || 1) : 1;
  const envIdx = plan.environmentSource ? (refs.findIndex(r => r.id === plan.environmentSource?.id) + 1 || 1) : 1;

  let directDescription = '';

  if (plan.taskType === 'IDENTITY_TRANSFER') {
    const hairPreserve = plan.hairOwner === 'TARGET'
      ? `preserving the target character's authentic hairstyle and hair texture from Image ${targetIdx} ("${targetName}")`
      : `with personal hairstyle from Image ${idIdx} ("${idName}")`;
    const beardPreserve = plan.beardOwner === 'TARGET'
      ? `and exact facial hair from Image ${targetIdx}`
      : '';

    directDescription = `Use the person from Image ${idIdx} ("${idName}") for facial identity. Use Image ${targetIdx} ("${targetName}") as the structural target for body posture, 3D skull angle, head tilt, armor fabrics, and physical equipment. Reconstruct the facial anatomy organically to match Image ${idIdx}'s authentic bone structure, eye shape, and true age, while strictly ${hairPreserve} ${beardPreserve}, and hands ${describeHeldObjectEn(cleanIdea) ? `holding the ${describeHeldObjectEn(cleanIdea)}` : `keeping any object held in Image ${targetIdx}`} with natural plausible grip and correct visible finger count.`;
  } else if (plan.taskType === 'REPLACE_OBJECT') {
    directDescription = `Use Image ${targetIdx} ("${targetName}") as master anchor for person facial identity, expression, pose, and background environment. Use Image ${prodIdx} ("${prodName}") for the exact physical hardware geometry, chassis proportions, ports, buttons, and matte textures. Adapt hand grip naturally around the new hardware with correct visible finger count.`;
  } else if (plan.taskType === 'CHANGE_ENVIRONMENT') {
    directDescription = `Preserve the subject from Image ${targetIdx} ("${targetName}") including exact facial identity, composed expression, clothing, and body posture. Integrate the authentic background architecture and spatial atmosphere from Image ${envIdx} ("${envName}") with matching directional light bounce.`;
  } else {
    directDescription = `Photographic YouTube thumbnail, ${cleanIdea}. Subject presented with bold silhouette and clear optical separation optimized for 120px mobile thumbnail scale. 35mm lens perspective preserving authentic spatial depth.`;
    if (subject && subject.identityRefs.length > 0) {
      directDescription += ` Use the person from ${refImageList(refs, subject.identityRefs)} for facial identity only: recognizable bone structure, eye shape, true age, and natural asymmetry, with clothing, background, and lighting defined by this scene.`;
    }
    if (subject?.productLock) {
      directDescription += subject.productRefs.length > 0
        ? ` The product matches ${refImageList(refs, subject.productRefs)} exactly: authentic industrial geometry, true proportions, real button and port layout, and factory materials, placed in this scene's own setting.${factSentence(subject.productFacts)}`
        : ` The named product keeps its authentic industrial geometry, true proportions, real button and port layout, and instantly recognizable silhouette.${factSentence(subject.productFacts)}`;
    }
  }

  const variantNote = variant === 'MAX' ? ' Maximum photographic detail and strict instruction following.' : '';
  // Human attributes only when a person is in the shot; otherwise they invite an invented person.
  const humanLines = subject && !subject.hasPerson
    ? []
    : [
        '- Natural skin texture with realistic pores, authentic tonal variation, and zero plastic smoothing.',
        '- Restrained believable human expression appropriate to the scene with closed mouth.',
        '- Anatomically plausible hands with natural grip and correct visible finger count according to pose.',
      ];
  const positiveAttributes = [
    'POSITIVE VISUAL ATTRIBUTES:',
    humanLines[0],
    '- Physically motivated illumination with clean directional key light and soft natural shadow falloff.',
    humanLines[1],
    '- Controlled optical separation with a readable background and generous negative space.',
    humanLines[2],
    `- 35mm digital camera perspective (${arParam}) with tactile physical materials.${variantNote}`,
  ].filter(Boolean).join('\n');

  let preservationConstraints = 'PRESERVATION CONSTRAINTS:\n';
  if (plan.taskType === 'IDENTITY_TRANSFER') {
    preservationConstraints += `Do not alter the target character armor, physical equipment, hairstyle, facial hair, body posture, or background setting. Zero synthetic AI gloss or plastic face paste.`;
  } else if (plan.taskType === 'REPLACE_OBJECT') {
    preservationConstraints += `Do not alter person facial identity, clothing, background environment, or scene lighting. Zero deformed hardware geometry.`;
  } else if (plan.taskType === 'CHANGE_ENVIRONMENT') {
    preservationConstraints += `Do not alter subject facial identity, clothing, or body posture. Zero artificial halo around edges.`;
  } else if (hasAuthoritativeEnvironment(plan)) {
    // The setting was chosen explicitly (e.g. "no meu quarto"); do not forbid it.
    preservationConstraints += `Zero synthetic AI gloss, waxy smoothing, or neon rim lights.`;
  } else {
    preservationConstraints += `Zero synthetic AI gloss, waxy smoothing, neon rim lights, or unrequested domestic room clutter (no bedrooms, living rooms, sofas, desks, or lamps).`;
  }

  const typographySection = `TYPOGRAPHY:
${typographyDirective}`;

  return `SCENE INSTRUCTION:
${directDescription}

${positiveAttributes}

${preservationConstraints}

${typographySection}`;
}

/**
 * Options for central prompt renderer
 */
export interface RenderPromptOptions {
  plan: ScenePlan;
  input: CreateThumbnailInput;
  basePrompt: string;
  typographyDirective: string;
  arParam: string;
  /** New-scene locks resolved by generateSimpleThumbnail; omitted for edit tasks. */
  subject?: NewSceneSubject;
}

/**
 * Central prompt dispatcher that renders model-specific prompt formats.
 */
export function renderPromptForTargetModel(options: RenderPromptOptions): string {
  const { plan, input, basePrompt, typographyDirective, arParam, subject } = options;
  const normalizedModel = normalizeTargetModel(input.targetModel);
  const cfg = TARGET_MODEL_CONFIGS[normalizedModel];

  switch (cfg?.promptStyle) {
    case 'structured_contract': {
      const variant = normalizedModel === 'OPENAI_GPT_IMAGE_2_5_FLARE' ? 'FLARE' : 'SUNBURST';
      return buildOpenAIStructuredPrompt({
        plan,
        input,
        variant,
        typographyDirective,
        arParam,
        subject
      });
    }

    case 'natural_multireference': {
      const variant = normalizedModel === 'GOOGLE_NANO_BANANA_PRO' ? 'BANANA_PRO' : 'BANANA_2';
      return buildGooglePrompt({
        plan,
        input,
        variant,
        typographyDirective,
        arParam,
        subject
      });
    }

    case 'concise_visual': {
      const variant = normalizedModel === 'MIDJOURNEY_NIJI_7' ? 'NIJI_7' : 'V8_2';
      return buildMidjourneyPrompt({
        plan,
        input,
        variant,
        subject
      });
    }

    case 'direct_natural_positive': {
      let variant: 'MAX' | 'PRO' | 'FLEX' | 'KLEIN' = 'MAX';
      if (normalizedModel === 'FLUX_2_PRO') variant = 'PRO';
      else if (normalizedModel === 'FLUX_2_FLEX') variant = 'FLEX';
      else if (normalizedModel === 'FLUX_2_KLEIN') variant = 'KLEIN';
      return buildFluxPrompt({
        plan,
        input,
        variant,
        typographyDirective,
        arParam,
        subject
      });
    }

    case 'neutral':
    default:
      return basePrompt;
  }
}

/**
 * 6. PROMPT BUILDER: Builds the generation prompt based on the ScenePlan.
 */
export function buildPromptFromScenePlan(
  plan: ScenePlan,
  input: CreateThumbnailInput,
  approachIndex = 0
): PromptBuilderResult {
  const { videoTitle, ideaDescription, aspectRatio = '16:9', thumbnailText, fontName, reservedSpacePosition, stylePreset = 'Natural', textTreatment } = input;
  const cleanIdea = resolveSceneDescription(input, Boolean(plan.targetImage));
  const arParam = aspectRatio === '9:16' ? '9:16 vertical format' : '16:9 widescreen format';
  const targetName = plan.targetImage?.name || 'personagem/imagem mestre';
  const idName = plan.identitySource?.name || 'foto de identidade';

  let finalPrompt = '';
  let directionPt: VisualDirectionOutput;
  let approachTitle = 'Direção Fotográfica';

  let typographyDirective = 'Do not generate any text, letters, logos or pseudo-typography. Reserve clean negative space for later typography.';
  if (textTreatment === 'SEM_TEXTO') {
    typographyDirective = 'Do not render any text, characters, letters, subtitles or watermark.';
  } else if (thumbnailText?.trim()) {
    const posStr = reservedSpacePosition === 'ESQUERDA' ? 'left side' :
      reservedSpacePosition === 'DIREITA' ? 'right side' :
      reservedSpacePosition === 'SUPERIOR' ? 'upper top area' : 'lower bottom area';
    typographyDirective = `Reserve clean, uncluttered negative space on the ${posStr} of the composition specifically for post-production typography ("${thumbnailText.trim()}"). Do not bake distorted AI typography directly into the pixels.`;
  }

  if (plan.taskType === 'IDENTITY_TRANSFER') {
    approachTitle = 'Reconstrução de Identidade / Adaptação Anatômica';

    directionPt = {
      ideia: 'Adaptação de identidade no personagem: reconstrução anatômica facial preservando o visual, cabelo, armadura e mapa do personagem.',
      foco: 'O personagem com a identidade facial integrada e o mapa em mãos como ponto focal narrativo.',
      composicao: 'Enquadramento, pose e ângulo fiéis à imagem-alvo mestre, com integração harmoniosa do cenário ao fundo.',
      expressao: 'Expressão focada e compenetrada do personagem com lábios fechados, sem caretas artificiais.',
      visual: 'Iluminação motivada do cenário refletindo naturalmente na armadura e na pele, sem néon e sem brilhos plásticos.'
    };

    const hairDesc = plan.hairOwner === 'TARGET'
      ? `Exact hairstyle, hair color, texture, and hair volume preserved from the target character master (${targetName}).`
      : `Personal hairstyle from the identity reference (${idName}).`;

    const beardDesc = plan.beardOwner === 'TARGET'
      ? `Exact facial hair / beard styling and texture preserved from the target character master (${targetName}).`
      : plan.beardOwner === 'PERSON_REF'
      ? `Personal beard from identity reference (${idName}).`
      : 'Natural clean facial finish consistent with the target character.';

    let envSection = 'Clean neutral background with soft natural optical falloff.';
    if (plan.environmentSource) {
      envSection = `Environment and background setting seamlessly integrated from the supplied scenario reference (${plan.environmentSource.name}), matching authentic real-world perspective and depth.`;
    } else if (plan.targetImage) {
      envSection = `Exact environmental setting and background preserved from the target master image (${targetName}).`;
    }

    finalPrompt = `Photographic YouTube thumbnail, ${arParam}. Directed visual storytelling, authentic and grounded.
SCENE: ${cleanIdea}.
TASK: IDENTITY_TRANSFER (ANATOMICAL RECONSTRUCTION — NOT A FACE PASTE).

TARGET MASTER STRUCTURE (${targetName}):
- Subject: Target character from (${targetName}).
- Composition & Camera: Exact camera angle, 16:9 framing distance, body posture, head tilt, and 3D skull orientation from master image.
- Armor & Clothing: Exact target character armor, physical fabrics, metal finishes, and weathered textures.
- Props & Hands: ${describeHeldObjectEn(input.ideaDescription) ? `Holding the ${describeHeldObjectEn(input.ideaDescription)} and physical equipment` : 'Keeping any object and physical equipment held in the target'} naturally with anatomically plausible hands, natural grip around the object, correct visible finger count according to pose and natural occlusion, no duplicated or fused fingers.
- Hair & Facial Hair: ${hairDesc} ${beardDesc}

IDENTITY RECONSTRUCTION DIRECTIVE (MANDATORY):
Reconstruct the target character's facial anatomy so that the character naturally and authentically embodies the facial identity of the individual in the reference (${idName}): recognizable facial bone structure, eye shape, nose structure, mouth proportions, natural facial asymmetry, and true age.
CRITICAL ANATOMICAL RULES:
1. Strictly adapt the facial features to the target character's 3D skull geometry, head angle, head tilt, gaze perspective, and scene lighting.
2. Do NOT paste a flat or frontal face onto the target head.
3. Do NOT alter the target character's body pose, armor, hair, costume, or held props.
4. Zero beauty filters, zero plastic skin smoothing, zero jaw slimming. The result must appear as the same real person organically inhabiting the target character's body, world, and physical reality.

ENVIRONMENT & LIGHTING:
${envSection} Physically motivated scene lighting harmonized between character and environment, with natural directional shadow falloff and realistic specular highlights on armor and skin.

TYPOGRAPHY:
${typographyDirective}

NEGATIVE / STRICTLY AVOID:
paste face, overlay face, flat frontal face on rotated head, plastic waxy skin, beauty filter jaw slimming, cartoon saturation, generic shocked expression, changing target armor, changing target pose, changing target props, domestic room, sofa, desk lamp, floor lamp, living room furniture, physical product hero, handheld gaming console, device teardown, creator standing behind product, ${CORE_ANTI_SLOP_AVOID.slice(0, 22).join(', ')}.`;
  } else if (plan.taskType === 'REPLACE_OBJECT') {
    const prodName = plan.productSource?.name || 'novo produto';
    approachTitle = 'Substituição Cirúrgica de Objeto / Hardware';

    directionPt = {
      ideia: 'Substituição cirúrgica do dispositivo preservando 100% da pose, pessoa, iluminação e cenário mestre.',
      foco: 'O novo dispositivo integrado com precisão física milimétrica.',
      composicao: 'Enquadramento idêntico à imagem-alvo, adaptando apenas o contato das mãos.',
      expressao: 'Expressão natural preservada da imagem-alvo.',
      visual: 'Materiais foscos fiéis e iluminação consistente com o ambiente original.'
    };

    finalPrompt = `Photographic YouTube thumbnail, ${arParam}. Directed visual storytelling, authentic and grounded.
SCENE: ${cleanIdea}.
TASK: REPLACE_OBJECT (SURGICAL OBJECT REPLACEMENT).

MASTER STRUCTURE TO PRESERVE (${targetName}):
1. Person facial identity, true age, expression, gaze direction, and body posture from master photo.
2. Camera framing, 16:9 composition, depth of field, and original background setting.
3. Scene lighting direction and ambient shadow falloff.

CHANGE:
Replace original held object with exact physical hardware geometry, chassis proportions, ports, buttons, screen ratio, and tactile materials from the product reference (${prodName}).

ADAPT:
Hand grip and fingers around the new hardware: anatomically plausible hands, natural grip around the object, correct visible finger count according to pose and natural occlusion, no duplicated or fused fingers, no fingers intersecting the product, and physically believable hand-to-object contact.

TYPOGRAPHY:
${typographyDirective}

NEGATIVE / STRICTLY AVOID:
regenerating the entire scene, changing person facial identity, changing clothing, deformed hardware geometry, fictional buttons, rubbery chassis, unmotivated rim light, ${CORE_ANTI_SLOP_AVOID.slice(0, 20).join(', ')}.`;
  } else if (plan.taskType === 'CHANGE_ENVIRONMENT') {
    const envName = plan.environmentSource?.name || 'novo cenário';
    approachTitle = 'Substituição de Cenário / Fundo';

    directionPt = {
      ideia: 'Substituição de cenário: o sujeito e objetos são preservados enquanto o fundo é transportado para o novo local.',
      foco: 'O sujeito principal mantendo destaque com integração luminosa crível no novo espaço.',
      composicao: 'Composição e enquadramento do sujeito preservados da imagem original.',
      expressao: 'Expressão natural preservada do criador.',
      visual: 'Iluminação rebalanceada suavemente para refletir as fontes reais do novo ambiente.'
    };

    finalPrompt = `Photographic YouTube thumbnail, ${arParam}. Directed visual storytelling, authentic and grounded.
SCENE: ${cleanIdea}.
TASK: CHANGE_ENVIRONMENT (BACKGROUND REPLACEMENT).

PRESERVE FROM MASTER (${targetName}):
1. Exact subject identity, facial features, body posture, clothing, and any held objects.
2. Subject framing scale and camera distance.

CHANGE:
Replace the background setting entirely with the authentic environment, architecture, and spatial atmosphere from the scenario reference (${envName}).

ADAPT:
Subtle environmental light bounce on shoulders and edges to physically ground the subject in the new setting without artificial rim light or glowing outlines.

TYPOGRAPHY:
${typographyDirective}

NEGATIVE / STRICTLY AVOID:
redesigning the subject, changing facial identity, changing clothing, artificial cut-and-paste halo, green screen edge glow, ${CORE_ANTI_SLOP_AVOID.slice(0, 20).join(', ')}.`;
  } else {
    approachTitle = approachIndex === 1
      ? 'Foco no Objeto / Hardware'
      : approachIndex === 2
      ? 'Tensão Documental'
      : 'Equilíbrio Narrativo';

    directionPt = {
      ideia: 'Equilíbrio e autenticidade visual sem clichês sintéticos.',
      foco: 'Sujeito principal claro com separação figura-fundo para leitura rápida no mobile.',
      composicao: 'Enquadramento balanceado em 16:9 com espaço negativo para tipografia.',
      expressao: 'Fisionomia humana natural e compenetrada com lábios fechados.',
      visual: 'Iluminação direcional motivada com sombras suaves e texturas reais.'
    };

    let envText = 'Clean minimalist background with soft optical falloff and generous negative space, keeping total visual priority on the primary subject without domestic clutter';
    if (plan.environmentSource) {
      envText = `Authentic environment integrated from reference (${plan.environmentSource.name}), preserving spatial character and atmosphere`;
    } else if (plan.environmentOwner === 'USER') {
      envText = `Grounded physical setting as explicitly described by the user (${cleanIdea})`;
    } else if (plan.environment && (plan.provenanceMap?.environment === 'WEB_RESEARCH' || (plan.themeContext?.environmentNeed && plan.provenanceMap?.environment === 'JUSTIFIED_INFERENCE'))) {
      envText = plan.environment;
    }

    finalPrompt = `Photographic YouTube thumbnail, ${arParam}. Directed visual storytelling, authentic and grounded.
SCENE: ${cleanIdea}.
SUBJECT & FRAMING: Compelling hero presentation with clean silhouette and immediate readability at 120px mobile thumbnail scale. Anatomically plausible hands with natural grip, correct visible finger count according to pose and natural occlusion.
HUMAN EXPRESSION: Natural composed curiosity with closed mouth and expressive eyes, authentic facial asymmetry, natural skin texture avoiding plastic waxy smoothing.
LIGHTING: Motivated physical illumination with clean directional key light and soft natural shadow falloff.
ENVIRONMENT & OPTICS: ${envText}. Balanced photographic perspective with 35mm lens, preserving authentic spatial depth and subject clarity without forced blur.
TYPOGRAPHY:
${typographyDirective}
NEGATIVE / STRICTLY AVOID:
${CORE_ANTI_SLOP_AVOID.slice(0, 25).join(', ')}.`;
  }

  finalPrompt = renderPromptForTargetModel({
    plan,
    input,
    basePrompt: finalPrompt,
    typographyDirective,
    arParam
  });

  const audit = auditPromptProvenance(finalPrompt, plan, input.references);
  finalPrompt = audit.cleanedPrompt;

  const typographyPlan = buildTypographyPlan(
    thumbnailText,
    plan.productOwner !== 'NONE',
    fontName,
    reservedSpacePosition,
    stylePreset,
    textTreatment
  );

  return {
    finalPrompt,
    directionPt,
    approachTitle,
    typographyPlan,
    cleanedPlan: {
      ...plan,
      unsupportedDetailsRemoved: audit.purged
    },
    outputMetadata: resolveOutputMetadata(input.targetModel, input.aspectRatio)
  };
}

// Interprets user intent with fidelity to the idea and genuine diversity across approaches
export function interpretUserIntent(
  title: string,
  idea: string,
  approachIndex = 0,
  hasPersonOverride?: boolean,
  references: SimpleReference[] = []
): {
  subjectEn: string;
  contextEn: string;
  lightingEn: string;
  compositionEn: string;
  expressionEn: string;
  directionPt: VisualDirectionOutput;
  approachTitle: string;
  hasPerson: boolean;
} {
  const combined = `${title} ${idea}`;
  const isTech = detectTechHardware(combined);
  const approach = Math.abs(approachIndex) % 3;

  const hasPerson = hasPersonOverride !== undefined ? hasPersonOverride : PERSON_KEYWORDS.test(combined);

  // Archetypes below may only add composition/lighting guidance. They must never
  // replace the creator's subject with fixture content (consoles, moss, teardowns).
  const isTeardownRequest = /(aberto|aberta|desmontad|desmontar|por\s*dentro|teardown|interno|interna|circuito|placa[\s-]*m[ãa]e|reparo|conserto|consertar|bancada)/i.test(combined);
  const isHandheldDevice = /(port[áa]til|handheld|steam\s*deck|switch|legion|rog\s*ally|game\s*boy|psp|vita|celular|smartphone|iphone|galaxy|controle|joystick|controller|ipad|tablet)/i.test(combined);

  // Environment authority order resolution
  const explicitEnv = detectExplicitEnvironment(combined);
  const sceneRefs = (references || []).filter(r => r.role === 'CENÁRIO');
  const myEnvRef = sceneRefs.find(r => r.scenarioMode !== 'REFERENCIA_AMBIENTE');
  const refEnvRef = sceneRefs.find(r => r.scenarioMode === 'REFERENCIA_AMBIENTE');

  const hasExplicitEnv = explicitEnv.hasExplicitEnv || sceneRefs.length > 0;
  const resolvedContextEn = myEnvRef
    ? `Authentic physical location from the reference photo (${myEnvRef.name}), preserving spatial structure and recognizable real-world environmental features`
    : refEnvRef
    ? `Atmospheric background inspired by the environment mood reference (${refEnvRef.name}), adopting general density, materials, and tonal character without copying geometry`
    : explicitEnv.hasExplicitEnv
    ? explicitEnv.descriptionEn!
    : 'Clean minimalist background with soft optical falloff and generous negative space, keeping total visual priority on the primary subject without domestic clutter';

  const resolvedLightingEn = myEnvRef
    ? 'Physically motivated illumination matching the authentic sources of the referenced location, with natural shadow falloff'
    : explicitEnv.hasExplicitEnv
    ? explicitEnv.lightingEn!
    : 'Clean motivated key illumination with soft natural shadow falloff, emphasizing genuine physical textures and form without artificial glare';

  // Specific Archetype 1: Side-by-Side Comparison (No person, e.g. "Um console antigo ao lado de um console moderno")
  const isSideBySide = /(ao\s*lado\s*de|comparando|compara[çc][ãa]o|vs\b|versus|lado\s*a\s*lado|antigo.*moderno|antigo.*novo|evolu[çc][ãa]o)/i.test(combined) && !hasPerson;
  const isConsoleGenerationCompare = /(console|videogame|playstation|\bps[1-5]\b|xbox|nintendo|mega\s*drive|atari|super\s*nes|snes)/i.test(combined) &&
    /(antigo|retr[oô]|cl[áa]ssico|moderno|novo|evolu[çc][ãa]o|gera[çc][ãa]o)/i.test(combined);
  if (isSideBySide && !isConsoleGenerationCompare) {
    // Compare exactly what the creator named (often only in the title, e.g. "iPhone 17 Pro vs Galaxy S26 Ultra").
    const namedItems = [...new Set([...extractTitleNames(title), ...extractTitleNames(idea)])];
    const compared = namedItems.length >= 2 ? ` (${namedItems.join(' and ')})` : '';
    return {
      approachTitle: 'Comparação Direta Lado a Lado',
      hasPerson: false,
      subjectEn: `Direct physical side-by-side comparison of the exact items named in the scene${compared}, placed next to each other at true relative scale, each instantly recognizable by its authentic silhouette, proportions, and real design details`,
      contextEn: hasExplicitEnv
        ? resolvedContextEn
        : 'Clean neutral surface with soft natural optical falloff, calm background that keeps both items as the only focal points',
      lightingEn: hasExplicitEnv
        ? resolvedLightingEn
        : 'Soft balanced directional key lighting falling evenly on both items, revealing true materials and edges without artificial digital glare',
      compositionEn: 'Balanced side-by-side composition with both items large in frame, generous negative space, and clear silhouette recognition at 120px mobile scale',
      expressionEn: 'None (pure object comparison scene without human presence)',
      directionPt: {
        ideia: 'Comparação direta e honesta: os itens citados lado a lado, sem elementos inventados.',
        foco: 'Os dois itens comparados, em escala real um ao lado do outro, com diferenças de formato e acabamento legíveis.',
        composicao: 'Enquadramento limpo dividindo o espaço em proporção equilibrada, itens grandes no quadro e espaço negativo para leitura rápida.',
        expressao: 'Nenhuma (cena puramente comparativa de objetos sem presença humana).',
        visual: 'Luz direcional suave e uniforme sobre os dois itens, revelando materiais reais sem brilho artificial.'
      }
    };
  }
  if (isSideBySide) {
    return {
      approachTitle: 'Comparação Geracional Lado a Lado',
      hasPerson: false,
      subjectEn: 'Direct physical side-by-side comparison of a vintage retro gaming console next to a sleek modern gaming console resting on a clean neutral surface, showcasing generational evolution of industrial design',
      contextEn: 'Clean neutral studio surface with subtle matte slate finish, calm background with soft natural optical falloff',
      lightingEn: 'Soft balanced directional key lighting grazing both consoles evenly, highlighting material contrasts and textures without artificial digital glare',
      compositionEn: 'Balanced 16:9 side-by-side composition with generous negative space and clear silhouette recognition at 120px mobile scale',
      expressionEn: 'None (pure object comparison scene without human presence)',
      directionPt: {
        ideia: 'Contraste histórico e estético entre duas eras: o design clássico justaposto ao moderno em um enquadramento direto e equilibrado.',
        foco: 'A justaposição física direta entre o console antigo e o moderno, evidenciando as diferenças de formato, portas e acabamentos.',
        composicao: 'Enquadramento 16:9 limpo dividindo o espaço em proporção harmônica sobre a superfície neutra, com espaço negativo para rápida leitura visual.',
        expressao: 'Nenhuma (cena puramente comparativa de objetos sem presença humana).',
        visual: 'Luz direcional suave revelando a textura e o desgaste do plástico retrô em contraste com o acabamento fosco contemporâneo.'
      }
    };
  }

  // Specific Archetype 2: Broken Product Story & Emotional Frustration (Person, e.g. "Eu olhando para um produto quebrado, decepcionado")
  const isBrokenProductStory = /(quebrad|estragad|decepcionad|danificad|defeito)/i.test(combined) && hasPerson;
  if (isBrokenProductStory) {
    return {
      approachTitle: 'Frustração Humana e Produto Danificado',
      hasPerson: true,
      subjectEn: 'The creator looking down thoughtfully at a visibly broken and cracked physical product with sincere quiet disappointment',
      contextEn: hasExplicitEnv
        ? resolvedContextEn
        : 'Minimal neutral background with soft optical falloff, keeping undivided focus on the subject and the damaged product',
      lightingEn: hasExplicitEnv
        ? resolvedLightingEn
        : 'Subdued atmospheric directional lighting with natural shadow falloff, emphasizing the physical damage and tactile textures without artificial glare',
      compositionEn: 'Two-tier depth framing establishing visual narrative tension between the cracked foreground product and the creator downcast gaze in the midground',
      expressionEn: 'Authentic quiet disappointment, subtle downcast eyes, furrowed brow, closed mouth, sincere human emotional gravity without theatrical shouting',
      directionPt: {
        ideia: 'Narrativa humana de frustração honesta: o criador confronta o produto quebrado sem histeria ou melodrama.',
        foco: 'A reação contida do criador em conexão direta com o produto danificado em primeiro plano.',
        composicao: 'Plano médio fechado com o produto danificado em destaque no primeiro plano e o criador observando desapontado com fundo limpo.',
        expressao: 'Desapontamento sincero e contido: sobrancelhas ligeiramente franzidas, olhar compenetrado, lábios fechados. Proibido qualquer grito ou careta de choque.',
        visual: 'Iluminação sóbria e focada com sombras suaves, destacando a gravidade do momento e a textura tátil do dano no produto.'
      }
    };
  }

  // Specific Archetype 3: Opened Laptop / Hardware Teardown (No person, e.g. "Notebook aberto na mesa mostrando uma diferença de hardware")
  const isOpenedNotebook = (/(notebook|laptop).*aberto/i.test(combined) || (/(notebook|laptop)/i.test(combined) && !hasPerson && isTeardownRequest));
  if (isOpenedNotebook) {
    return {
      approachTitle: 'Bancada Técnica / Hardware Aberto',
      hasPerson: false,
      subjectEn: 'An opened laptop chassis resting on a clean neutral work surface, lower panel removed to clearly reveal internal cooling hardware and motherboard components',
      contextEn: hasExplicitEnv
        ? resolvedContextEn
        : 'Clean neutral work surface with soft optical falloff, keeping undivided focus on the internal components',
      lightingEn: hasExplicitEnv
        ? resolvedLightingEn
        : 'Diffused neutral high-CRI task illumination with natural soft shadow falloff, eliminating specularity on electronic components',
      compositionEn: 'Clean angled medium close-up focused on the specific hardware difference, maintaining clean silhouette and legible spatial orientation',
      expressionEn: 'None (pure technical hardware inspection)',
      directionPt: {
        ideia: 'Comparação técnica de hardware: o notebook aberto revelando os detalhes internos reais de engenharia.',
        foco: 'A área interna aberta do notebook e a diferença de hardware exposta com nitidez.',
        composicao: 'Enquadramento em ângulo técnico de 45 graus sobre a superfície de trabalho, permitindo leitura imediata da peça de hardware.',
        expressao: 'Nenhuma (cena focada puramente em objeto técnico sem presença humana).',
        visual: 'Iluminação difusa de alto CRI sem pontos de reflexo cegantes na tela ou nos componentes.'
      }
    };
  }

  // Specific Archetype 4: Gaming Handheld in Domestic Living Room (ONLY when sofa/living room is EXPLICITLY requested by user)
  const hasExplicitSofa = /(sof[aá]|couch|living\s*room|sala\s*de\s*estar)/i.test(combined);
  const isGamingCouch = hasExplicitSofa && hasPerson;
  const namedHandheld = combined.match(/(legion\s*go|steam\s*deck(\s*oled)?|rog\s*ally(\s*x)?|nintendo\s*switch(\s*2)?|switch\s*2|ps\s*vita|psp|game\s*boy)/i)?.[0];
  const sofaDeviceLabel = namedHandheld ? `O ${namedHandheld}` : 'O console portátil';
  if (isGamingCouch) {
    return {
      approachTitle: 'Cumplicidade no Sofá / Gaming Autêntico',
      hasPerson: true,
      subjectEn: 'The creator sitting comfortably on an authentic living room sofa, holding the handheld gaming console naturally toward the camera with both hands',
      contextEn: 'Comfortable real living room sofa with authentic fabric texture, natural cushions, and lived-in domestic context without artificial studio polish',
      lightingEn: 'Warm motivated interior illumination from physical living room sources combined with soft natural daylight, zero unmotivated RGB neon',
      compositionEn: 'Conversational eye-level medium framing with balanced optical depth preserving living room context readability',
      expressionEn: 'Relaxed confidence and subtle satisfaction, direct engaging gaze toward viewer or down at screen, natural closed mouth',
      directionPt: {
        ideia: 'Momento autêntico e relaxado no sofá: o criador usa o console portátil de forma natural, como no dia a dia.',
        foco: `${sofaDeviceLabel} em primeiro plano com tela ligada e a postura natural do criador no sofá da sala.`,
        composicao: 'Plano médio na altura dos olhos, enquadramento centrado no criador e no console, mantendo o ambiente crível da sala no fundo.',
        expressao: 'Satisfação genuína e sutil, olhar atento ao console ou cúmplice com a câmera. Lábios fechados, sem caretas de gamer.',
        visual: 'Luz suave de abajur de sala e luz natural difusa. Cores quentes de ambiente doméstico. Zero néon roxo/azul clichê.'
      }
    };
  }

  // Specific Archetype: Creator with Handheld / Tech Gadget (When NO sofa or room is explicitly requested)
  const isTechWithPerson = isTech && hasPerson;
  if (isTechWithPerson && !hasExplicitSofa) {
    return {
      approachTitle: 'Foco no Hardware & Apresentação Direta',
      hasPerson: true,
      subjectEn: `The creator holding the ${isHandheldDevice ? 'handheld device' : 'device'} naturally toward the camera with anatomically plausible hands, natural grip around the object, correct visible finger count according to pose and natural occlusion, no duplicated or fused fingers, no fingers intersecting the product, and physically believable hand-to-object contact`,
      contextEn: hasExplicitEnv
        ? resolvedContextEn
        : 'Minimal neutral background with soft optical falloff, keeping undivided focus on the device and creator without domestic clutter',
      lightingEn: hasExplicitEnv
        ? resolvedLightingEn
        : 'Clean motivated directional key lighting with soft natural shadow falloff, emphasizing true matte chassis textures and screen content without artificial glare or unmotivated RGB neon',
      compositionEn: 'Engaging eye-level medium framing with crisp figure-ground separation and clean negative space',
      expressionEn: 'Composed authentic engagement with calm curiosity and natural focus, closed mouth',
      directionPt: {
        ideia: 'Apresentação direta e autêntica do dispositivo: foco no hardware e na experiência real sem clichês.',
        foco: 'O dispositivo em primeiro plano com tela nítida e a presença humana como âncora natural.',
        composicao: 'Plano médio na altura dos olhos, enquadramento centrado e fundo desimpedido para leitura rápida no feed.',
        expressao: 'Expressão humana calma e focada, olhar atento com lábios fechados. Sem caretas ou exageros.',
        visual: 'Iluminação motivada limpa com sombras suaves. Cores fiéis e acabamentos autênticos sem néon ou cenários forçados.'
      }
    };
  }

  // General Scene Archetype: Product Hero (No person, device NOT opened)
  // "Só o teclado em cima da mesa" must stay an assembled product shot, not a teardown.
  if (!hasPerson && isTech && !isTeardownRequest) {
    return {
      approachTitle: 'Produto em Destaque',
      hasPerson: false,
      subjectEn: 'The device described in the scene as the single hero object, fully assembled, with authentic industrial geometry, real button and port layout, and an instantly recognizable silhouette',
      contextEn: hasExplicitEnv
        ? resolvedContextEn
        : 'Clean neutral surface with soft optical falloff, keeping undivided focus on the product without unrelated props',
      lightingEn: hasExplicitEnv
        ? resolvedLightingEn
        : 'Soft directional key light revealing true materials and edges without specular glare or unmotivated RGB neon',
      compositionEn: 'Product filling a large share of the frame at a slight three-quarter angle, readable at 120px mobile thumbnail scale, with intentional negative space',
      expressionEn: 'None (pure product shot without human presence)',
      directionPt: {
        ideia: 'O produto pedido é o protagonista, mostrado como ele realmente é, sem desmontar nem inventar acessórios.',
        foco: 'O dispositivo inteiro, grande no quadro, com formato, botões e acabamento reconhecíveis em tamanho de miniatura.',
        composicao: 'Ângulo de três quartos com o produto ocupando boa parte do quadro e espaço negativo intencional.',
        expressao: 'Nenhuma (cena de produto sem presença humana).',
        visual: 'Luz direcional suave revelando materiais reais, sem reflexos estourados ou néon sem motivo.'
      }
    };
  }

  // General Scene Archetype: General Tech Teardown (No person, opened/disassembled device requested)
  if (!hasPerson && isTech) {
    return {
      approachTitle: 'Bancada Técnica de Precisão',
      hasPerson: false,
      subjectEn: 'Clean high-precision technical surface shot of the disassembled device with exposed internal circuitry, clean ribbon cables, and specialized repair tools arranged nearby',
      contextEn: hasExplicitEnv
        ? resolvedContextEn
        : 'Orderly technical bench with authentic tools, hex drivers, and precision tweezers on an anti-static work mat',
      lightingEn: hasExplicitEnv
        ? resolvedLightingEn
        : 'Even, bright laboratory task lighting with realistic soft shadow falloff beneath the chassis',
      compositionEn: 'Balanced overhead 45-degree angle with the opened device as the commanding centerpiece and tools providing context',
      expressionEn: 'None (pure technical hardware inspection)',
      directionPt: {
        ideia: 'Inspeção técnica autêntica: o aparelho aberto revelando o circuito interno de forma organizada e fascinante.',
        foco: 'O hardware desmontado e o circuito interno são o centro visual absoluto da cena.',
        composicao: 'Enquadramento de bancada técnica em 45 graus, com ferramentas ao redor organizadas e espaço para leitura visual rápida.',
        expressao: 'Nenhuma (foco puramente mecânico e técnico sem presença humana).',
        visual: 'Luz neutra de bancada sem reflexos especulares excessivos, revelando soldas, chips e acabamentos originais.'
      }
    };
  }

  // General Scene Archetype: Faithful Main Subject (No person, no tech, not an urbex/mystery place)
  // Food, landmarks, cars, animals... are drawn as described instead of as a mossy ruin.
  const isMysteryPlace = /(abandonad|ru[ií]na|mist[ée]rio|misterios|assombrad|caverna|t[úu]nel|bunker|escombro|urbex|lugar\s*proibido|explorando)/i.test(combined);
  if (!hasPerson && !isTech && !isMysteryPlace) {
    return {
      approachTitle: 'Assunto Principal em Destaque',
      hasPerson: false,
      subjectEn: 'The main subject exactly as described in the scene, presented as one clear dominant focal point with its authentic real-world shape, materials, and recognizable details',
      contextEn: hasExplicitEnv
        ? resolvedContextEn
        : 'Clean uncluttered background with soft optical falloff that supports the main subject without inventing unrelated props or settings',
      lightingEn: hasExplicitEnv
        ? resolvedLightingEn
        : 'Clean motivated natural key light with soft shadow falloff, revealing true color and texture without artificial glare',
      compositionEn: 'Single dominant subject filling a large share of the frame, readable at 120px mobile thumbnail scale, with intentional negative space',
      expressionEn: 'None (no human presence requested)',
      directionPt: {
        ideia: 'O próprio assunto descrito é o protagonista: a imagem mostra exatamente o que foi pedido, sem elementos inventados.',
        foco: 'Um único ponto focal dominante — o assunto principal da ideia — nítido e reconhecível mesmo em tamanho reduzido.',
        composicao: 'Assunto grande no quadro, recorte firme e espaço negativo intencional para leitura rápida no feed.',
        expressao: 'Nenhuma (cena sem presença humana).',
        visual: 'Luz natural motivada revelando cor e textura reais. Sem néon, sem partículas, sem cenário inventado.'
      }
    };
  }

  // General Scene Archetype: Pure Environment / Space / Mystery (No person, abandoned/mysterious place requested)
  if (!hasPerson && !isTech) {
    return {
      approachTitle: 'Atmosfera e Textura Espacial',
      hasPerson: false,
      subjectEn: 'Atmospheric scene of the weathered structure with tactile cracked concrete, creeping moss, decaying foliage, and authentic environmental aging',
      contextEn: hasExplicitEnv
        ? resolvedContextEn
        : 'Grounded real-world outdoor location with authentic atmospheric depth, honest moss texture, and organic shadows',
      lightingEn: hasExplicitEnv
        ? resolvedLightingEn
        : 'Subdued natural daylight filtering through the trees, creating deep realistic shadows without fake digital mist',
      compositionEn: 'Intentional 16:9 framing guiding the eye directly to the shadowy central opening with generous negative space',
      expressionEn: 'None (pure environmental discovery)',
      directionPt: {
        ideia: 'Atmosfera de mistério e descoberta: o próprio espaço conta a história sem necessidade de elementos humanos.',
        foco: 'O ponto de entrada e as texturas arquitetônicas do ambiente (concreto, musgo e penumbra).',
        composicao: 'Perspectiva com linhas de fuga que atraem o olhar para o centro do mistério, com enquadramento equilibrado.',
        expressao: 'Nenhuma (cena puramente espacial/arquitetônica sem presença humana).',
        visual: 'Luz natural filtrada e sombras dramáticas críveis do próprio ambiente, sem artifícios ou névoa artificial.'
      }
    };
  }

  // General Scene Archetype: Human Storytelling & Authentic Emotional Tension
  const emotionalKeywords = /(perdi|canal|desabafo|crise|segredo|hist[óo]ria|arrepend|tristeza|consequ[êe]ncias|verdade|aviso|urgente|alerta|adeus)/i;
  const isEmotionalStory = emotionalKeywords.test(combined);

  if (hasPerson && isEmotionalStory) {
    return {
      approachTitle: 'Tensão Psicológica e Desabafo Autêntico',
      hasPerson: true,
      subjectEn: 'The creator looking thoughtfully toward the camera with authentic emotional gravity, natural facial asymmetry, and organic skin texture',
      contextEn: hasExplicitEnv
        ? resolvedContextEn
        : 'Minimal atmospheric background with deep optical falloff and clean negative space, keeping total focus on human emotion',
      lightingEn: hasExplicitEnv
        ? resolvedLightingEn
        : 'Subdued directional portrait key light with soft shadow falloff across the face, conveying intimacy and emotional weight',
      compositionEn: 'Medium close-up leaving thoughtful negative space, clean figure-ground separation for instant legibility',
      expressionEn: 'Deep contemplative concern and authentic emotional composure, closed mouth, sincere brow without exaggerated theatrical shouting',
      directionPt: {
        ideia: 'Conexão humana e vulnerabilidade autêntica: a história é contada pela verdade no olhar do criador.',
        foco: 'A expressão facial autêntica e a tensão emocional do criador conduzem todo o impacto da imagem.',
        composicao: 'Plano fechado com enquadramento intimista, mantendo espaço para a respiração do olhar sem elementos concorrentes.',
        expressao: 'Tensão psicológica real, olhar compenetrado ou desabafo genuíno com lábios fechados. Sem caretas ou melodrama.',
        visual: 'Iluminação intimista de baixa intensidade com queda suave de sombras e textura fotográfica natural.'
      }
    };
  }

  // General Scene Archetype: Conversational Creator (Object Focus)
  if (approach === 1) {
    return {
      approachTitle: 'Foco no Objeto / Hardware em Primeiro Plano',
      hasPerson: true,
      subjectEn: isTech
        ? 'Close foreground shot of the authentic physical device held with both hands, clearly showing the screen, natural thumb position on control stick, matte chassis texture, and real button geometry'
        : 'Foreground hero focus on the primary physical object with authentic real-world texture and material finish',
      contextEn: hasExplicitEnv
        ? resolvedContextEn
        : 'Clean neutral background with soft optical falloff, keeping the foreground subject as the commanding centerpiece without domestic clutter',
      lightingEn: hasExplicitEnv
        ? resolvedLightingEn
        : 'Motivated directional key light with gentle wrap-around illumination and soft natural shadow falloff across the surface',
      compositionEn: 'Dominant foreground subject occupying the lower-left two-thirds of the frame, with the person visible slightly in the background to anchor human scale',
      expressionEn: 'Creator visible in the background with a calm, subtle look of genuine curiosity and satisfaction, eyes focused on the device',
      directionPt: {
        ideia: 'O objeto físico é o protagonista indiscutível. A imagem valoriza o acabamento e desperta o desejo de entender a novidade.',
        foco: 'O hardware/produto domina o primeiro plano com nitidez; o criador aparece como âncora humana no fundo.',
        composicao: 'Objeto em primeiro plano ocupando posição de destaque, enquadramento limpo com separação figura-fundo imediata.',
        expressao: 'Satisfação contida e olhar atento. Sem caretas exageradas ou boca aberta.',
        visual: 'Luz direcional motivada revelando o acabamento fosco e materiais reais. Zero néon aleatório, zero partículas flutuantes.'
      }
    };
  }

  return {
    approachTitle: 'Equilíbrio Narrativo / Cumplicidade com o Espectador',
    hasPerson: true,
    subjectEn: isTech
      ? 'A person naturally presenting the device toward the camera with anatomically plausible hands, natural grip around the object, correct visible finger count according to pose and natural occlusion, no duplicated or fused fingers, no fingers intersecting the product, and physically believable hand-to-object contact'
      : 'A person presenting the primary subject with genuine ease and natural composed posture',
    contextEn: hasExplicitEnv
      ? resolvedContextEn
      : 'Clean minimalist background with soft optical falloff and generous negative space, keeping total visual priority on the primary subject without domestic clutter',
    lightingEn: hasExplicitEnv
      ? resolvedLightingEn
      : 'Clean motivated key illumination with soft natural shadow falloff, emphasizing genuine physical textures and form without artificial glare',
    compositionEn: 'Eye-level conversational angle, crisp separation of subject from background through natural optical perspective',
    expressionEn: 'Direct engaging look toward the viewer with a subtle, confident smirk conveying genuine satisfaction without shouting',
    directionPt: {
      ideia: 'Cumplicidade direta com o espectador: uma conversa honesta sobre algo que realmente funcionou.',
      foco: 'Equilíbrio entre a pessoa e o dispositivo: o produto é visível e claro, enquanto a presença humana valida a história.',
      composicao: 'Plano médio na altura dos olhos, enquadramento estável e postura natural, com fundo limpo para rápida leitura visual.',
      expressao: 'Sorriso sutil de satisfação. Fisionomia humana natural e expressiva.',
      visual: 'Iluminação limpa e equilibrada com sombras suaves. Cores fiéis e texturas naturais sem néon, sem artifícios e sem cenários inventados.'
    }
  };
}

// Generate complete photographic prompt tailored for specific target models
export function generateSimpleThumbnail(
  input: CreateThumbnailInput,
  options?: {
    researchResults?: ResearchResult | ResearchResult[] | null;
    /**
     * A ScenePlan already resolved upstream (director reconciliation + complementary merge),
     * as done by POST /api/ai/simple-create. When given, the plan is used as-is so the API
     * and this function render through exactly the same prompt path.
     */
    plan?: ScenePlan;
  }
): CreateThumbnailResult {
  const {
    videoTitle = '',
    ideaDescription = '',
    thumbnailText,
    textTreatment = 'AUTO',
    fontName,
    reserveSpaceForText,
    reservedSpacePosition,
    references = [],
    targetModel = 'GERAL',
    aspectRatio = '16:9',
    stylePreset = 'Natural',
    preserveFace,
    preserveProduct,
    extraInstructions,
    approachIndex = 0
  } = input;

  const complementaryEnabled = isComplementaryEnginesEnabled();
  let enrichedPlan: ScenePlan;
  let themeCtx: ScenePlan['themeContext'];

  if (options?.plan) {
    enrichedPlan = options.plan;
    themeCtx = options.plan.themeContext;
  } else {
    // 0. Hidden Pipeline: Intent Router, Target/Source Resolution & ScenePlan
    const scenePlan = buildScenePlan(input, approachIndex);

    // 0.5 Complementary Pass (Theme Context, Research Facts, Physical Interaction, Spatial Hierarchy)
    // Strictly conditional on master kill switch COMPLEMENTARY_ENGINES_ENABLED=true
    themeCtx = complementaryEnabled ? resolveThemeContext(input, scenePlan) : undefined;
    const rawFacts = (complementaryEnabled && options?.researchResults)
      ? (Array.isArray(options.researchResults) ? options.researchResults.flatMap(r => r.facts) : options.researchResults.facts)
      : undefined;
    const interactionPlan = complementaryEnabled ? planPhysicalInteraction(input, scenePlan, themeCtx, rawFacts) : undefined;
    const spatialPlan = complementaryEnabled ? planSpatialHierarchy(input, scenePlan, themeCtx, interactionPlan) : undefined;
    enrichedPlan = complementaryEnabled
      ? mergeComplementaryPlan(scenePlan, input, themeCtx, options?.researchResults, interactionPlan, spatialPlan)
      : scenePlan;
  }

  // If this is an edit / reconstruction task (IDENTITY_TRANSFER, REPLACE_OBJECT, CHANGE_ENVIRONMENT)
  if (
    enrichedPlan.taskType === 'IDENTITY_TRANSFER' ||
    enrichedPlan.taskType === 'REPLACE_OBJECT' ||
    enrichedPlan.taskType === 'CHANGE_ENVIRONMENT'
  ) {
    const builderResult = buildPromptFromScenePlan(enrichedPlan, input, approachIndex);
    // Same Provenance Guard the API has always applied to edit prompts.
    const editAudit = auditPromptProvenance(builderResult.finalPrompt, enrichedPlan, references);
    return {
      direction: builderResult.directionPt,
      finalPrompt: editAudit.cleanedPrompt,
      approachTitle: builderResult.approachTitle,
      approachIndex,
      typographyPlan: builderResult.typographyPlan,
      scenePlan: builderResult.cleanedPlan,
      outputMetadata: builderResult.outputMetadata || resolveOutputMetadata(targetModel, aspectRatio),
      targetModel: normalizeTargetModel(targetModel)
    };
  }

  const isTech = detectTechHardware(`${videoTitle} ${ideaDescription}`);
  const hasPersonRef = preserveFace || (references || []).some(r => r.role === 'PESSOA');
  const hasProductRef = preserveProduct || (references || []).some(r => r.role === 'PRODUTO');

  const {
    subjectEn,
    contextEn: defaultContextEn,
    lightingEn,
    compositionEn,
    expressionEn,
    directionPt,
    approachTitle,
    hasPerson
  } = interpretUserIntent(videoTitle, ideaDescription, approachIndex, hasPersonRef ? true : undefined, references);

  // If environment was enriched by theme or research, use enriched environment; otherwise keep defaultContextEn
  const contextEn = (complementaryEnabled && enrichedPlan.environment && (enrichedPlan.provenanceMap.environment === 'WEB_RESEARCH' || (themeCtx?.environmentNeed && enrichedPlan.provenanceMap.environment === 'JUSTIFIED_INFERENCE')))
    ? enrichedPlan.environment
    : defaultContextEn;

  // Context-aware depth of field
  const depthOfField = determineDepthOfField(ideaDescription || videoTitle, approachIndex);

  // Translate any vague user buzzwords
  const buzzwordDecisions = translateVagueBuzzwords(`${videoTitle} ${ideaDescription} ${extraInstructions || ''}`);

  // Build preservation lock directives strictly isolated by role (Rules 5-11)
  const locks: string[] = [];

  // 1. PESSOA (Regra 6: Preservar identidade, idade, barba, cabelo, proporções, assimetria. Não copiar roupa, cenário, luz, pose)
  const personRefs = (references || []).filter(r => r.role === 'PESSOA');
  if (hasPersonRef && hasPerson) {
    const refNames = personRefs.length > 0 ? ` (${personRefs.map(r => r.name).join(', ')})` : '';
    locks.push(
      `FACIAL FIDELITY (MANDATORY)${refNames}: Strictly preserve authentic facial identity, true age, beard/facial hair, natural hairline, facial proportions, bone structure, eye shape, and natural facial asymmetry from the reference photo. Do NOT automatically copy clothes, background setting, lighting, or pose from the photo unless explicitly requested. Absolutely NO beauty filters, NO artificial plastic smoothing, NO oversized eyes, NO jaw slimming, NO cartoon exaggeration, NO unnatural teeth whitening.`
    );
  }

  // 2. PRODUTO (Regra 7: Preservar geometria, proporções, botões, analógicos, portas, tela, materiais, silhueta. Não copiar cenário, composição, estilo)
  const productRefs = (references || []).filter(r => r.role === 'PRODUTO');
  if (hasProductRef || isTech) {
    const refNames = productRefs.length > 0 ? ` (${productRefs.map(r => r.name).join(', ')})` : '';
    const researchedProductFacts = (enrichedPlan.researchFacts || [])
      .filter(f => f.category === 'PRODUCT_GEOMETRY' || f.category === 'CONTROL_LAYOUT' || f.category === 'SILHOUETTE')
      .map(f => f.fact);

    const factSuffix = researchedProductFacts.length > 0
      ? ` Grounded physical characteristics: ${researchedProductFacts.join('. ')}.`
      : '';

    locks.push(
      `HARDWARE & PRODUCT FIDELITY (MANDATORY)${refNames}: Strictly preserve authentic industrial geometry, chassis proportions, exact physical buttons, analog sticks, ports, screen, tactile materials, and instantly recognizable silhouette.${factSuffix} Do NOT automatically copy background setting, composition, or style from the reference photo. Zero AI melting or rubbery deformation.`
    );
    if (hasPerson) {
      // Regra 1: Oclusão natural sem exigir 5 dedos visíveis
      locks.push(
        'HAND & OBJECT INTERACTION: Anatomically plausible hands with natural grip around the object, correct visible finger count according to pose and natural occlusion, no duplicated or fused fingers, no fingers intersecting the product, and physically believable hand-to-object contact. Thumbs positioned naturally on controls without chassis melting.'
      );
    }
  }

  // 3. CENÁRIO (Duas interpretações: MEU AMBIENTE vs. REFERÊNCIA DE AMBIENTE)
  const sceneRefs = (references || []).filter(r => r.role === 'CENÁRIO');
  if (sceneRefs.length > 0) {
    const myEnvRefs = sceneRefs.filter(r => r.scenarioMode !== 'REFERENCIA_AMBIENTE');
    const refEnvRefs = sceneRefs.filter(r => r.scenarioMode === 'REFERENCIA_AMBIENTE');

    if (myEnvRefs.length > 0) {
      locks.push(
        `MY ENVIRONMENT / REAL LOCATION (${myEnvRefs.map(s => s.name).join(', ')}): Preserve spatial layout where visible, major furniture placement, windows, doors, walls, desk, sofa, shelves, lighting fixtures, and recognizable environmental features. Do NOT copy people who might appear in this photo, do NOT copy irrelevant stray objects, and do NOT copy photographic filters/treatment. Do not invent: generic gaming room, RGB streamer setup, or futuristic studio if they do not exist.`
      );
    }

    if (refEnvRefs.length > 0) {
      locks.push(
        `ENVIRONMENT REFERENCE / MOOD ONLY (${refEnvRefs.map(s => s.name).join(', ')}): Extract only: type of environment, level of organization, materials, general lighting character, density, and atmosphere. Do NOT copy: exact furniture position, exact room geometry, specific decorations, or identifying objects.`
      );
    }
  }

  // 4. ESTILO (Regra 9: Linguagem visual, acabamento, paleta, contraste, tratamento de luz, textura. Não transferir identidade ou objetos)
  const styleRefs = (references || []).filter(r => r.role === 'ESTILO');
  if (styleRefs.length > 0) {
    locks.push(
      `STYLE REFERENCE (${styleRefs.map(s => s.name).join(', ')}): Emulate only the visual language, overall finish, color palette, contrast curve, motivated lighting treatment, and tactile surface texture. Do NOT transfer personal identity, specific faces, or physical objects from the reference.`
    );
  }

  // 5. COMPOSIÇÃO (Regra 10: Enquadramento, posição relativa, escala visual, negative space, relação entre elementos. Não copiar o conteúdo)
  const compRefs = (references || []).filter(r => r.role === 'COMPOSIÇÃO');
  if (compRefs.length > 0) {
    locks.push(
      `COMPOSITION REFERENCE (${compRefs.map(c => c.name).join(', ')}): Emulate only the camera framing, relative element positions, visual scale hierarchy, negative space distribution, and spatial relationships between elements. Do NOT copy the specific subject matter or contents of the reference.`
    );
  }

  // 6. TIPOGRAFIA (Regra 11: Personalidade da fonte, peso, largura, caixa alta/baixa, spacing, tratamento, posição. Não copiar imagens, pessoas, cenário)
  const typeRefs = (references || []).filter(r => r.role === 'TIPOGRAFIA');
  if (typeRefs.length > 0) {
    locks.push(
      `TYPOGRAPHY REFERENCE (${typeRefs.map(t => t.name).join(', ')}): Emulate only font personality, typographic weight, width, letter-spacing, uppercase/lowercase styling, graphic treatment, and layout position. Do NOT copy images, people, background scenery, or objects from this reference.`
    );
  }

  // Build clean prompt body (Neutral by default, no forced "cinematic" unless requested)
  const cleanIdea = resolveSceneDescription(input, Boolean(enrichedPlan.targetImage));
  const arParam = aspectRatio === '9:16' ? '9:16 vertical format' : '16:9 widescreen format';
  const styleTreatment = stylePreset !== 'Natural' ? `${stylePreset} visual treatment, ` : '';

  const spatialDirective = (enrichedPlan.spatialHierarchyPlan?.applied && enrichedPlan.spatialHierarchyPlan.compositionDirective)
    ? ` ${enrichedPlan.spatialHierarchyPlan.compositionDirective}`
    : '';

  let promptBody = `Photographic YouTube thumbnail, ${arParam}. Directed visual storytelling, authentic and grounded.
SCENE: ${cleanIdea}.
SUBJECT & FRAMING: ${subjectEn}. ${compositionEn}.${spatialDirective}`;

  if (hasPerson) {
    promptBody += `\nHUMAN EXPRESSION: ${expressionEn}.`;
  }

  promptBody += `\nLIGHTING: ${lightingEn}. Light sources are physically motivated and grounded in the scene.
ENVIRONMENT & OPTICS: ${contextEn}. ${styleTreatment}${depthOfField}, tangible materials with matte finishes.`;

  if (buzzwordDecisions.length > 0) {
    promptBody += `\nVISUAL EMPHASIS: ${buzzwordDecisions.join('. ')}.`;
  }

  // Handle thumbnail text, typography treatment and spatial reservation (Rules 12-22)
  const posMap: Record<ReservedSpacePosition, string> = {
    ESQUERDA: 'left side',
    DIREITA: 'right side',
    SUPERIOR: 'upper top area',
    INFERIOR: 'lower bottom area'
  };
  const chosenPos = reservedSpacePosition ? posMap[reservedSpacePosition] : 'right side';

  if (textTreatment === 'SEM_TEXTO' || !thumbnailText || !thumbnailText.trim()) {
    // Regra 16: Gerar sem texto
    promptBody += `\nTYPOGRAPHY: Do not generate any text, letters, logos or pseudo-typography. Reserve clean negative space for later typography.`;
  } else {
    // Regra 14: Texto exato - nunca traduzir, reescrever, corrigir ou adicionar palavras
    const exactText = thumbnailText.trim();
    let typeLine = `The only visible text must read exactly: "${exactText}". No extra words. No pseudo-text. No invented letters.`;

    if (textTreatment === 'RENDER_IN_IMAGE') {
      typeLine += ` Render with high contrast on a calm area, never placing text over faces, hands, or main product. Strictly use only the exact text "${exactText}", zero additional words, zero pseudo-text, zero invented decorative symbols.`;
    } else {
      typeLine += ` Leave clean negative space on the ${chosenPos} for later typography. Do not generate random letters, words, logos, symbols, pseudo-text or decorative glyphs inside the image.`;
    }

    // Regra 18 & 20: Fonte real vs características tipográficas
    if (fontName && fontName.trim().length > 0) {
      typeLine += ` Typographic style: render in authentic ${fontName.trim()} typeface characteristics (clean letterforms, consistent baseline, bold weight).`;
    } else if (textTreatment === 'USAR_REFERENCIA' && typeRefs.length > 0) {
      typeLine += ` Typographic personality, weight, kerning, and treatment must strictly match the TYPOGRAPHY reference.`;
    } else {
      // Regra 13: AUTO - clean bold sans-serif, condensed ou heavy grotesk de acordo com o contexto
      if (isTech) {
        typeLine += ` Typographic style: simple clean heavy grotesk or modern neutral sans-serif with high contrast and legibility.`;
      } else {
        typeLine += ` Typographic style: simple bold condensed sans-serif with high contrast and immediate readability at mobile thumbnail size.`;
      }
    }

    // Regra 21 & 22: Hierarquia tipográfica - mensagem única, não concorrer com o assunto
    typeLine += ` Hierarchy: prioritize this single short message as secondary to the protagonist subject, never competing for focal dominance.`;
    promptBody += `\nTYPOGRAPHY: ${typeLine}`;
  }

  // Regra 17: Reservar espaço para texto
  if (reserveSpaceForText && textTreatment !== 'SEM_TEXTO') {
    promptBody += `\nCOMPOSITION RESERVATION: Leave clean negative space on the ${chosenPos} for later typography. Do not place important subjects or visual clutter in this region.`;
  }

  if (locks.length > 0) {
    promptBody += `\n\nPRESERVATION LOCKS:\n${locks.join('\n')}`;
  }

  if (extraInstructions && extraInstructions.trim().length > 0) {
    promptBody += `\nDIRECTOR NOTES: ${extraInstructions.trim()}`;
  }

  const activeAvoidList = buildAntiSlopAvoid(cleanIdea + ' ' + (extraInstructions || ''));
  promptBody += `\n\nNEGATIVE / STRICTLY AVOID:\n${activeAvoidList.join(', ')}.`;

  let typographyDirective = 'Do not generate any text, letters, logos or pseudo-typography. Reserve clean negative space for later typography.';
  if (textTreatment === 'SEM_TEXTO') {
    typographyDirective = 'Do not render any text, characters, letters, subtitles or watermark.';
  } else if (thumbnailText?.trim()) {
    const posStr = reservedSpacePosition === 'ESQUERDA' ? 'left side' :
      reservedSpacePosition === 'DIREITA' ? 'right side' :
      reservedSpacePosition === 'SUPERIOR' ? 'upper top area' : 'lower bottom area';
    typographyDirective = `Reserve clean, uncluttered negative space on the ${posStr} of the composition specifically for post-production typography ("${thumbnailText.trim()}"). Do not bake distorted AI typography directly into the pixels.`;
  }

  // Same lock decisions as the GERAL PRESERVATION LOCKS above, handed to every model adapter.
  const subject: NewSceneSubject = {
    hasPerson,
    identityRefs: hasPersonRef && hasPerson ? personRefs : [],
    productLock: hasProductRef || isTech,
    productRefs,
    productFacts: (enrichedPlan.researchFacts || [])
      .filter(f => f.category === 'PRODUCT_GEOMETRY' || f.category === 'CONTROL_LAYOUT' || f.category === 'SILHOUETTE')
      .map(f => f.fact)
  };

  // Model-specific adjustments rendered via central dispatcher
  let finalPrompt = renderPromptForTargetModel({
    plan: enrichedPlan,
    input,
    basePrompt: promptBody,
    typographyDirective,
    arParam: aspectRatio === '9:16' ? '9:16 vertical format' : '16:9 widescreen format',
    subject
  });

  // Audit prompt through Provenance Guard to strip any unsupported defaults or leakage
  const audit = auditPromptProvenance(finalPrompt, enrichedPlan, references);
  finalPrompt = audit.cleanedPrompt;

  const typographyPlan = buildTypographyPlan(
    thumbnailText,
    isTech,
    fontName,
    reservedSpacePosition,
    stylePreset,
    textTreatment
  );

  return {
    direction: directionPt,
    finalPrompt,
    approachTitle,
    approachIndex,
    typographyPlan,
    scenePlan: {
      ...enrichedPlan,
      unsupportedDetailsRemoved: audit.purged
    },
    outputMetadata: resolveOutputMetadata(targetModel, aspectRatio),
    targetModel: normalizeTargetModel(targetModel)
  };
}

/**
 * Asynchronous generation pipeline with Grounded Research Broker integration.
 * Activates external research only when RESEARCH_ENABLED is true and entity is eligible.
 */
export async function generateSimpleThumbnailAsync(
  input: CreateThumbnailInput
): Promise<CreateThumbnailResult> {
  if (!isComplementaryEnginesEnabled()) {
    return generateSimpleThumbnail(input);
  }

  const basePlan = buildScenePlan(input, input.approachIndex || 0);
  const themeCtx = resolveThemeContext(input, basePlan);

  const researchResults: ResearchResult[] = [];
  if (ResearchBroker.isResearchEnabled() && themeCtx.researchCandidate) {
    for (const entity of themeCtx.namedEntities) {
      if (ResearchBroker.isEligible(entity, 'PRODUCT_GEOMETRY', basePlan, undefined, input.references)) {
        const res = await ResearchBroker.resolve({ entity, category: 'PRODUCT_GEOMETRY' }, undefined, basePlan, input.references);
        if (res.success) researchResults.push(res);
      }
      if (themeCtx.environmentNeed && ResearchBroker.isEligible(entity, 'ENVIRONMENT_TYPE', basePlan, undefined, input.references)) {
        const res = await ResearchBroker.resolve({ entity, category: 'ENVIRONMENT_TYPE' }, undefined, basePlan, input.references);
        if (res.success) researchResults.push(res);
      }
    }
  }

  return generateSimpleThumbnail(input, { researchResults });
}

// Builds structured typography recommendation for post-generation design (Section 8)
export function buildTypographyPlan(
  thumbnailText?: string,
  isTech = false,
  fontName?: string,
  position: ReservedSpacePosition = 'DIREITA',
  stylePreset?: 'Natural' | 'Cinematográfico' | 'Editorial' | 'Fotojornalismo',
  textTreatment?: TextTreatment
): string {
  if (textTreatment === 'SEM_TEXTO' || !thumbnailText || !thumbnailText.trim()) {
    return 'Nenhuma tipografia necessária. A imagem e o título já comunicam a ideia.';
  }

  const posMap: Record<ReservedSpacePosition, string> = {
    ESQUERDA: 'à esquerda',
    DIREITA: 'à direita',
    SUPERIOR: 'no topo',
    INFERIOR: 'na base'
  };
  const posPt = posMap[position] || 'à direita';
  const clean = thumbnailText.trim();
  const wordCount = clean.split(/\s+/).filter(Boolean).length;
  const lineCount = wordCount <= 2 ? '1 a 2 linhas' : wordCount <= 4 ? 'duas linhas no máximo' : 'duas a três linhas compactas';

  if (fontName && fontName.trim().length > 0) {
    const fName = fontName.trim();
    return `Tipografia com características da família ${fName} (peso bold, caixa alta, ${lineCount}, alto contraste), aplicada posteriormente sobre o espaço negativo ${posPt}.\n\nSugestão: ${fName}.`;
  }

  // Primeiro determina a FUNÇÃO VISUAL da tipografia:
  let visualDecision = '';
  let fontSuggestions = '';

  if (stylePreset === 'Editorial' || stylePreset === 'Fotojornalismo') {
    // GROTESCA EDITORIAL: para aparência mais natural, documental ou editorial
    visualDecision = `Grotesca editorial, peso equilibrado e elegante, caixa alta, ${lineCount}, alto contraste sem agressividade visual, aplicada posteriormente sobre o espaço negativo ${posPt}.`;
    fontSuggestions = 'Roboto Condensed ou Oswald';
  } else if (wordCount >= 4 || position === 'SUPERIOR' || position === 'INFERIOR') {
    // SANS NEUTRA: quando a imagem deve dominar ou há mais palavras
    visualDecision = `Sans-serif neutra de peso médio/bold, ${lineCount}, servindo como apoio secundário para que a composição visual da imagem domine, aplicada posteriormente sobre o espaço negativo ${posPt}.`;
    fontSuggestions = 'Inter ou Barlow Condensed';
  } else if (isTech) {
    // SANS GEOMÉTRICA PESADA: para tecnologia limpa e precisão
    visualDecision = `Sans geométrica pesada, linhas limpas e estruturadas, caixa alta, ${lineCount}, alta legibilidade em telas compactas, aplicada posteriormente sobre o espaço negativo ${posPt}.`;
    fontSuggestions = 'Archivo Black ou Inter';
  } else {
    // CONDENSADA PESADA: para poucas palavras com grande presença
    visualDecision = `Sans-serif condensada pesada, caixa alta, ${lineCount}, alto contraste com a cena, aplicada posteriormente sobre o espaço negativo ${posPt}.`;
    fontSuggestions = 'Anton ou Archivo Black';
  }

  return `${visualDecision}\n\nSugestões: ${fontSuggestions}.`;
}

// Slop remover & prompt purifier (Understands intent first, strips cliches, reconstructs grounded prompt)
export function improvePrompt(input: ImprovePromptInput): ImprovePromptResult {
  const raw = input.rawPrompt.trim();
  const changes: string[] = [];
  const normModel = normalizeTargetModel(input.targetModel);
  const cfg = TARGET_MODEL_CONFIGS[normModel];

  const isGaming = /(game|gaming|console|playstation|xbox|nintendo|steam\s*deck|legion|controller|joystick|switch|zelda)/i.test(raw);
  const isTech = detectTechHardware(raw);
  const hasFace = /(face|person|man|woman|youtuber|creator|shocked|screaming|mouth|reviewer)/i.test(raw);

  let cleaned = raw;

  // 1. Identify and explain intent
  if (/(epic|cinematic|vibrant|high\s*ctr|ultra\s*detailed)/i.test(raw)) {
    changes.push('Identificada a intenção real: thumbnail de alto impacto visual, substituindo adjetivos vagos ("epic", "high CTR") por contraste local e separação figura-fundo.');
  }

  // 2. Neon replacement
  if (/neon/i.test(cleaned)) {
    cleaned = cleaned.replace(/neon\s*(lighting|glow|colors?|lights?|blue\s*and\s*purple|purple\s*and\s*blue)?/gi, '');
    changes.push('Substituído o néon roxo/azul genérico por iluminação motivada crível com contraste natural.');
  }

  // 3. Rim light & outer glow
  if (/(rim\s*light|glowing|outer\s*glow|glow)/i.test(cleaned)) {
    cleaned = cleaned.replace(/(dramatic\s*)?(laser\s*)?rim\s*light(ing)?|(dramatic\s*)?(outer\s*)?glow(ing)?/gi, '');
    changes.push('Removido o efeito de recorte luminoso artificial (rim light) e brilho difuso nas bordas para devolver tridimensionalidade física.');
  }

  // 4. Shock face
  if (/(shocked|screaming|open\s*mouth|excited\s*man|crazy\s*face|gasping)/i.test(cleaned)) {
    cleaned = cleaned.replace(/(shocked|screaming|open\s*mouth|excited\s*man|crazy\s*face|gasping)/gi, '');
    changes.push('Trocada a expressão caricata de choque/grito por curiosidade autêntica e foco genuíno com lábios fechados.');
  }

  // 5. Sparks and floating particles
  if (/(sparks|particles|flying\s*dust|floating\s*embers)/i.test(cleaned)) {
    cleaned = cleaned.replace(/(particles|sparks|flying\s*dust|floating\s*embers)/gi, '');
    changes.push('Eliminadas faíscas e partículas flutuantes sem motivação narrativa, limpando o ruído visual no feed mobile.');
  }

  // 6. Glowing console / hardware deformation
  if (/(glowing\s*console|console\s*glowing)/i.test(raw)) {
    changes.push('Removido o brilho difuso do console, preservando a geometria industrial autêntica, botões físicos e acabamento fosco de fábrica.');
  }

  // 7. Graphic arrows/circles
  if (/(arrows?|red\s*circles?|floating\s*emojis?|floating\s*icons?)/i.test(cleaned)) {
    cleaned = cleaned.replace(/(red\s*)?arrows?|(red\s*)?circles?|floating\s*(emojis?|icons?)/gi, '');
    changes.push('Subtraídos elementos gráficos poluentes (setas, círculos e ícones flutuantes).');
  }

  // 8. Buzzwords
  if (/(epic|cinematic\s*masterpiece|ultra\s*detailed|high\s*ctr|hyperrealistic|8k)/i.test(cleaned)) {
    cleaned = cleaned.replace(/(epic|cinematic\s*masterpiece|ultra\s*detailed|high\s*ctr|hyperrealistic|8k)/gi, '');
  }

  // 9. Spatial hierarchy & scale detection
  const hasSpatialRequest = /(?:make\s+(?:the\s+)?(?:products?|objects?|items?|subject|consoles?)\s+(?:bigger\s+and\s+closer|closer\s+and\s+bigger|bigger|closer|larger|more\s+prominent)|bigger\s+and\s+closer|closer\s+and\s+bigger|tighter\s+crop|zoom\s+in|scale\s+up|aumentar|aproximar|mais\s+perto|mais\s+pr[oó]ximo)/i.test(raw);

  const hasImpactRequest = /(?:make\s+it\s+(?:more\s+)?(?:impactful|professional|better)|high\s*impact|more\s+impactful|mais\s+impactante)/i.test(raw);

  const isProductCover = /(?:game\s*box|box\s*art|game\s*cover|cartridge|m[íi]dia\s*f[íi]sica|physical\s*media|game\s*case|cover\s*art|zelda)/i.test(raw);

  if (hasSpatialRequest) {
    cleaned = cleaned.replace(/(?:make\s+(?:the\s+)?(?:products?|objects?|items?|subject|consoles?)\s+(?:bigger\s+and\s+closer|closer\s+and\s+bigger|bigger|closer|larger|more\s+prominent)|bigger\s+and\s+closer|closer\s+and\s+bigger|tighter\s+crop|zoom\s+in|scale\s+up)[.!]?/gi, '');
    changes.push('Hierarquia espacial e escala aprimoradas: produtos e sujeito principal ampliados e aproximados em primeiro plano com enquadramento mais fechado (tighter crop) sem alterar a iluminação.');
  }

  if (hasImpactRequest) {
    cleaned = cleaned.replace(/(?:make\s+it\s+(?:more\s+)?(?:impactful|professional|better)|high\s*impact|more\s+impactful)[.!]?/gi, '');
    changes.push('Identificada a intenção de maior impacto: aprimoramento por hierarquia espacial, corte mais fechado (crop) e separação figura-fundo sem recorrer a relighting cinematográfico artificial.');
  }

  if (isProductCover) {
    changes.push('Fidelidade de produto e capas físicas: priorizados 1-2 itens hero com proporções autênticas sem distorção e sem inventar arte de capa substituta.');
  }

  // 10. Lighting extraction and explicit request handling
  const explicitLighting = detectExplicitLightingRequest(raw);
  const existingLighting = extractExistingLighting(cleaned);

  let lightingText = '';
  if (explicitLighting.requested) {
    cleaned = cleaned.replace(/(?:make\s+(?:the\s+)?(?:lighting|light)\s+(?:brighter|darker|softer|warmer|cooler)|brighter\s+(?:lighting|light)|increase\s+exposure|higher\s+key|ilumina[çc][ãa]o\s+mais\s+(?:clara|escura))[.!]?/gi, '');
    changes.push('Iluminação ajustada conforme solicitação explícita do usuário: maior brilho e exposição balanceada mantendo coerência física.');
    if (explicitLighting.direction === 'BRIGHTER') {
      lightingText = 'Higher key, brighter motivated physical illumination with increased exposure and clear directional fill.';
    } else if (explicitLighting.direction === 'DARKER') {
      lightingText = 'Lower key, darker motivated physical illumination with rich atmospheric shadows and subtle directional key.';
    } else {
      lightingText = 'Motivated physical illumination adjusted per user request, preserving environmental coherence.';
    }
  } else if (existingLighting) {
    cleaned = cleaned.replace(existingLighting, '');
    changes.push('Preservada a iluminação original existente sem introduzir relighting artificial ou luz cinematográfica.');
    lightingText = `${existingLighting}. Existing scene lighting preserved verbatim without artificial relighting.`;
  } else {
    lightingText = 'Motivated physical illumination with clean directional key light and soft natural shadow falloff.';
  }

  if (changes.length === 0) {
    changes.push('Ajustada a hierarquia visual para dar primazia a um único ponto focal inequívoco.');
    changes.push('Reforçada a separação óptica natural de planos e foco no elemento principal.');
    changes.push('Injetadas travas contra alisamento de pele (skin plastic) e distorção de hardware.');
  }

  // Build reconstructed, grounded prompt based on understood intent
  const cleanSubject = cleaned.replace(/^[,\s.-]+|[,\s.-]+$/g, '').replace(/\s+/g, ' ').trim();
  const isGenericGaming = /^(?:gaming\s*thumbnail|thumbnail|gaming)?$/i.test(cleanSubject);
  const subjectDescription = (isGenericGaming && isGaming && hasFace)
    ? 'A creator naturally focused on a modern gaming console held with both hands'
    : cleanSubject || (isGaming && hasFace ? 'A creator naturally focused on a modern gaming console held with both hands' : 'A compelling hero subject with authentic real-world presence and clean silhouette');

  const handsHardwareDirective = isGaming || isTech
    ? '\nHARDWARE & HANDS: Anatomically plausible hands with natural grip around the object, correct visible finger count according to pose and natural occlusion, no duplicated or fused fingers, no fingers intersecting the product, physically believable hand-to-object contact, authentic buttons and sticks, factory matte chassis with zero AI melting or rubbery deformation.'
    : '';

  const expressionDirective = hasFace
    ? '\nHUMAN EXPRESSION: Natural composed curiosity with closed mouth and expressive eyes, authentic facial asymmetry, natural skin texture avoiding plastic waxy smoothing.'
    : '';

  let spatialHierarchyDirective = '';
  if (hasSpatialRequest) {
    spatialHierarchyDirective = '\nSPATIAL HIERARCHY & PROXIMITY: Primary subject and hero products positioned in immediate foreground proximity with enlarged scale and tighter crop, reducing unnecessary distance between subject and product for bold readability at 120px mobile thumbnail scale.';
  } else if (hasImpactRequest) {
    spatialHierarchyDirective = '\nSPATIAL HIERARCHY & CROP: Strengthened visual hierarchy with tighter crop and bold figure-ground scale separation, eliminating dead space and small competing elements for maximum thumbnail impact without artificial lighting at 120px mobile thumbnail scale.';
  }

  const productCoverDirective = isProductCover
    ? '\nPRODUCT & COVER FIDELITY: Prioritize 1-2 hero items over background clutter, framing physical game boxes, consoles, or media large enough to recognize clearly at thumbnail scale. Preserve authentic proportions, original aspect ratio, physical geometry, and authentic materials without distortion; maintain original cover art identity from references without inventing replacement artwork or turning important covers into tiny background clutter.'
    : '';

  const baseNeutralPrompt = `High-impact photographic YouTube thumbnail, 16:9 widescreen format.
SUBJECT & FRAMING: ${subjectDescription}. Clean figure-ground separation with bold silhouette for instant readability at 120px mobile size.${handsHardwareDirective}${expressionDirective}${spatialHierarchyDirective}${productCoverDirective}
LIGHTING: ${lightingText}
OPTICAL DEPTH: Balanced photographic perspective with 35mm lens, preserving authentic spatial depth and subject clarity without forced blur.
TEXTURES: Authentic tactile materials, true matte finishes, natural skin texture, physical fabric and surfaces.
STRICTLY AVOID: ${CORE_ANTI_SLOP_AVOID.slice(0, 18).join(', ')}.`;

  let finalPrompt = baseNeutralPrompt;

  if (normModel !== 'GERAL' && cfg && cfg.promptStyle !== 'neutral') {
    const extraNotes: string[] = [];
    if (isGaming || isTech) {
      extraNotes.push('Focus on authentic hardware geometry and natural hand grip.');
    }
    if (hasSpatialRequest) {
      extraNotes.push('Position primary subject and hero items in immediate foreground proximity with enlarged scale and tighter crop.');
    }
    if (isProductCover) {
      extraNotes.push('Prioritize 1-2 hero items, preserve authentic product and cover proportions without distortion, and avoid turning covers into background clutter.');
    }
    const createInput: CreateThumbnailInput = {
      videoTitle: cleanSubject || subjectDescription,
      ideaDescription: subjectDescription,
      references: [],
      targetModel: normModel,
      aspectRatio: '16:9',
      stylePreset: 'Natural',
      realismLevel: 'Alto',
      preserveFace: hasFace,
      preserveProduct: isGaming || isTech,
      extraInstructions: extraNotes.length > 0 ? extraNotes.join(' ') : undefined
    };
    const scenePlan = buildScenePlan(createInput);
    const typographyDirective = 'Reserve clean, uncluttered negative space for post-production typography. Do not bake distorted AI typography directly into the pixels.';
    const arParam = '16:9 widescreen format';

    finalPrompt = renderPromptForTargetModel({
      plan: scenePlan,
      input: createInput,
      basePrompt: baseNeutralPrompt,
      typographyDirective,
      arParam
    });

    const audit = auditPromptProvenance(finalPrompt, scenePlan, []);
    finalPrompt = audit.cleanedPrompt;

    if (cfg.promptStyle === 'structured_contract') {
      changes.push(`Prompt estruturado em seções de contrato para ${cfg.displayName}.`);
    } else if (cfg.promptStyle === 'natural_multireference') {
      changes.push(`Prompt formatado em blocos descritivos naturais para ${cfg.displayName}.`);
    } else if (cfg.promptStyle === 'concise_visual') {
      changes.push(`Prompt sintetizado de forma concisa e com parâmetros para ${cfg.displayName}.`);
    } else if (cfg.promptStyle === 'direct_natural_positive') {
      changes.push(`Restrições negativas convertidas em atributos visuais positivos para ${cfg.displayName}.`);
    }
  }

  return {
    changes,
    improvedPrompt: finalPrompt,
    targetModel: normModel,
    outputMetadata: resolveOutputMetadata(normModel, '16:9')
  };
}

// Local optical audit with surgical CHANGE and PRESERVE prompt (Rule 16 & 17)
export function analyzeThumbnailLocally(videoTitle?: string): AnalyzeThumbnailSimpleResult {
  const title = (videoTitle || '').toLowerCase();
  const isTechHardware = detectTechHardware(title);
  const isCreatorFace = /(eu|olhando|perdi|desabafo|meu\s*rosto|humano|apresentador|pessoa|hist[óo]ria)/i.test(title);

  if (isTechHardware && !isCreatorFace) {
    return {
      functioning: [
        'Geometria do hardware principal identificável com enquadramento claro em primeiro plano.',
        'Hierarquia de escala destaca o produto técnico em tamanhos reduzidos de feed.',
        'Paleta de cores sóbria e focada na leitura dos materiais físicos.'
      ],
      aiLooking: [
        'Bordas do dispositivo com brilho especular difuso (glow) característico de renderização sintética.',
        'Acabamento do chassi excessivamente polido e uniforme, sem a textura fosca tátil de fábrica.',
        'Iluminação do ambiente desconectada das fontes de luz reais da bancada.'
      ],
      topProblem: 'Subtrair o brilho difuso das arestas e reintroduzir a textura fosca real de fábrica e portas precisas.',
      fixPrompt: `SURGICAL INPAINTING / CORRECTION PROMPT:

CHANGE:
1. Tone down artificial glowing edges along the device chassis; blend naturally with ambient workbench light falloff.
2. Restore authentic factory matte texture and precision button seams without synthetic plastic gloss.
3. Slightly soften background contrast so the hardware centerpiece stands out with clear figure-ground separation.

PRESERVE:
1. Exact device industrial geometry, chassis proportions, ports, vents, and button layout.
2. Work surface, tool arrangement, and physical materials.
3. Camera framing, 45-degree angle, and 16:9 composition.

AVOID:
warped chassis, fictional ports, glowing outline, rubbery buttons, excessive HDR sharpness.`
    };
  }

  if (isCreatorFace) {
    return {
      functioning: [
        'Enquadramento do protagonista estabelece conexão direta com quem rola o feed.',
        'Postura corporal crível sem a rigidez típica de poses de estoque.',
        'Direção do olhar conduz a atenção para o ponto de curiosidade da thumbnail.'
      ],
      aiLooking: [
        'Recorte luminoso artificial (rim light desmotivado) contornando ombros e cabelo sem fonte física no cenário.',
        'Textura de pele excessivamente polida com aspecto de cera (ausência de textura natural e assimetria orgânica).',
        'Elementos periféricos do fundo competindo visualmente com o rosto do criador.'
      ],
      topProblem: 'Suavizar a luz de recorte artificial nas bordas e reintroduzir textura e iluminação natural de pele.',
      fixPrompt: `SURGICAL INPAINTING / CORRECTION PROMPT:

CHANGE:
1. Tone down artificial rim lighting along shoulders and hair; blend naturally with ambient key light falloff.
2. Replace smoothed plastic skin texture with natural skin texture and organic facial asymmetry, avoiding waxy smoothing.
3. Slightly soften background contrast so the primary foreground subject stands out with clear figure-ground separation.

PRESERVE:
1. Exact facial identity, authentic eye direction, hairline, and subtle expression.
2. Subject pose, clothing, and body posture.
3. Hand placement and natural grip on any held object.
4. Camera framing, core spatial composition, and exact target image environment unless explicitly requested to change.

AVOID:
plastic waxy skin, beauty filter jaw slimming, cartoon saturation, generic shocked expression, changing facial identity.`
    };
  }

  // General balanced optical audit
  return {
    functioning: [
      'Silhueta principal identificável com separação satisfatória em relação ao fundo.',
      'Enquadramento mantém legibilidade visual em tamanhos reduzidos de feed mobile.',
      'Paleta de cores consistente sem saturação descontrolada no primeiro plano.'
    ],
    aiLooking: [
      'Contraste global artificialmente elevado em todo o quadro (efeito HDR exagerado).',
      'Iluminação de recorte sem correspondência com as fontes de luz do cenário.',
      'Elementos de fundo competindo visualmente com o ponto focal principal.'
    ],
    topProblem: 'Subtrair o excesso de iluminação artificial nas bordas e reintroduzir contraste local focado no protagonista.',
    fixPrompt: `SURGICAL INPAINTING / CORRECTION PROMPT:

CHANGE:
1. Tone down artificial rim lighting on edges; blend naturally with ambient scene light falloff.
2. Rebalance local contrast so the primary subject commands visual hierarchy over the background.
3. Soften peripheral elements to maintain clean figure-ground separation at mobile scale.

PRESERVE:
1. Exact subject pose, identity, and physical placement.
2. Core spatial composition, 16:9 framing, and target image environment.
3. Authentic product geometry and tactile material finishes.

AVOID:
overprocessed HDR, glowing outlines, cartoon saturation, generic AI beauty filter.`
  };
}
