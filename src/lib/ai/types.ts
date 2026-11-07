import {
  ThumbnailAIAnalysis,
  ThumbnailAIComparison,
  ProjectData
} from '@/types';
import {
  TaskType,
  SimpleReferenceRole,
  ScenePlan
} from '@/types/simple';

export interface AnalyzeThumbnailInput {
  imageBase64OrUrl: string;
  videoTitle: string;
  videoDescription?: string;
  visualPromise?: string;
  viewerQuestion?: string;
  thumbnailText?: string;
  activeModes?: string[];
  avoidList?: string[];
  channelIdentity?: string;
}

export interface CompareThumbnailsInput {
  imageA: string;
  imageB: string;
  videoTitle: string;
  videoDescription?: string;
  visualPromise?: string;
}

export interface GenerateDirectionInput {
  videoTitle: string;
  videoDescription?: string;
  visualPromise?: string;
  protagonist?: string;
  availableReferences?: string[];
}

export interface SuggestedDirectionOutput {
  visualPromise: string;
  viewerQuestion: string;
  protagonist: string;
  protagonistType: ProjectData['protagonistType'];
  protagonistPresence: number;
  secondarySubject: string;
  storyMoment: string;
  composition: string;
  camera: string;
  expression: string;
  lighting: string;
  palette: string;
  background: string;
  depth: string;
  thumbnailText: string;
  channelIdentity: string;
  visualStyle: string;
}

export interface RefinePromptInput {
  currentPrompt: string;
  avoidList?: string[];
  referenceLocks?: string[];
  channelIdentity?: string;
  visualStyle?: string;
}

export interface RefinePromptOutput {
  refinedPrompt: string;
  diffSummary: string;
  whatChanged: string[];
}

export interface AIProviderStatus {
  configured: boolean;
  provider: string;
  model: string;
  supportsVision: boolean;
}

export interface AIProvider {
  readonly name: string;
  getStatus(): Promise<AIProviderStatus>;
  analyzeThumbnail(input: AnalyzeThumbnailInput): Promise<ThumbnailAIAnalysis>;
  compareThumbnails(input: CompareThumbnailsInput): Promise<ThumbnailAIComparison>;
  generateDirection(input: GenerateDirectionInput): Promise<SuggestedDirectionOutput>;
  refinePrompt(input: RefinePromptInput): Promise<RefinePromptOutput>;
}

// ==========================================
// MULTIMODAL AI DIRECTOR CONTRACT (Sections 4-18)
// ==========================================

export type VisualFactCategory =
  | 'HEAD_ORIENTATION'
  | 'EXPRESSION'
  | 'BODY_POSE'
  | 'HAND_ACTION'
  | 'CLOTHING_ARMOR'
  | 'PROPS'
  | 'PRODUCT_HARDWARE'
  | 'ENVIRONMENT'
  | 'LIGHTING'
  | 'COMPOSITION'
  | 'STYLE'
  | 'TEXT_GRAPHICS';

export interface VisualFact {
  referenceId: string;
  category: VisualFactCategory;
  fact: string;
  confidence: number;
}

export type ProposedAttributeOwner =
  | 'USER_REQUEST'
  | 'TARGET_IMAGE'
  | 'PERSON_REFERENCE'
  | 'PRODUCT_REFERENCE'
  | 'SCENARIO_REFERENCE'
  | 'STYLE_REFERENCE'
  | 'COMPOSITION_REFERENCE'
  | 'NECESSARY_ADAPTATION'
  | 'JUSTIFIED_INFERENCE'
  | 'NONE';

export interface ProposedAttributeOwners {
  faceOwner?: ProposedAttributeOwner;
  hairOwner?: ProposedAttributeOwner;
  beardOwner?: ProposedAttributeOwner;
  headAngleOwner?: ProposedAttributeOwner;
  expressionOwner?: ProposedAttributeOwner;
  bodyOwner?: ProposedAttributeOwner;
  poseOwner?: ProposedAttributeOwner;
  clothingOwner?: ProposedAttributeOwner;
  armorOwner?: ProposedAttributeOwner;
  propsOwner?: ProposedAttributeOwner;
  handsOwner?: ProposedAttributeOwner;
  productOwner?: ProposedAttributeOwner;
  environmentOwner?: ProposedAttributeOwner;
  backgroundOwner?: ProposedAttributeOwner;
  lightingOwner?: ProposedAttributeOwner;
  cameraOwner?: ProposedAttributeOwner;
  compositionOwner?: ProposedAttributeOwner;
  styleOwner?: ProposedAttributeOwner;
}

