import { NextRequest, NextResponse } from 'next/server';
import {
  generateSimpleThumbnail,
  buildScenePlan,
  isComplementaryEnginesEnabled,
  resolveThemeContext,
  ResearchBroker,
  planPhysicalInteraction,
  planSpatialHierarchy,
  mergeComplementaryPlan,
  type ResearchResult
} from '@/lib/simpleEngine/engine';
import {
  getVisualDirector,
  getVisualAuditor,
  mapReferencesToDirectorInput,
  reconcileDirectorWithLocalRules
} from '@/lib/ai/orchestrator';
import type { CreateThumbnailInput } from '@/types/simple';
import type { DirectorResult, AuditorResult } from '@/lib/ai/types';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  // Kept outside the try so the safety net below can reuse it: a request body can only be read once.
  let parsedBody: CreateThumbnailInput | null = null;
  try {
    const rawBody = await req.json();
    const body: CreateThumbnailInput = {
      ...rawBody,
      ideaDescription: rawBody.ideaDescription || rawBody.idea || '',
      videoTitle: rawBody.videoTitle || '',
      references: rawBody.references || []
    };
    parsedBody = body;

    // 1. LOCAL INITIAL CLASSIFICATION & BASELINE SCENE PLAN
    const localScenePlan = buildScenePlan(body, body.approachIndex || 0);

    // 2. MULTIMODAL AI DIRECTOR (if configured and references warrant multimodal analysis)
    const { director, providerName: dirProvider } = getVisualDirector();
    let directorResult: DirectorResult | null = null;
    let directorLatencyMs: number | undefined;

    const hasImages = (body.references || []).length > 0;
    // The creator's "IA na nuvem" switch governs every external AI provider (free or paid):
    // without it, no reference image is forwarded to any AI service.
    const cloudAllowed = (body as { allowCloudAi?: boolean }).allowCloudAi === true;
    const shouldInvokeDirector = Boolean(director && director.isConfigured() && hasImages && cloudAllowed);

    if (shouldInvokeDirector && director) {
      const dirStart = Date.now();
      try {
        const directorRefs = mapReferencesToDirectorInput(body.references);
        directorResult = await director.analyze({
          userIdea: body.ideaDescription,
          videoTitle: body.videoTitle,
          thumbnailText: body.thumbnailText,
          taskType: localScenePlan.taskType,
          references: directorRefs,
          approachIndex: body.approachIndex
        });
        directorLatencyMs = Date.now() - dirStart;
      } catch (err: unknown) {
        console.warn('AI Director call failed or timed out, gracefully falling back to local engine:', err instanceof Error ? err.message : err);
        directorResult = null;
      }
    }

    // 3. LOCAL AUTHORITY / PROVENANCE GUARD (Merge Policy — Section 11)
    // Deterministic reconciliation: User intent > Reference roles > Target master > Local rules > AI facts
    const reconciledPlan = reconcileDirectorWithLocalRules(directorResult, localScenePlan, body);

    // 3.5 COMPLEMENTARY ENGINES (Theme Context, Optional Grounded Research, Physical Interaction)
    let fullyEnrichedPlan = reconciledPlan;
    if (isComplementaryEnginesEnabled()) {
      const themeCtx = resolveThemeContext(body, reconciledPlan);
      const researchResults: ResearchResult[] = [];
      if (ResearchBroker.isResearchEnabled() && themeCtx.researchCandidate) {
        for (const entity of themeCtx.namedEntities) {
          if (ResearchBroker.isEligible(entity, 'PRODUCT_GEOMETRY', reconciledPlan, undefined, body.references)) {
            const res = await ResearchBroker.resolve({ entity, category: 'PRODUCT_GEOMETRY' }, undefined, reconciledPlan, body.references);
            if (res.success) researchResults.push(res);
          }
          if (themeCtx.environmentNeed && ResearchBroker.isEligible(entity, 'ENVIRONMENT_TYPE', reconciledPlan, undefined, body.references)) {
            const res = await ResearchBroker.resolve({ entity, category: 'ENVIRONMENT_TYPE' }, undefined, reconciledPlan, body.references);
            if (res.success) researchResults.push(res);
          }
        }
      }
      const interactionPlan = planPhysicalInteraction(body, reconciledPlan, themeCtx, researchResults.flatMap(r => r.facts));
      const spatialPlan = planSpatialHierarchy(body, reconciledPlan, themeCtx, interactionPlan);
      fullyEnrichedPlan = mergeComplementaryPlan(reconciledPlan, body, themeCtx, researchResults, interactionPlan, spatialPlan);
    }

    // 4 + 5. PROMPT RENDERING + PROVENANCE AUDIT
    // Same path as generateSimpleThumbnail (and every contract test): intent interpretation,
    // role-isolated preservation locks, typography rules, model adapter, then the Provenance Guard.
    const engineResult = generateSimpleThumbnail(body, { plan: fullyEnrichedPlan });
    let finalCleanedPrompt = engineResult.finalPrompt;

    // 6. OPTIONAL SECOND VISUAL AUDITOR (Gemini) — Section 19-25
    const { auditor, providerName: audProvider } = getVisualAuditor(dirProvider);
    let auditorResult: AuditorResult | null = null;
    let auditorLatencyMs: number | undefined;

    const shouldInvokeAuditor = Boolean(
      auditor &&
      auditor.isConfigured() &&
      hasImages &&
      (reconciledPlan.taskType === 'IDENTITY_TRANSFER' ||
       reconciledPlan.taskType === 'REPLACE_OBJECT' ||
       reconciledPlan.taskType === 'CHANGE_ENVIRONMENT' ||
       (body.references && body.references.length >= 2))
    );

    if (shouldInvokeAuditor && auditor) {
      const audStart = Date.now();
      try {
        const directorRefs = mapReferencesToDirectorInput(body.references);
        auditorResult = await auditor.audit({
          taskType: reconciledPlan.taskType,
          userIdea: body.ideaDescription,
          videoTitle: body.videoTitle,
          references: directorRefs,
          scenePlan: reconciledPlan,
          proposedPrompt: finalCleanedPrompt
        });
        auditorLatencyMs = Date.now() - audStart;

        // Auditor cannot rewrite prompt, but checks leakage risks (Section 20, 23)
        if (auditorResult.referenceLeakageRisks && auditorResult.referenceLeakageRisks.length > 0) {
          for (const risk of auditorResult.referenceLeakageRisks) {
            const riskLower = risk.toLowerCase();
            if (riskLower.includes('bedroom') || riskLower.includes('room') || riskLower.includes('sofa') || riskLower.includes('desk lamp')) {
              // Ensure no domestic tokens leaked into the prompt
              finalCleanedPrompt = finalCleanedPrompt.replace(/(a\s+)?(domestic\s+)?(bedroom|living\s+room|sofa|work\s+desk|desk\s+lamp)/gi, 'neutral clean backdrop');
            }
          }
        }
      } catch (err) {
        console.warn('Second Visual Auditor non-fatal error:', err);
        auditorResult = null;
      }
    }

    // Combine any removed details or warnings
    const allPurged = [
      ...(engineResult.scenePlan?.unsupportedDetailsRemoved || []),
      ...(reconciledPlan.unsupportedDetailsRemoved || [])
    ];

    const responsePayload = {
      isLocal: directorResult === null,
      direction: engineResult.direction,
      finalPrompt: finalCleanedPrompt,
      approachTitle: engineResult.approachTitle,
      approachIndex: body.approachIndex || 0,
      typographyPlan: engineResult.typographyPlan,
      scenePlan: {
        ...fullyEnrichedPlan,
        unsupportedDetailsRemoved: allPurged
      },
      outputMetadata: engineResult.outputMetadata,
      targetModel: engineResult.targetModel,
      // Free reference checks ("product looks like: ...") are shown with the other usage notes.
      // Who helped: the prompt itself always comes from the deterministic engine.
      aiAssist: directorResult
        ? {
            provider: dirProvider,
            referencesChecked: directorResult.referencesAnalyzed ?? (body.references || []).length,
            findings: directorResult.visualFacts.length + (directorResult.directorWarnings?.length || 0),
            fallbackReason: directorResult.rawInterpretation?.match(/fallback: ([\w-]+)/)?.[1],
          }
        : { provider: 'none' },
      modelNotes: dirProvider === 'workers-ai' && directorResult?.directorWarnings?.length
        ? [...(engineResult.modelNotes || []), ...directorResult.directorWarnings]
        : engineResult.modelNotes,
      // Development debug data (Section 31 & Complementary Trace)
      ...(process.env.NODE_ENV !== 'production' || req.headers.get('x-debug-trace') === 'true'
        ? {
            debugInfo: {
              directorUsed: Boolean(directorResult),
              directorProvider: directorResult ? dirProvider : 'none',
              directorLatencyMs,
              directorConfidence: directorResult?.confidence,
              auditorUsed: Boolean(auditorResult),
              auditorProvider: auditorResult ? audProvider : 'none',
              auditorLatencyMs,
              taskType: fullyEnrichedPlan.taskType,
              targetImageId: fullyEnrichedPlan.targetImage?.id,
              identitySourceId: fullyEnrichedPlan.identitySource?.id,
              removedUnsupportedDetails: allPurged,
              totalTimeMs: Date.now() - startTime,
              // Complementary Engine Fields
              theme: fullyEnrichedPlan.complementaryDebug?.theme,
              primaryVisualStory: fullyEnrichedPlan.complementaryDebug?.primaryVisualStory,
              themeResolverUsed: fullyEnrichedPlan.complementaryDebug?.themeResolverUsed,
              researchEligible: fullyEnrichedPlan.complementaryDebug?.researchEligible,
              researchEnabled: fullyEnrichedPlan.complementaryDebug?.researchEnabled,
              researchAttempted: fullyEnrichedPlan.complementaryDebug?.researchAttempted,
              researchSucceeded: fullyEnrichedPlan.complementaryDebug?.researchSucceeded,
              researchTimedOut: fullyEnrichedPlan.complementaryDebug?.researchTimedOut,
              researchDurationMs: fullyEnrichedPlan.complementaryDebug?.researchDurationMs,
              researchProvider: fullyEnrichedPlan.complementaryDebug?.researchProvider,
              researchFacts: fullyEnrichedPlan.complementaryDebug?.researchFacts,
              environmentDecision: fullyEnrichedPlan.complementaryDebug?.environmentDecision,
              environmentSource: fullyEnrichedPlan.complementaryDebug?.environmentSource,
              productSource: fullyEnrichedPlan.complementaryDebug?.productSource,
              interactionPlannerUsed: fullyEnrichedPlan.complementaryDebug?.interactionPlannerUsed,
              interactionPlan: fullyEnrichedPlan.complementaryDebug?.interactionPlan,
              spatialHierarchyPlannerUsed: fullyEnrichedPlan.complementaryDebug?.spatialHierarchyPlannerUsed,
              spatialHierarchyPlan: fullyEnrichedPlan.complementaryDebug?.spatialHierarchyPlan,
              complementaryFieldsFilled: fullyEnrichedPlan.complementaryDebug?.complementaryFieldsFilled,
              complementaryFieldsRejectedDueToHigherAuthority: fullyEnrichedPlan.complementaryDebug?.complementaryFieldsRejectedDueToHigherAuthority,
              researchFailureReason: fullyEnrichedPlan.complementaryDebug?.researchFailureReason
            }
          }
        : {})
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Error in /api/ai/simple-create:', error);
    // Ultimate deterministic safety net
    try {
      if (!parsedBody) throw new Error('Request body could not be parsed');
      const localResult = generateSimpleThumbnail(parsedBody);
      return NextResponse.json({
        ...localResult,
        isLocal: true
      });
    } catch {
      return NextResponse.json(
        { error: 'Falha ao processar solicitação de thumbnail.' },
        { status: 500 }
      );
    }
  }
}
