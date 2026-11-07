'use client';

import React, { useState, useMemo, useRef } from 'react';
import { WandSparkles, Copy, Check, CheckCircle2 } from 'lucide-react';
import {
  ImprovePromptResult,
  TargetModel,
  normalizeTargetModel,
  TARGET_MODEL_CONFIGS,
  getSelectableTargetModels
} from '@/types/simple';
import { improvePrompt } from '@/lib/simpleEngine/engine';
import { saveSimpleHistoryItem } from '@/lib/simpleEngine/history';
import {
  focusRing,
  fieldLabel,
  subLabel,
  fieldSurface,
  smallField,
  panelSurface,
  insetSurface,
  sectionTitle,
  primaryButton,
  primaryReady,
  primaryBusy,
  primaryIdle,
  skeletonBar
} from './ui';
import { WorkspaceHeader } from './WorkspaceHeader';
import { describeAiFallback } from '@/lib/ai/free/reasons';

interface ModeImproveProps {
  onNotify: (msg: string) => void;
  onRefreshHistoryCount: () => void;
  /** The creator turned "IA na nuvem" on and the server offers it. */
  allowCloudAi?: boolean;
}

type ImproveView = ImprovePromptResult & { aiAssisted?: boolean; aiSource?: 'workers-ai' | 'provider' | 'engine'; aiFallbackReason?: string };

