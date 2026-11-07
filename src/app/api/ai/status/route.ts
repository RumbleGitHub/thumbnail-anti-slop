import { NextResponse } from 'next/server';
import { getSystemAIStatus } from '@/lib/ai/orchestrator';
import { freeAiStatusLive } from '@/lib/ai/free/workersAi';

export async function GET() {
  try {
    const status = getSystemAIStatus();
    return NextResponse.json({ ...status, freeAi: await freeAiStatusLive() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido ao verificar status de IA.';
    return NextResponse.json(
      {
        localEngine: true,
        director: {
          configured: false,
          provider: 'none'
        },
        auditor: {
          configured: false,
          provider: 'none'
        },
        configured: false,
        provider: 'none',
        model: 'none',
        supportsVision: false,
        error: msg
      },
      { status: 200 }
    );
  }
}
