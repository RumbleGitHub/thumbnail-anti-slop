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
import { focusRing, fieldLabel, subLabel, fieldSurface, smallField, panelSurface } from './ui';
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
        data = improvePrompt({ rawPrompt, targetModel });
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
      const fallback = improvePrompt({ rawPrompt, targetModel });
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

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-2 sm:py-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <label htmlFor="improve-prompt" className={fieldLabel}>
            Prompt original
          </label>
          <span className="hidden text-sm text-zinc-500 sm:inline">
            Remove neon, rim light forçada e poses exageradas
          </span>
        </div>
        <textarea
          id="improve-prompt"
          ref={promptRef}
          rows={6}
          value={rawPrompt}
          onChange={e => setRawPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleImprove();
            }
          }}
          placeholder="Cole aqui o prompt cheio de clichês. Ex: epic gaming thumbnail, neon glow, particles, man with mouth wide open..."
          className={`${fieldSurface} block min-h-[160px] resize-y px-5 py-4 font-mono text-sm leading-relaxed`}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 sm:w-80">
          <label htmlFor="improve-model" className={subLabel}>
            Modelo alvo
          </label>
          <select
            id="improve-model"
            value={normalizeTargetModel(targetModel)}
            onChange={e => setTargetModel(normalizeTargetModel(e.target.value as TargetModel))}
            className={`${smallField} h-11`}
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
          className={`inline-flex h-12 w-full shrink-0 items-center justify-center gap-2.5 rounded-xl px-7 text-sm font-bold uppercase tracking-[0.06em] transition-colors sm:w-auto ${focusRing} ${
            ctaState === 'ready'
              ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400 active:bg-amber-600'
              : ctaState === 'loading'
                ? 'cursor-wait bg-amber-500 text-zinc-950'
                : 'cursor-not-allowed bg-amber-500/40 text-zinc-950/70'
          }`}
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

      {result && (
        <div className="grid grid-cols-1 items-start gap-6 border-t border-zinc-800/80 pt-8 lg:grid-cols-2">
          <div className={`${panelSurface} space-y-4`}>
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
              <h3 className={fieldLabel}>O que mudei</h3>
              <span className="text-xs text-zinc-500">
                {result.changes.length} ajustes
              </span>
            </div>
            <ul className="space-y-2.5">
              {result.changes.map((change, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span>{change}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-zinc-500">
              {result.aiSource === 'workers-ai'
                ? 'Fonte: IA na nuvem gratuita (Llama 4 Scout) interpretou o pedido; o motor anti-slop aplicou as regras e o formato. Built with Llama.'
                : result.aiSource === 'provider'
                  ? 'Fonte: IA na nuvem configurada no servidor.'
                  : 'Fonte: motor anti-slop determinístico (sem IA).'}
              {result.aiFallbackReason && ` IA na nuvem não usada: ${describeAiFallback(result.aiFallbackReason)}.`}
            </p>
            <div className="space-y-1.5 border-t border-zinc-800/70 pt-3">
              <span className={subLabel}>Original enviado</span>
              <p className="line-clamp-3 font-mono text-xs text-zinc-500">{rawPrompt}</p>
            </div>
          </div>

          <div className={`${panelSurface} space-y-4`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <span className={fieldLabel}>Prompt melhorado</span>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-zinc-400">
                    Pronto para colar no{' '}
                    {resultModel === 'GERAL'
                      ? 'Midjourney, FLUX ou seu gerador preferido'
                      : TARGET_MODEL_CONFIGS[resultModel]?.displayName || targetModel}
                  </p>
                  {result.outputMetadata && (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 font-mono text-[11px] text-zinc-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                      {result.outputMetadata.modelId} · {result.outputMetadata.aspectRatioHint}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-bold uppercase tracking-[0.06em] text-zinc-950 transition-colors hover:bg-amber-400 active:bg-amber-600 ${focusRing}`}
              >
                {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <div className="max-h-[28rem] select-all overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-800/80 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-200 sm:p-5">
              {result.improvedPrompt}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
