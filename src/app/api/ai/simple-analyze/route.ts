import { NextRequest, NextResponse } from 'next/server';
import { analyzeThumbnailLocally } from '@/lib/simpleEngine/engine';
import { getVisualDirector, getVisualAuditor, isGeminiFreeTier } from '@/lib/ai/orchestrator';
import { analyzeFromMetrics, type ImageMetrics } from '@/lib/simpleEngine/pixelAnalysis';
import { analyzeWithFreeVision, isFreeAiFailure } from '@/lib/ai/free/freeFeatures';
import { isFreeAiEnabled } from '@/lib/ai/free/workersAi';

const METRIC_KEYS: (keyof ImageMetrics)[] = ['width', 'height', 'meanLuma', 'lumaStd', 'clippedHighlights', 'clippedFlatShare', 'crushedShadows', 'meanSaturation', 'neonShare', 'colorfulness', 'edgeDensity', 'centerFocus'];

/** Measurements computed in the browser; accepted only when every field is a finite number. */
function parseMetrics(value: unknown): ImageMetrics | null {
  if (!value || typeof value !== 'object') return null;
  const m = value as Record<string, unknown>;
  return METRIC_KEYS.every(k => typeof m[k] === 'number' && Number.isFinite(m[k] as number)) ? (m as unknown as ImageMetrics) : null;
}

