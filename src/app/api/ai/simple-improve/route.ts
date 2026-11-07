import { NextRequest, NextResponse } from 'next/server';
import { improvePrompt, resolveOutputMetadata } from '@/lib/simpleEngine/engine';
import { getVisualDirector } from '@/lib/ai/orchestrator';
import { type ImprovePromptInput, normalizeTargetModel } from '@/types/simple';
import { improveWithFreeText } from '@/lib/ai/free/freeFeatures';
import { isFreeAiEnabled } from '@/lib/ai/free/workersAi';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const body: ImprovePromptInput = {
      ...rawBody,
      rawPrompt: rawBody.rawPrompt || rawBody.prompt || '',
      targetModel: rawBody.targetModel
    };

    const { director, providerName: dirProvider } = getVisualDirector();

    // Owner-paid text providers only (the free layer is handled below).
    if (director && director.isConfigured() && (dirProvider === 'openai' || dirProvider === 'gemini')) {
      try {
        const apiKey = dirProvider === 'openai' ? process.env.OPENAI_API_KEY! : process.env.GEMINI_API_KEY!;
        const systemPrompt = `You are an elite photographic prompt doctor and anti-slop purifier for image models (Midjourney, FLUX, DALL-E).
Your job is to take an AI slop prompt loaded with cliches and rewrite it into a masterclass of visual direction.

RULES:
1. UNDERSTAND INTENT FIRST: Preserve the user's authentic subject and core story. Do NOT replace the user's idea with a standard formula.
2. SUBTRACT SLOP: Remove unmotivated purple-blue gaming neon, floating particles, screaming expressions, fake bokeh, plastic skin, and random arrows/circles.
3. PHYSICAL LIGHTING & NO INVENTED ENVIRONMENT: Replace fake glow with clean motivated physical directional light. Do NOT invent domestic environments (bedrooms, living rooms, sofas, desks, windows, lamps, streamer setups) unless already requested or present in the prompt. If no environment was specified, keep it minimal, neutral, or contextual.
4. HUMAN EXPRESSION: Replace shocked screaming face with authentic human focus, calm curiosity, or subtle satisfaction.
5. NO FORCED APERTURE: Do NOT automatically inject f/2.0 or extreme bokeh. Keep background readable if environmental context was explicitly requested.
6. NO PORE OBSESSION: Use "natural skin texture" and "natural facial asymmetry", avoid "visible skin pores" or hyper-detailed pores.
7. HARDWARE FIDELITY: Enforce authentic chassis geometry and natural hand grip when holding devices.

Output strictly JSON with:
{
  "changes": ["List of 3 to 5 short bullet points in Portuguese explaining what was removed and why"],
  "improvedPrompt": "The refined English photographic prompt"
}`;

        let parsed: { changes?: string[]; improvedPrompt?: string } | null = null;

        if (dirProvider === 'openai') {
          const model = process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Original Prompt:\n${body.rawPrompt}` }
              ],
              response_format: { type: 'json_object' },
              temperature: 0.5
            })
          });

          if (response.ok) {
            const data = await response.json();
            parsed = JSON.parse(data.choices[0].message.content);
          }
        } else if (dirProvider === 'gemini') {
          const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
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
                      { text: `${systemPrompt}\n\nOriginal Prompt:\n${body.rawPrompt}` }
                    ]
                  }
                ],
                generationConfig: {
                  temperature: 0.5,
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
          const normModel = normalizeTargetModel(body.targetModel);
          return NextResponse.json({
            isLocal: false,
            changes: parsed.changes || [],
            improvedPrompt: parsed.improvedPrompt || body.rawPrompt,
            targetModel: normModel,
            outputMetadata: resolveOutputMetadata(normModel, '16:9')
          });
        }
      } catch (err) {
        console.warn('AI improve call failed, using local engine:', err);
      }
    }

    // Free hosted text model (Cloudflare Workers AI) + deterministic engine pass.
    if (rawBody.allowFreeAi === true && isFreeAiEnabled()) {
      const free = await improveWithFreeText(body);
      if (free) {
        const { neurons, latencyMs, aiAssisted, ...result } = free;
        return NextResponse.json({ ...result, isLocal: false, aiAssisted, usage: { provider: 'workers-ai', neurons, latencyMs } });
      }
    }

    // Local engine fallback
    const localResult = improvePrompt(body);
    return NextResponse.json({
      ...localResult,
      isLocal: true
    });
  } catch (error) {
    console.error('Error in /api/ai/simple-improve:', error);
    return NextResponse.json(
      { error: 'Falha ao processar melhoria de prompt.' },
      { status: 500 }
    );
  }
}