export function ModeImprove({ onNotify, onRefreshHistoryCount, allowCloudAi = false }: ModeImproveProps) {
  const [rawPrompt, setRawPrompt] = useState('');
  const [targetModel, setTargetModel] = useState<TargetModel>('GERAL');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImproveView | null>(null);
  const [copied, setCopied] = useState(false);

  const selectableTargetModels = useMemo(() => getSelectableTargetModels(), []);
  const inFlightRef = useRef(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const canImprove = rawPrompt.trim().length > 0;

  const handleImprove = async () => {
    if (inFlightRef.current) return;
    if (!rawPrompt.trim()) {
      onNotify('Cole o prompt que você deseja purificar.');
      promptRef.current?.focus();
      return;
    }

    inFlightRef.current = true;
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/simple-improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawPrompt, targetModel, allowCloudAi })
      });

      let data: ImproveView;

      if (res.ok) {
        data = await res.json();
      } else {
        data = { ...improvePrompt({ rawPrompt, targetModel }), ...(allowCloudAi ? { aiFallbackReason: 'server-error' } : {}) };
      }

      setResult(data);

      saveSimpleHistoryItem({
        mode: 'MELHORAR',
        title: rawPrompt.slice(0, 45) || 'Prompt Melhorado',
        previewSummary: data.changes[0] || 'Prompt purificado de AI slop',
        data
      });
      onRefreshHistoryCount();

      onNotify('Slop removido com sucesso!');
    } catch {
      const fallback: ImproveView = { ...improvePrompt({ rawPrompt, targetModel }), ...(allowCloudAi ? { aiFallbackReason: 'network' } : {}) };
      setResult(fallback);
      onNotify('Prompt purificado pelo motor local.');
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.improvedPrompt);
    setCopied(true);
    onNotify('Prompt melhorado copiado!');
    setTimeout(() => setCopied(false), 2500);
  };

  const ctaState: 'loading' | 'ready' | 'empty' = isLoading ? 'loading' : canImprove ? 'ready' : 'empty';
  const resultModel = normalizeTargetModel(result?.targetModel || targetModel);

  const ctaClass = `${primaryButton} w-full sm:w-auto ${ctaState === 'ready' ? primaryReady : ctaState === 'loading' ? primaryBusy : primaryIdle}`;

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-10 pt-2 sm:pt-6">
      <WorkspaceHeader
        step="02 · Melhorar prompt"
        title="Tire o slop sem perder a ideia"
        lead="Cole um prompt cheio de clichês. O motor remove o excesso, mantém o que importa e mostra exatamente o que mudou."
      />

      {/* Input: one surface, the action sits where the eye ends */}
      <section className={`${panelSurface} space-y-5 p-0`}>
        <div className="space-y-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <label htmlFor="improve-prompt" className={fieldLabel}>
              Prompt original
            </label>
            <span className="hidden text-xs text-zinc-500 sm:inline">Remove neon, rim light forçada e poses exageradas</span>
          </div>
          <textarea
            id="improve-prompt"
            ref={promptRef}
            rows={7}
            value={rawPrompt}
            onChange={e => setRawPrompt(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleImprove();
              }
            }}
            placeholder="Cole aqui o prompt cheio de clichês. Ex: epic gaming thumbnail, neon glow, particles, man with mouth wide open..."
            className={`${fieldSurface} block min-h-[200px] resize-y px-4 py-3.5 font-mono text-[13px] leading-relaxed`}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-zinc-800/70 bg-[#0a0b0e] px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="space-y-2 sm:w-72">
            <label htmlFor="improve-model" className={subLabel}>
              Modelo alvo
            </label>
            <select
              id="improve-model"
              value={normalizeTargetModel(targetModel)}
              onChange={e => setTargetModel(normalizeTargetModel(e.target.value as TargetModel))}
              className={`${smallField} h-10`}
            >
              {selectableTargetModels.map(group => (
                <optgroup key={group.groupLabel} label={group.groupLabel}>
                  {group.models.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleImprove}
            disabled={ctaState !== 'ready'}
            aria-busy={ctaState === 'loading'}
            title={ctaState === 'empty' ? 'Cole um prompt primeiro' : 'Remover o slop (Ctrl + Enter)'}
            className={ctaClass}
          >
            {ctaState === 'loading' ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" aria-hidden="true" />
                <span>Removendo slop...</span>
              </>
            ) : (
              <>
                <WandSparkles className="h-4 w-4" aria-hidden="true" />
                <span>Remover o slop</span>
              </>
            )}
          </button>
        </div>
      </section>

      {isLoading && !result && (
        <div aria-hidden="true" className={`${panelSurface} grid gap-8 lg:grid-cols-2`}>
          <div className="space-y-3">
            <div className={`${skeletonBar} h-3 w-24`} />
            <div className={`${skeletonBar} h-40 w-full`} />
          </div>
          <div className="space-y-3">
            <div className={`${skeletonBar} h-3 w-32`} />
            <div className={`${skeletonBar} h-64 w-full`} />
          </div>
        </div>
      )}

      {result && (
        <section className={`${panelSurface} overflow-hidden p-0`}>
          {/* Before and after: the original is muted, the improved version is the one to use */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className={sectionTitle}>Original</p>
                <span className="text-xs text-zinc-600">{rawPrompt.length} caracteres</span>
              </div>
              <p className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap font-mono text-[12.5px] leading-[1.7] text-zinc-500">
                {rawPrompt}
              </p>
            </div>

            <div className="space-y-4 border-t border-amber-500/40 bg-amber-500/[0.03] p-5 sm:p-6 md:border-l md:border-t-0 md:border-l-amber-500/40">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-amber-500">Melhorado</p>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    Pronto para colar no{' '}
                    {resultModel === 'GERAL'
                      ? 'Midjourney, FLUX ou seu gerador preferido'
                      : TARGET_MODEL_CONFIGS[resultModel]?.displayName || targetModel}
                  </p>
                  {result.outputMetadata && (
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 font-mono text-[11px] text-zinc-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                      {result.outputMetadata.modelId} · {result.outputMetadata.aspectRatioHint}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 active:bg-amber-600 ${focusRing}`}
                >
                  {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  <span>{copied ? 'Copiado!' : 'Copiar prompt'}</span>
                </button>
              </div>
              <div className={`${insetSurface} max-h-[28rem] select-all overflow-y-auto whitespace-pre-wrap p-4 font-mono text-[12.5px] leading-[1.7] text-zinc-200 sm:p-5`}>
                {result.improvedPrompt}
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800/70 px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <p className={sectionTitle}>O que mudou</p>
              <span className="text-xs text-zinc-500">{result.changes.length} ajustes</span>
            </div>
            <ul className="mt-4 grid gap-2.5 md:grid-cols-2">
              {result.changes.map((change, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span>{change}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-zinc-800/70 pt-4 text-xs leading-relaxed text-zinc-500">
              {result.aiSource === 'workers-ai'
                ? 'Fonte: IA na nuvem gratuita (Llama 4 Scout) interpretou o pedido; o motor anti-slop aplicou as regras e o formato. Built with Llama.'
                : result.aiSource === 'provider'
                  ? 'Fonte: IA na nuvem configurada no servidor.'
                  : 'Fonte: motor anti-slop determinístico (sem IA).'}
              {result.aiFallbackReason && ` IA na nuvem não usada: ${describeAiFallback(result.aiFallbackReason)}.`}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