export async function POST(req: NextRequest) {
  try {
    const { image, videoTitle, metrics: rawMetrics, allowCloudAi } = await req.json();
    const metrics = parseMetrics(rawMetrics);
    // The creator's "IA na nuvem" switch governs EVERY external AI provider (free or paid):
    // without an explicit true, the image is never forwarded to any AI service.
    const cloudAllowed = allowCloudAi === true;
    let aiFallbackReason: string | undefined;

    if (!image) {
      return NextResponse.json(
        { error: 'Imagem da thumbnail é obrigatória.' },
        { status: 400 }
      );
    }

    const { director, providerName: dirProvider } = getVisualDirector();
    // Owner-paid providers only; a free-tier Gemini key never receives the thumbnail (it may show a face).
    const usePaidProvider = cloudAllowed && Boolean(director && director.isConfigured()) &&
      (dirProvider === 'openai' || (dirProvider === 'gemini' && !isGeminiFreeTier()));

    if (usePaidProvider) {
      try {
        const apiKey = dirProvider === 'openai' ? process.env.OPENAI_API_KEY! : process.env.GEMINI_API_KEY!;
        const systemPrompt = `You are an exacting visual director auditing a YouTube thumbnail for visual quality, narrative clarity, and synthetic AI slop.

CRITICAL MANDATES:
1. NO NUMERIC SCORES: Do NOT give scores, percentages, CTR predictions, or algorithm ratings.
2. REPORT ONLY VISIBLE EVIDENCE: Inspect the image carefully. Do NOT report "bad hands" or "plastic skin" unless you see actual visible evidence of that defect in this specific image.
3. SURGICAL INPAINTING PROMPT: The corrective fix prompt MUST have two mandatory sections:
   "CHANGE:" (listing strictly the surgical adjustments needed)
   "PRESERVE:" (locking subject pose, facial identity, expression, hand position, hardware geometry, and composition so edits don't break what works).

Output strictly valid JSON:
{
  "functioning": ["1 to 3 items in Portuguese describing what is working visually"],
  "aiLooking": ["1 to 3 items in Portuguese describing visible artificial elements"],
  "topProblem": "Single priority recommendation in Portuguese",
  "fixPrompt": "SURGICAL INPAINTING PROMPT:\\n\\nCHANGE:\\n1. ...\\n\\nPRESERVE:\\n1. ...\\n\\nAVOID:\\n..."
}`;

        let parsed: {
          functioning?: string[];
          aiLooking?: string[];
          topProblem?: string;
          fixPrompt?: string;
        } | null = null;

        if (dirProvider === 'openai') {
          const model = process.env.OPENAI_MODEL || process.env.OPENAI_VISION_MODEL || 'gpt-4o';
          const messages = [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Audit this YouTube thumbnail.${videoTitle ? ` Video Title: "${videoTitle}".` : ''}`
                },
                {
                  type: 'image_url',
                  image_url: { url: image, detail: 'high' }
                }
              ]
            }
          ];

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model,
              messages,
              response_format: { type: 'json_object' },
              temperature: 0.3
            })
          });

          if (response.ok) {
            const data = await response.json();
            parsed = JSON.parse(data.choices[0].message.content);
          }
        } else if (dirProvider === 'gemini') {
          const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
          let mimeType = 'image/png';
          let base64Data = image;
          if (image.startsWith('data:')) {
            const match = image.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              mimeType = match[1];
              base64Data = match[2];
            }
          }

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [
                      { text: `${systemPrompt}\n\nAudit this YouTube thumbnail.${videoTitle ? ` Video Title: "${videoTitle}".` : ''}` },
                      { inlineData: { mimeType, data: base64Data } }
                    ]
                  }
                ],
                generationConfig: {
                  temperature: 0.3,
                  responseMimeType: 'application/json'
                }
              })
            }
          );

          if (response.ok) {
            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) parsed = JSON.parse(rawText);
          }
        }

        if (parsed) {
          // Optional second auditor (Gemini) cross-check if OpenAI was the primary director
          const { auditor } = getVisualAuditor(dirProvider);
          if (auditor && auditor.isConfigured()) {
            try {
              const auditResult = await auditor.audit({
                imageToAudit: image,
                videoTitle,
                references: []
              });
              if (auditResult.referenceLeakageRisks && auditResult.referenceLeakageRisks.length > 0) {
                parsed.aiLooking = [
                  ...(parsed.aiLooking || []),
                  ...auditResult.referenceLeakageRisks.map(r => `Risco detectado pelo auditor: ${r}`)
                ].slice(0, 4);
              }
            } catch {
              // Auditor error is non-fatal
            }
          }

          return NextResponse.json({
            isLocal: false,
            analysisSource: 'provider',
            functioning: parsed.functioning || [],
            aiLooking: parsed.aiLooking || [],
            topProblem: parsed.topProblem || 'Simplificar o contraste e remover iluminação artificial.',
            fixPrompt: parsed.fixPrompt || 'SURGICAL INPAINTING PROMPT:\n\nCHANGE:\n1. Tone down artificial rim light and smooth skin.\n\nPRESERVE:\n1. Exact facial identity, pose, hardware geometry, and background composition.'
          });
        }
      } catch (err) {
        console.warn('Multimodal vision audit failed, falling back to local heuristic:', err);
      }
    }

    // Free hosted vision (Cloudflare Workers AI): only when enabled by the owner and allowed by the user.
    if (cloudAllowed && isFreeAiEnabled()) {
      const free = await analyzeWithFreeVision(image, metrics);
      if (isFreeAiFailure(free)) {
        aiFallbackReason = free.failed;
        console.warn('Free AI analyze fallback:', free.failed);
      } else {
        const { neurons, latencyMs, ...result } = free;
        return NextResponse.json({ ...result, usage: { provider: 'workers-ai', neurons, latencyMs } });
      }
    }

    // Local pixel measurements from the browser (nothing uploaded was needed for these).
    if (metrics) {
      return NextResponse.json({ ...analyzeFromMetrics(metrics), analysisSource: 'local-pixels', aiFallbackReason });
    }

    // Last resort: title-only checklist (the image was not examined).
    const localResult = analyzeThumbnailLocally(videoTitle);
    return NextResponse.json({
      ...localResult,
      isLocal: true,
      analysisSource: 'title-only',
      aiFallbackReason
    });
  } catch (error) {
    console.error('Error in /api/ai/simple-analyze:', error);
    return NextResponse.json(
      { error: 'Falha ao analisar a thumbnail.' },
      { status: 500 }
    );
  }
}
