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
  /** Present only when the server offers free hosted AI; lets the creator turn it off. */
  freeAi?: { allowed: boolean; onToggle: () => void };
}

const FREE_AI_EXPLANATION =
  'IA gratuita (Cloudflare Workers AI): imagens de análise e referências de produto/cenário/alvo são enviadas à Cloudflare, que não guarda nem treina com elas. Fotos de rosto nunca são enviadas. Desligue para manter tudo no navegador.';

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
  freeAi
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/70 bg-[#090a0d]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 md:h-[72px] md:flex-nowrap md:py-0">
        {/* Brand + engine status (quiet) */}
        <div className="order-1 flex min-w-0 items-center gap-3">
          <span className="truncate text-[15px] font-bold uppercase tracking-[0.06em] text-zinc-50">
            Thumbnail Anti-Slop
          </span>
          {freeAi ? (
            <button
              type="button"
              onClick={freeAi.onToggle}
              aria-pressed={freeAi.allowed}
              title={FREE_AI_EXPLANATION}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[11px] transition-colors hover:bg-zinc-900 ${focusRing} ${
                freeAi.allowed ? 'text-emerald-300' : 'text-zinc-500'
              }`}
            >
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${freeAi.allowed ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              <span className="sr-only sm:not-sr-only">{freeAi.allowed ? 'IA grátis ligada' : 'IA grátis desligada'}</span>
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
          className="order-3 flex w-full items-center gap-1 rounded-xl border border-zinc-800 bg-[#111216] p-1 md:order-2 md:w-auto"
        >
          {MODES.map(mode => {
            const active = currentMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onSelectMode(mode.id)}
                aria-current={active ? 'page' : undefined}
                className={`h-10 flex-1 rounded-lg px-3 text-xs font-semibold uppercase tracking-[0.08em] transition-colors md:flex-initial md:px-5 md:text-[13px] ${focusRing} ${
                  active ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
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
          className={`order-2 inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-zinc-800 px-3 text-sm sm:px-3.5 text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100 md:order-3 ${focusRing}`}
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
