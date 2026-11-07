'use client';

import React from 'react';
import { History } from 'lucide-react';
import { focusRing } from './ui';

type Mode = 'CRIAR' | 'MELHORAR' | 'ANALISAR';

interface HeaderProps {
  currentMode: Mode;
  onSelectMode: (mode: Mode) => void;
  onOpenHistory: () => void;
  historyCount: number;
  aiConfigured: boolean;
  /** Present only when the server offers cloud AI; the creator opts in (off by default). */
  cloudAi?: { allowed: boolean; onToggle: () => void; paidProvider: 'openai' | 'gemini' | null };
}

function cloudAiExplanation(paidProvider: 'openai' | 'gemini' | null): string {
  const where = paidProvider === 'openai' ? 'à OpenAI' : paidProvider === 'gemini' ? 'ao Google Gemini' : 'à Cloudflare Workers AI (Llama 4 Scout), que não guarda nem treina com elas';
  const refs = paidProvider
    ? 'as referências em CRIAR (inclusive as marcadas como Pessoa)'
    : 'as referências de produto, cenário e imagem-alvo em CRIAR';
  const pessoa = paidProvider ? '' : ' Fotos marcadas como Pessoa nunca são enviadas a modelos gratuitos.';
  return `IA na nuvem (desligada por padrão). Ligada: a thumbnail em ANALISAR, ${refs} e o texto em MELHORAR vão ${where}. Qualquer uma dessas imagens pode conter rostos.${pessoa} Desligada: nenhuma imagem vai para IA; ANALISAR roda só no navegador.`;
}

const MODES: { id: Mode; label: string; shortLabel: string }[] = [
  { id: 'CRIAR', label: 'Criar', shortLabel: 'Criar' },
  { id: 'MELHORAR', label: 'Melhorar prompt', shortLabel: 'Melhorar' },
  { id: 'ANALISAR', label: 'Analisar thumbnail', shortLabel: 'Analisar' }
];

export function SimpleHeader({
  currentMode,
  onSelectMode,
  onOpenHistory,
  historyCount,
  aiConfigured,
  cloudAi
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/70 bg-[#090a0d]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 md:h-[72px] md:flex-nowrap md:py-0">
        {/* Brand + engine status (quiet) */}
        <div className="order-1 flex min-w-0 items-center gap-3">
          <span className="truncate text-sm font-semibold tracking-tight text-zinc-50">
            Thumbnail Anti-Slop
          </span>
          {cloudAi ? (
            <button
              type="button"
              onClick={cloudAi.onToggle}
              aria-pressed={cloudAi.allowed}
              aria-label={`IA na nuvem: ${cloudAi.allowed ? 'ligada' : 'desligada'}. ${cloudAiExplanation(cloudAi.paidProvider)}`}
              title={cloudAiExplanation(cloudAi.paidProvider)}
              className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11px] transition-colors hover:bg-zinc-900 sm:h-8 sm:px-2 ${focusRing} ${
                cloudAi.allowed ? 'text-emerald-300' : 'text-zinc-500'
              }`}
            >
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${cloudAi.allowed ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              <span aria-hidden="true" className="sm:hidden">IA</span>
              <span className="hidden sm:inline">{cloudAi.allowed ? 'IA na nuvem ligada' : 'IA na nuvem desligada'}</span>
            </button>
          ) : (
            <span
              className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-zinc-500"
              title={
                aiConfigured
                  ? 'IA multimodal configurada no servidor'
                  : 'Operando no modo local com motor determinístico anti-slop'
              }
            >
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${aiConfigured ? 'bg-emerald-400' : 'bg-zinc-600'}`}
              />
              <span className="sr-only sm:not-sr-only">{aiConfigured ? 'IA Nuvem' : 'Local'}</span>
            </span>
          )}
        </div>

        {/* Mode navigation */}
        <nav
          aria-label="Modos"
          className="order-3 flex w-full items-stretch gap-6 border-t border-zinc-800/60 md:order-2 md:w-auto md:gap-7 md:border-0"
        >
          {MODES.map(mode => {
            const active = currentMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onSelectMode(mode.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative h-11 flex-1 text-[13px] font-medium transition-colors md:flex-initial ${focusRing} ${
                  active ? 'text-zinc-50 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-amber-500' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <span className="sm:hidden">{mode.shortLabel}</span>
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            );
          })}
        </nav>

        {/* History */}
        <button
          type="button"
          onClick={onOpenHistory}
          aria-label={historyCount > 0 ? `Histórico (${historyCount})` : 'Histórico'}
          className={`order-2 inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-zinc-800 px-3 text-sm sm:px-3.5 text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100 md:order-3 ${focusRing}`}
        >
          <History className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          <span className="hidden min-[400px]:inline">Histórico</span>
          {historyCount > 0 && (
            <span className="rounded-full bg-zinc-800 px-1.5 text-[11px] font-semibold text-zinc-300">
              {historyCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