export interface DirectorReferenceInput {
  id: string;
  role: SimpleReferenceRole;
  purpose: string;
  name: string;
  url: string; // Base64 data URL, http(s) URL, or path
  scenarioMode?: 'MEU_AMBIENTE' | 'REFERENCIA_AMBIENTE';
  isTarget?: boolean;
}

export interface DirectorInput {
  userIdea: string;
  videoTitle?: string;
  thumbnailText?: string;
  taskType?: TaskType;
  references: DirectorReferenceInput[];
  approachIndex?: number;
}

export interface DirectorResult {
  taskType: TaskType;
  confidence: number;
  targetImageId?: string;
  identitySourceId?: string;
  productSourceId?: string;
  environmentSourceId?: string;
  styleSourceId?: string;
  compositionSourceId?: string;
  visualFacts: VisualFact[];
  attributeOwners: ProposedAttributeOwners;
  preserve: string[];
  change: string[];
  adapt: string[];
  avoid: string[];
  ambiguities: string[];
  suggestedClarification?: string[];
  directorWarnings: string[];
  rawInterpretation?: string;
  /** How many reference images the director actually analyzed (free director only). */
  referencesAnalyzed?: number;
}

export interface VisualDirector {
  readonly name: string;
  isConfigured(): boolean;
  analyze(input: DirectorInput): Promise<DirectorResult>;
}

// ==========================================
// GEMINI VISUAL AUDITOR CONTRACT (Sections 19-24)
// ==========================================

export type AuditFindingCategory =
  | 'PERSON_PORTRAIT'
  | 'TARGET_PROPS'
  | 'HEAD_ORIENTATION'
  | 'ENVIRONMENT_TYPE'
  | 'PRODUCT_GEOMETRY'
  | 'LEAKAGE_RISK'
  | 'CONFLICT'
  | 'TEXT_UNWANTED'
  | 'LIGHTING_COHERENCE';

export type AuditFindingSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AuditFinding {
  referenceId?: string;
  category: AuditFindingCategory;
  description: string;
  severity: AuditFindingSeverity;
  confidence: number;
}

export interface SpatialFact {
  referenceId: string;
  label: string;
  box_2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized
  description: string;
}

export interface AuditorInput {
  taskType?: TaskType;
  userIdea?: string;
  videoTitle?: string;
  references: DirectorReferenceInput[];
  scenePlan?: ScenePlan;
  proposedPrompt?: string;
  imageToAudit?: string; // for thumbnail analysis mode
}

export interface AuditorResult {
  auditStatus: 'PASSED' | 'WARNINGS' | 'CONFLICTS_DETECTED';
  findings: AuditFinding[];
  conflicts: string[];
  missingExpectedElements: string[];
  unexpectedElements: string[];
  referenceLeakageRisks: string[];
  spatialFacts: SpatialFact[];
  confidence: number;
}

export interface VisualAuditor {
  readonly name: string;
  isConfigured(): boolean;
  audit(input: AuditorInput): Promise<AuditorResult>;
}

// ==========================================
// SYSTEM STATUS CONTRACT (Section 30)
// ==========================================

export interface SystemAIStatus {
  localEngine: true;
  director: {
    configured: boolean;
    provider: 'openai' | 'gemini' | 'workers-ai' | 'local' | 'none';
  };
  /** Zero-spend hosted layer (Cloudflare Workers AI). */
  freeAi?: { enabled: boolean; provider: 'workers-ai' | 'none'; reason?: string; remainingNeuronsEstimate?: number };
  auditor: {
    configured: boolean;
    provider: 'gemini' | 'none';
  };
  // Backwards compatibility with previous status endpoint
  configured?: boolean;
  provider?: string;
  model?: string;
  supportsVision?: boolean;
}
