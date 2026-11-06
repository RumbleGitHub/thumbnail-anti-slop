import type {
  CreateThumbnailInput,
  PhysicalInteractionPlan,
  ScenePlan,
  SpatialHierarchyPlan,
  ThemeContext
} from '../../types/simple.ts';
import { requestIncludesPerson } from './personDetection.ts';

// Helper for boundary matching
function matchBoundary(text: string, pattern: string): boolean {
  const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${pattern})(?:[^\\p{L}\\p{N}]|$)`, 'iu');
  return re.test(text);
}

/**
 * Checks if composition is already authoritatively owned by USER, TARGET, or COMPOSITION reference.
 * If true, the spatial hierarchy planner must NOT overwrite it unless the user explicitly asks
 * to improve composition, scale, proximity, or impact.
 */
export function isCompositionAuthoritativelyOwned(plan: ScenePlan, userText: string): boolean {
  // Explicit request to improve composition / scale / proximity unlocks optimization
  const explicitImprovement = /(?:make\s+(?:the\s+)?(?:products?|objects?|items?|subject|consoles?)\s+(?:bigger|closer|larger|more\s+prominent)|bigger\s+and\s+closer|closer\s+and\s+bigger|tighter\s+crop|melhore\s+(?:a\s+)?composi[çc][ãa]o|improve\s+composition|more\s+impactful|mais\s+impactante)/i.test(userText);
  if (explicitImprovement) {
    return false;
  }

  // 1. Explicit COMPOSITION reference controls framing
  if (plan.compositionSource || plan.compositionOwner === 'COMPOSITION_REF') {
    return true;
  }

  // 2. TARGET master composition (e.g. edit tasks, IDENTITY_TRANSFER)
  if (plan.targetImage || plan.compositionOwner === 'TARGET' || plan.taskType === 'IDENTITY_TRANSFER') {
    return true;
  }

  // 3. Explicit user placement / camera framing instructions
  if (/(?:extreme\s+wide\s+shot|establishing\s+shot|plano\s+geral\s+amplo|vista\s+a[ée]rea|bird'?s?\s*eye\s*view|drone\s*shot|plano\s+holand[eê]s|dutch\s+angle)/i.test(userText)) {
    return true;
  }

  return false;
}

/**
 * Complementary Thumbnail Spatial Hierarchy Planner:
 * Establishes SCALE, PROXIMITY, CROP, and SPATIAL PRIORITY for 120px mobile thumbnail readability.
 *
 * Core Rule:
 * "What must remain recognizable when this image is viewed very small?"
 *
 * Crucial Constraints:
 * - ZERO authority over lighting (never relights or injects cinematic/rim light)
 * - ZERO AI-slop decoration (no arrows, sparks, particles, glowing borders)
 * - Never overwrites authoritative TARGET or explicit user compositions
 * - Preserves reference product identities without inventing replacement artwork
 */
export function planSpatialHierarchy(
  input: CreateThumbnailInput,
  plan: ScenePlan,
  themeCtx?: ThemeContext,
  interactionPlan?: PhysicalInteractionPlan
): SpatialHierarchyPlan {
  const { videoTitle = '', ideaDescription = '' } = input;
  const userText = `${videoTitle} ${ideaDescription}`.trim();

  // 1. AUTHORITY CHECK: TARGET or explicit composition wins unless explicitly requested to improve
  if (isCompositionAuthoritativelyOwned(plan, userText)) {
    return {
      primarySubject: plan.primarySubject || 'Target Master Subject',
      primaryObject: plan.productSource?.name,
      subjectScale: 'TARGET_LOCKED',
      objectScale: 'TARGET_LOCKED',
      subjectObjectDistance: 'TARGET_LOCKED',
      cropTightness: 'TARGET_LOCKED',
      foregroundPriority: 'Preserve target master framing and spatial relationships.',
      overlapStrategy: 'Preserve target master depth and occlusion.',
      negativeSpaceNeed: 'Preserve target layout.',
      confidence: 1.0,
      applied: false
    };
  }

  // 2. IDENTIFY PRIMARY SUBJECT
  // Same person decision as the engine: object-only scenes must not gain a "Creator" or hands.
  const hasPerson = requestIncludesPerson(input);
  let primarySubject = 'Creator';
  if (!hasPerson) {
    const isPersonWord = (s: string) => /creator|criador|person|pessoa|reviewer|youtuber|apresentador|human/i.test(s);
    const planSubject = plan.primarySubject && plan.primarySubject !== 'A compelling hero subject with authentic real-world presence and clean silhouette' && !isPersonWord(plan.primarySubject)
      ? plan.primarySubject
      : undefined;
    primarySubject = planSubject || (themeCtx?.importantSubjects || []).find(s => !isPersonWord(s)) || 'Main subject';
  } else if (/(?:reviewer|youtuber|apresentador|creator|analista)/i.test(userText)) {
    primarySubject = 'Creator / Reviewer';
  } else if (/(?:eu|meu\s*rosto|minha\s*foto)/i.test(userText)) {
    primarySubject = 'Creator';
  } else if (plan.primarySubject && plan.primarySubject !== 'A compelling hero subject with authentic real-world presence and clean silhouette') {
    primarySubject = plan.primarySubject;
  } else if (themeCtx?.importantSubjects && themeCtx.importantSubjects.length > 0) {
    primarySubject = themeCtx.importantSubjects[0];
  }

  // 3. IDENTIFY PRIMARY OBJECT & HERO SUPPORTING ITEMS
  let primaryObject: string | undefined = plan.productSource?.name;

  if (!primaryObject) {
    if (matchBoundary(userText, 'playstation\\s*2|ps2')) {
      primaryObject = 'PlayStation 2 console';
    } else if (matchBoundary(userText, 'rog\\s*ally|rog\\s*ally\\s*x')) {
      primaryObject = 'ROG Ally X';
    } else if (matchBoundary(userText, 'steam\\s*deck')) {
      primaryObject = 'Steam Deck';
    } else if (matchBoundary(userText, 'switch|nintendo\\s*switch')) {
      primaryObject = 'Nintendo Switch';
    } else if (matchBoundary(userText, 'wireless\\s*(?:gaming\s*)?mouse|mouse\\s*sem\\s*fio|gaming\\s*mouse|mouse')) {
      primaryObject = 'Main wireless gaming mouse';
    } else if (matchBoundary(userText, 'teclado\\s*mec[âa]nico|mechanical\\s*keyboard|custom\\s*keyboard')) {
      primaryObject = 'Custom mechanical keyboard';
    } else if (matchBoundary(userText, 'smartphone|celular|iphone')) {
      primaryObject = 'Smartphone';
    } else if (matchBoundary(userText, 'gadget|console|controle|controller|joystick|aparelho')) {
      primaryObject = 'Primary tech gadget';
    } else if (themeCtx?.importantObjects && themeCtx.importantObjects.length > 0) {
      primaryObject = themeCtx.importantObjects[0];
    }
  }

  // 4. DETECT MULTI-ITEM / GAME COVER / PRODUCT INVENTORY SCENARIOS
  const hasGameCoversOrInventory = /(?:covers?|capas?|jogos?|game\s*boxes?|box\s*art|cartridges?|fitas?|dvds?|consoles?|m[íi]dia\s*f[íi]sica|cases?|prateleira|shelf|shelves|inventory|store|loja|dezenas|dozens)/i.test(userText);
  const hasMultipleAccessories = /(?:10\s*different|v[áa]rios|dezenas|m[úu]ltiplos|cables|keyboards\s*and\s*headsets|secondary\s*gaming\s*mice)/i.test(userText);

  let heroSupportingItems: string[] | undefined;
  let secondaryElements: string[] | undefined;

  if (hasGameCoversOrInventory) {
    heroSupportingItems = ['2–4 recognizable hero game covers in clear immediate proximity to console'];
    secondaryElements = ['Remaining background game inventory and store shelves subordinated with natural optical falloff'];
  } else if (hasMultipleAccessories) {
    heroSupportingItems = ['Selected hero accessory positioned in immediate focus'];
    secondaryElements = ['Secondary mice, cables, keyboards and peripherals subordinated in background falloff'];
  } else {
    secondaryElements = ['Authentic environment elements subordinated in background without clutter'];
  }

  // 5. DISTANCE & PROXIMITY RESOLUTION
  const hasExcessiveDistance = /(?:distant|far\s*(?:away|table|side)|too\s*far|longe|distante|outr[oa]\s*lado|separad[oa])/i.test(userText);
  const hasProximityRequest = /(?:make\s+(?:the\s+)?(?:products?|objects?|items?|subject|consoles?)\s+(?:bigger\s+and\s+closer|closer\s+and\s+bigger)|bigger\s+and\s+closer|closer)/i.test(userText);

  const subjectObjectDistance = (hasExcessiveDistance || hasProximityRequest)
    ? 'IMMEDIATE_PROXIMITY'
    : 'NATURAL_CLOSE';

  // 6. SCALE & CROP RESOLUTION
  const hasImpactRequest = /(?:make\s+it\s+(?:more\s+)?(?:impactful|professional|better)|high\s*impact|more\s+impactful|mais\s+impactante)/i.test(userText);
  const cropTightness = (hasImpactRequest || hasProximityRequest || hasExcessiveDistance)
    ? 'MEDIUM_CLOSE_UP'
    : 'MEDIUM_CLOSE_UP';

  const subjectScale = 'HERO_PROMINENT';
  const objectScale = primaryObject ? 'HERO_PROMINENT' : 'RECOGNIZABLE_AT_120PX';

  // 7. FOREGROUND PRIORITY & OVERLAP STRATEGY
  const foregroundPriority = !hasPerson
    ? `${primaryObject || primarySubject} framed prominently in immediate foreground priority`
    : primaryObject
    ? `${primaryObject} and interacting hands positioned in immediate foreground priority`
    : `${primarySubject} framed prominently in immediate foreground`;

  const overlapStrategy = !hasPerson
    ? heroSupportingItems
      ? 'Hero game covers angled cleanly alongside the console in the foreground without blocking its controls'
      : 'Natural depth layering: primary object angled forward in the foreground; secondary background recedes'
    : interactionPlan?.handPlacement
    ? `Natural depth layering: ${interactionPlan.handPlacement}; primary object positioned forward in foreground without occluding face`
    : heroSupportingItems
    ? 'Hero game covers angled cleanly alongside console in chest-level foreground without blocking creator face or console controls'
    : 'Natural depth layering: primary object angled in foreground unit with interacting hands; secondary background recedes';

  // 8. NEGATIVE SPACE NEED
  const negativeSpaceNeed = input.reserveSpaceForText
    ? `Reserve clean, uncluttered negative space on ${input.reservedSpacePosition || 'right side'} for post-production typography`
    : 'Clean uncluttered negative space preserving focal clarity';

  // 9. THUMBNAIL-SIZE READABILITY RISK
  const thumbnailReadabilityRisk = (hasGameCoversOrInventory || hasMultipleAccessories)
    ? `High risk of visual clutter and unreadable items if all objects compete equally; resolved by establishing strict 3-tier hierarchy (${hasPerson ? 'Creator' : 'Hero Object'} > ${hasPerson ? 'Hero Object/Covers' : 'Hero Covers'} > Subordinate Inventory).`
    : 'Ensure primary subject and product maintain bold silhouettes readable at 120px mobile thumbnail scale.';

  // 10. COMPOSE PHOTOGRAPHIC COMPOSITION DIRECTIVE
  const coversDirective = heroSupportingItems ? '2-4 iconic hero game covers clearly readable in immediate proximity. ' : '';
  const secondaryDirective = secondaryElements ? `${secondaryElements.join('. ')}. ` : '';
  const focalUnit = hasPerson
    ? `${primarySubject} and ${primaryObject || 'hero object'} positioned in immediate foreground proximity`
    : `${primaryObject || primarySubject} positioned large in the immediate foreground`;
  const compositionDirective = `Tight medium-close framing establishing clear spatial hierarchy. ${focalUnit} with enlarged scale for instant 120px mobile thumbnail legibility. ${coversDirective}${secondaryDirective}Zero artificial relighting or fake glow.`;

  return {
    primarySubject,
    primaryObject,
    heroSupportingItems,
    secondaryElements,
    subjectScale,
    objectScale,
    subjectObjectDistance,
    cropTightness,
    foregroundPriority,
    overlapStrategy,
    negativeSpaceNeed,
    thumbnailReadabilityRisk,
    confidence: 0.95,
    applied: true,
    compositionDirective
  };
}
