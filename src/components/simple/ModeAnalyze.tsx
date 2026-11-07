'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  Flame,
  WandSparkles,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { AnalyzeThumbnailSimpleResult } from '@/types/simple';
import { analyzeThumbnailLocally } from '@/lib/simpleEngine/engine';
import { analyzeFromMetrics } from '@/lib/simpleEngine/pixelAnalysis';
import { measureImage, prepareImageForUpload } from '@/lib/client/imageTools';
import { describeAiFallback } from '@/lib/ai/free/reasons';
import { saveSimpleHistoryItem } from '@/lib/simpleEngine/history';
import {
  focusRing,
  fieldLabel,
  subLabel,
  fieldSurface,
  smallField,
  panelSurface,
  secondaryButton,
  secondaryIdle,
  insetSurface,
  primaryButton,
  primaryReady,
  primaryBusy,
  skeletonBar
} from './ui';
import { WorkspaceHeader } from './WorkspaceHeader';

interface ModeAnalyzeProps {
  onNotify: (msg: string) => void;
  onRefreshHistoryCount: () => void;
  /** The creator turned "IA na nuvem" on and the server offers it (free Workers AI or a paid key). */
  allowCloudAi?: boolean;
}

const SOURCE_LABEL: Record<NonNullable<AnalyzeThumbnailSimpleResult['analysisSource']>, string> = {
  provider: 'Fonte: IA na nuvem configurada no servidor (a imagem foi enviada).',
  'workers-ai': 'Fonte: IA na nuvem gratuita (Cloudflare Workers AI · Llama 4 Scout, sem retenção) + heurísticas de pixels medidas no navegador. Built with Llama.',
  'local-pixels': 'Fonte: heurísticas de pixels no navegador (contraste, exposição, saturação, neon, bordas e foco). Não reconhece pessoas, objetos nem texto; nada foi enviado.',
  'title-only': 'Fonte: lista genérica do motor determinístico (a imagem não foi examinada).',
};

