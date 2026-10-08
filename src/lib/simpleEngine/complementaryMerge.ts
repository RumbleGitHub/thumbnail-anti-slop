import type {
  ComplementaryDebugInfo,
  CreateThumbnailInput,
  PhysicalInteractionPlan,
  ResearchFact,
  ResearchResult,
  ScenePlan,
  SpatialHierarchyPlan,
  ThemeContext
} from '../../types/simple.ts';
import { isEnvironmentAuthoritativelyOwned } from './themeResolver.ts';
import { hasExplicitUserPose } from './interactionPlanner.ts';

/**
 * Non-destructive merge of ThemeContext, ResearchFacts, PhysicalInteractionPlan,
 * and SpatialHierarchyPlan into the base ScenePlan.
 *
 * Strict Rule: Fills ONLY holes. Never overwrites or reinterprets any field that
 * already has authoritative ownership (USER_EXPLICIT, TARGET_IMAGE, ASSIGNED_REFERENCE).
 */
export function mergeComplementaryPlan(
  basePlan: ScenePlan,
  input: CreateThumbnailInput,
  themeCtx?: ThemeContext,
  researchResults?: ResearchResult | ResearchResult[] | null,
  interactionPlan?: PhysicalInteractionPlan,
  spatialPlan?: SpatialHierarchyPlan
): ScenePlan {
  const { videoTitle = '', ideaDescription = '', references = [] } = input;
  const userText = `${videoTitle} ${ideaDescription}`.trim();

  const filledFields: string[] = [];
  const rejectedFields: string[] = [];

  const mergedPlan: ScenePlan = {
    ...basePlan,
    change: [...basePlan.change],
    preserve: [...basePlan.preserve],
    avoid: [...basePlan.avoid],
    provenanceMap: { ...basePlan.provenanceMap }
  };

  // Extract all accepted research facts
  const resultsArr = Array.isArray(researchResults)
    ? researchResults
    : researchResults
    ? [researchResults]
    : [];

  const allResearchFacts: ResearchFact[] = [];
  let primaryResearchProvider: string | undefined;
  let researchFailureReason: string | undefined;

  for (const r of resultsArr) {
    if (r.provider && r.provider !== 'none') {
      primaryResearchProvider = r.provider;
    }
    if (r.success && r.facts.length > 0) {
      allResearchFacts.push(...r.facts);
    } else if (r.failureReason) {
      researchFailureReason = r.failureReason;
    }
  }

  // 1. PRODUCT RESOLUTION & PRODUCT SOURCE STATE
  const hasProductRef = Boolean(basePlan.productSource || (references || []).some(ref => ref.role === 'PRODUTO'));

  if (hasProductRef) {
    // Product reference is locked: HIGHER AUTHORITY WINS
    mergedPlan.productSourceState = 'PRODUCT_REFERENCE_LOCKED';
    // Reject any conflicting researched product geometry
    const productFacts = allResearchFacts.filter(f => f.category === 'PRODUCT_GEOMETRY' || f.category === 'CONTROL_LAYOUT');
    if (productFacts.length > 0) {
      rejectedFields.push('product_geometry_overridden_by_product_reference');
    }
  } else if (allResearchFacts.some(f => f.category === 'PRODUCT_GEOMETRY' || f.category === 'CONTROL_LAYOUT' || f.category === 'SILHOUETTE')) {
    // Researched product without reference
    mergedPlan.productSourceState = 'PRODUCT_RESEARCH_GROUNDED';
    const productFacts = allResearchFacts.filter(f => f.category === 'PRODUCT_GEOMETRY' || f.category === 'CONTROL_LAYOUT' || f.category === 'SILHOUETTE');
    for (const pf of productFacts) {
      mergedPlan.provenanceMap[`research_product_${pf.category.toLowerCase()}`] = 'WEB_RESEARCH';
      filledFields.push(`product_fact_${pf.category}`);
    }
  } else if (basePlan.productOwner !== 'NONE' || themeCtx?.importantObjects.some(o => o === 'ROG Ally X' || o === 'Steam Deck' || o === 'box')) {
    mergedPlan.productSourceState = 'PRODUCT_INFERRED';
  }

  // 2. ENVIRONMENT MERGE
  const envOwned = isEnvironmentAuthoritativelyOwned(basePlan, userText);

  if (envOwned) {
    // Environment has higher authority: REJECT any complementary environment proposal
    if (themeCtx?.visualWorld) {
      rejectedFields.push('theme_visual_world_rejected_due_to_authoritative_environment');
    }
    const envFacts = allResearchFacts.filter(f => f.category === 'ENVIRONMENT_TYPE' || f.category === 'TERRAIN' || f.category === 'ARCHITECTURE');
    if (envFacts.length > 0) {
      rejectedFields.push('research_environment_facts_rejected_due_to_authoritative_environment');
    }
  } else if (basePlan.taskType === 'CREATE_NEW_SCENE') {
    // Environment is unresolved in CREATE_NEW_SCENE: check if theme or research can fill it
    const envFacts = allResearchFacts.filter(f => f.category === 'ENVIRONMENT_TYPE' || f.category === 'TERRAIN' || f.category === 'ARCHITECTURE');

    if (envFacts.length > 0) {
      // Research facts available
      const envDescription = envFacts.map(f => f.fact).join('. ');
      mergedPlan.environment = envDescription;
      mergedPlan.environmentOwner = 'INFERRED';
      mergedPlan.provenanceMap['environment'] = 'WEB_RESEARCH';
      filledFields.push('environment_via_web_research');
    } else if (themeCtx?.environmentNeed && themeCtx.visualWorld) {
      // Grounded thematic inference
      mergedPlan.environment = themeCtx.visualWorld;
      mergedPlan.environmentOwner = 'INFERRED';
      mergedPlan.provenanceMap['environment'] = 'JUSTIFIED_INFERENCE';
      filledFields.push('environment_via_theme_context');
    }
  }

  // 3. PHYSICAL INTERACTION MERGE
  if (interactionPlan) {
    if (basePlan.targetImage || basePlan.poseOwner === 'TARGET') {
      rejectedFields.push('interaction_plan_rejected_due_to_target_authority');
    } else if (hasExplicitUserPose(userText)) {
      rejectedFields.push('interaction_plan_rejected_due_to_explicit_user_pose');
    } else if (interactionPlan.applied) {
      mergedPlan.physicalInteractionPlan = interactionPlan;
      if (interactionPlan.gripType) {
        filledFields.push('physical_grip_interaction');
      }
    }
  }

  // 4. SPATIAL HIERARCHY MERGE
  if (spatialPlan) {
    if (basePlan.compositionOwner === 'COMPOSITION_REF') {
      rejectedFields.push('spatial_hierarchy_rejected_due_to_composition_ref_authority');
    } else if (basePlan.targetImage || basePlan.compositionOwner === 'TARGET') {
      const explicitImprovement = /(?:make\s+(?:the\s+)?(?:products?|objects?|items?|subject|consoles?)\s+(?:bigger|closer|larger|more\s+prominent)|bigger\s+and\s+closer|closer\s+and\s+bigger|tighter\s+crop|melhore\s+(?:a\s+)?composi[çc][ãa]o|improve\s+composition|more\s+impactful|mais\s+impactante)/i.test(userText);
      if (!explicitImprovement) {
        rejectedFields.push('spatial_hierarchy_rejected_due_to_target_authority');
      } else if (spatialPlan.applied) {
        mergedPlan.spatialHierarchyPlan = spatialPlan;
        filledFields.push('spatial_hierarchy_plan');
      }
    } else if (spatialPlan.applied) {
      mergedPlan.spatialHierarchyPlan = spatialPlan;
      filledFields.push('spatial_hierarchy_plan');
    }
  }

  // 5. ATTACH THEME CONTEXT AND PRIMARY STORY
  if (themeCtx) {
    mergedPlan.themeContext = themeCtx;
    if (themeCtx.primaryVisualStory) {
      mergedPlan.primaryVisualStory = themeCtx.primaryVisualStory;
      filledFields.push('primary_visual_story');
    }
  }

  if (allResearchFacts.length > 0) {
    mergedPlan.researchFacts = allResearchFacts;
  }

  // 6. ASSEMBLE COMPLEMENTARY DEBUG INFO
  const firstRes = Array.isArray(researchResults) ? researchResults[0] : researchResults;
  const researchAttempted = firstRes?.attempted ?? Boolean(firstRes && firstRes.provider !== 'none');
  const researchSucceeded = firstRes?.success ?? (allResearchFacts.length > 0);
  const researchTimedOut = firstRes?.timedOut ?? (firstRes?.failureReason === 'TIMEOUT');
  const researchDurationMs = firstRes?.latencyMs;

  const complementaryDebug: ComplementaryDebugInfo = {
    theme: themeCtx?.theme,
    primaryVisualStory: themeCtx?.primaryVisualStory,
    themeResolverUsed: Boolean(themeCtx),
    researchEligible: Boolean(themeCtx?.researchCandidate),
    researchEnabled: process.env.COMPLEMENTARY_ENGINES_ENABLED === 'true' && process.env.RESEARCH_ENABLED === 'true',
    researchAttempted,
    researchSucceeded,
    researchTimedOut,
    researchDurationMs,
    researchProvider: primaryResearchProvider || 'none',
    researchFacts: allResearchFacts.length > 0 ? allResearchFacts : undefined,
    environmentDecision: mergedPlan.environment,
    environmentSource: basePlan.environmentSource?.name || (envOwned ? 'AUTHORITATIVE_OWNER' : 'COMPLEMENTARY_RESOLVED'),
    productSource: mergedPlan.productSourceState,
    interactionPlannerUsed: Boolean(interactionPlan && interactionPlan.applied),
    interactionPlan,
    spatialHierarchyPlannerUsed: Boolean(spatialPlan && spatialPlan.applied),
    spatialHierarchyPlan: spatialPlan,
    complementaryFieldsFilled: filledFields,
    complementaryFieldsRejectedDueToHigherAuthority: rejectedFields,
    researchFailureReason
  };

  mergedPlan.complementaryDebug = complementaryDebug;

  return mergedPlan;
}