export function ModeAnalyze({ onNotify, onRefreshHistoryCount, allowCloudAi = false }: ModeAnalyzeProps) {
  const [image, setImage] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeThumbnailSimpleResult | null>(null);
  const [showFixPrompt, setShowFixPrompt] = useState(false);
  const [copiedFix, setCopiedFix] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inFlightRef = useRef(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onNotify('Use uma imagem JPG, PNG ou WebP.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      setImage(e.target?.result as string);
      setResult(null);
      setShowFixPrompt(false);
    };
    reader.onerror = () => onNotify(`Não foi possível ler ${file.name}.`);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (inFlightRef.current) return;
    if (!image) {
      onNotify('Envie uma imagem para análise.');
      return;
    }

    inFlightRef.current = true;
    setIsLoading(true);

    // Always measured locally first: free, private, and real pixel evidence.
    const metrics = await measureImage(image);

    try {
      let data: AnalyzeThumbnailSimpleResult;

      if (!allowCloudAi) {
        // Cloud AI off: analyze entirely in the browser; no request is made at all.
        data = metrics
          ? { ...analyzeFromMetrics(metrics), analysisSource: 'local-pixels' }
          : { ...analyzeThumbnailLocally(videoTitle), isLocal: true, analysisSource: 'title-only' };
      } else {
        // Smaller re-encoded copy (no EXIF/GPS metadata) for the server and any AI provider.
        const uploadImage = await prepareImageForUpload(image);
        const local = (reason: string): AnalyzeThumbnailSimpleResult => ({
          ...(metrics
            ? { ...analyzeFromMetrics(metrics), analysisSource: 'local-pixels' as const }
            : { ...analyzeThumbnailLocally(videoTitle), isLocal: true, analysisSource: 'title-only' as const }),
          aiFallbackReason: reason
        });
        if (!uploadImage) {
          // The browser could not re-encode it: never send the original (it may carry metadata).
          data = local('unsupported-image');
        } else {
          const res = await fetch('/api/ai/simple-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: uploadImage, videoTitle, metrics, allowCloudAi: true })
          });
          data = res.ok ? await res.json() : local('server-error');
        }
      }

      setResult(data);

      saveSimpleHistoryItem({
        mode: 'ANALISAR',
        title: videoTitle || 'Auditoria de Thumbnail',
        previewSummary: data.topProblem,
        data
      });
      onRefreshHistoryCount();

      onNotify(
        data.analysisSource === 'workers-ai' || data.analysisSource === 'provider'
          ? 'Auditoria visual concluída!'
          : data.analysisSource === 'local-pixels'
            ? 'Análise local concluída (heurísticas de pixels, sem IA).'
            : 'Análise genérica concluída (imagem não examinada).'
      );
    } catch {
      const fallback: AnalyzeThumbnailSimpleResult = {
        ...(metrics
          ? { ...analyzeFromMetrics(metrics), analysisSource: 'local-pixels' as const }
          : { ...analyzeThumbnailLocally(videoTitle), isLocal: true, analysisSource: 'title-only' as const }),
        ...(allowCloudAi ? { aiFallbackReason: 'network' } : {})
      };
      setResult(fallback);
      onNotify(fallback.analysisSource === 'local-pixels' ? 'Análise local concluída (heurísticas de pixels, sem IA).' : 'Análise genérica concluída (imagem não examinada).');
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  };

  const handleCopyFix = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.fixPrompt);
    setCopiedFix(true);
    onNotify('Prompt corretivo copiado!');
    setTimeout(() => setCopiedFix(false), 2500);
  };

  const titleField = (
    <div className="space-y-2">
      <label htmlFor="analyze-title" className={image ? subLabel : fieldLabel}>
        Título do vídeo <span className="font-normal normal-case tracking-normal text-zinc-500">(opcional)</span>
      </label>
      <input
        id="analyze-title"
        type="text"
        value={videoTitle}
        onChange={e => setVideoTitle(e.target.value)}
        placeholder="Ex: Como dobrei a bateria do meu celular"
        className={image ? smallField : `${fieldSurface} h-14 px-5 text-base`}
      />
    </div>
  );

  const ctaClass = `${primaryButton} w-full ${isLoading ? primaryBusy : primaryReady}`;

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-10 pt-2 sm:pt-6">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={e => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
          e.target.value = '';
        }}
      />

      <WorkspaceHeader
        step="03 · Analisar thumbnail"
        title="Veja o que a imagem comunica"
        lead="Envie a thumbnail. A análise mostra o que funciona, o que parece artificial e a correção que mais pesa."
      />

      {!image && (
        <section className={`${panelSurface} space-y-6`}>
          {titleField}
          <div className="space-y-3">
            <span className={fieldLabel}>Thumbnail</span>
            <button
              type="button"
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-20 text-center transition-colors ${focusRing} ${
                isDragging ? 'border-amber-500 bg-amber-500/5' : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/40'
              }`}
            >
              <span className="grid h-11 w-11 place-items-center rounded-full border border-zinc-800 bg-zinc-950">
                <Upload className={`h-5 w-5 ${isDragging ? 'text-amber-400' : 'text-zinc-400'}`} aria-hidden="true" />
              </span>
              <span className="text-base font-semibold text-zinc-100">{isDragging ? 'Solte para analisar' : 'Enviar thumbnail'}</span>
              <span className="text-sm text-zinc-500">Ou arraste a imagem aqui (JPG, PNG ou WebP)</span>
            </button>
          </div>
        </section>
      )}

      {image && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* The thumbnail is the hero of this page */}
          <section className={`${panelSurface} space-y-5 p-4 sm:p-5 lg:sticky lg:top-24 lg:col-span-7`}>
            <div className="overflow-hidden rounded-lg border border-zinc-800/70 bg-zinc-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Thumbnail para análise" className="mx-auto aspect-video h-auto w-full object-contain" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.4fr] sm:items-end">
              <button type="button" onClick={() => fileInputRef.current?.click()} className={`${secondaryButton} ${secondaryIdle} w-full`}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Trocar imagem
              </button>
              {titleField}
            </div>

            <button type="button" onClick={handleAnalyze} disabled={isLoading} aria-busy={isLoading} className={ctaClass}>
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" aria-hidden="true" />
                  <span>Analisando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  <span>{result ? 'Reanalisar thumbnail' : 'Analisar thumbnail'}</span>
                </>
              )}
            </button>
          </section>

          <div className="space-y-5 lg:col-span-5">
            {!result && !isLoading && (
              <section className={`${panelSurface} space-y-2 py-12 text-center`}>
                <ShieldCheck className="mx-auto h-6 w-6 text-zinc-600" aria-hidden="true" />
                <p className="pt-1 text-sm font-medium text-zinc-200">Pronto para auditar sua thumbnail</p>
                <p className="mx-auto max-w-sm text-sm leading-relaxed text-zinc-500">
                  Contraste, iluminação artificial, distorções de hardware e pele plástica.
                </p>
              </section>
            )}

            {isLoading && !result && (
              <section aria-hidden="true" className={`${panelSurface} space-y-4`}>
                <div className={`${skeletonBar} h-3 w-28`} />
                <div className={`${skeletonBar} h-5 w-full`} />
                <div className={`${skeletonBar} h-5 w-4/5`} />
                <div className={`${skeletonBar} mt-6 h-3 w-36`} />
                <div className={`${skeletonBar} h-4 w-full`} />
                <div className={`${skeletonBar} h-4 w-3/4`} />
              </section>
            )}

            {result && (
              <>
                {result.analysisSource && (
                  <p className="text-xs leading-relaxed text-zinc-500">
                    {SOURCE_LABEL[result.analysisSource]}
                    {result.aiFallbackReason && ` IA na nuvem não usada: ${describeAiFallback(result.aiFallbackReason)}.`}
                  </p>
                )}
                {result.isLocal && (!result.analysisSource || result.analysisSource === 'title-only') && (
                  <div role="note" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
                    <strong className="font-semibold">Análise genérica — a imagem não foi examinada.</strong>{' '}
                    Sem um diretor visual configurado, o motor local só usa o título do vídeo. Os pontos abaixo são verificações comuns para esse tipo de thumbnail, não observações da sua imagem. Confira cada um antes de aplicar o prompt corretivo.
                  </div>
                )}

                {/* The most important finding leads, with the corrective action next to it */}
                <section className={`${panelSurface} space-y-4 border-l-2 border-l-amber-500`}>
                  <p className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-amber-500">
                    <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                    Maior problema
                  </p>
                  <p className="text-[15px] font-medium leading-relaxed text-zinc-50">{result.topProblem}</p>
                  <button
                    type="button"
                    onClick={() => setShowFixPrompt(prev => !prev)}
                    aria-expanded={showFixPrompt}
                    aria-controls="analyze-fix-prompt"
                    className={`${secondaryButton} ${secondaryIdle}`}
                  >
                    <WandSparkles className="h-4 w-4" aria-hidden="true" />
                    {showFixPrompt ? 'Ocultar prompt de correção' : 'Gerar prompt para corrigir'}
                  </button>
                </section>

                {showFixPrompt && (
                  <section id="analyze-fix-prompt" className={`${panelSurface} space-y-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className={fieldLabel}>Prompt corretivo</p>
                      <button
                        type="button"
                        onClick={handleCopyFix}
                        className={`inline-flex h-10 items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 active:bg-amber-600 ${focusRing}`}
                      >
                        {copiedFix ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                        {copiedFix ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <div className={`${insetSurface} whitespace-pre-wrap p-4 font-mono text-[12.5px] leading-[1.7] text-zinc-200`}>
                      {result.fixPrompt}
                    </div>
                  </section>
                )}

                {/* Findings share one surface, separated by dividers, each with its own accent */}
                <section className={`${panelSurface} divide-y divide-zinc-800/70 p-0`}>
                  <div className="space-y-3 px-5 py-5 sm:px-6">
                    <p className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-rose-400">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      O que parece artificial
                    </p>
                    <ul className="space-y-2.5">
                      {result.aiLooking.map((item, idx) => (
                        <li key={idx} className="border-l border-rose-500/40 pl-3 text-sm leading-relaxed text-zinc-200">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3 px-5 py-5 sm:px-6">
                    <p className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      O que funciona
                    </p>
                    <ul className="space-y-2.5">
                      {result.functioning.map((item, idx) => (
                        <li key={idx} className="border-l border-emerald-500/40 pl-3 text-sm leading-relaxed text-zinc-300">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
