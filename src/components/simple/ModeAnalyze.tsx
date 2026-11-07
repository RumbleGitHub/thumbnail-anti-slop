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
import { saveSimpleHistoryItem } from '@/lib/simpleEngine/history';
import { focusRing, fieldLabel, subLabel, fieldSurface, smallField, panelSurface, secondaryButton, secondaryIdle } from './ui';

interface ModeAnalyzeProps {
  onNotify: (msg: string) => void;
  onRefreshHistoryCount: () => void;
  /** Free hosted vision is available on the server and the creator has not turned it off. */
  allowFreeAi?: boolean;
  /** An owner-paid vision provider is configured on the server. */
  paidVision?: boolean;
}

const SOURCE_LABEL: Record<NonNullable<AnalyzeThumbnailSimpleResult['analysisSource']>, string> = {
  provider: 'Analisada pela IA configurada no servidor.',
  'workers-ai': 'Analisada por IA gratuita (Cloudflare Workers AI, sem retenção) + medições locais da imagem.',
  'local-pixels': 'Medições locais da imagem (contraste, exposição, cor, poluição visual, foco). Sem IA; nada foi enviado.',
  'title-only': '',
};

export function ModeAnalyze({ onNotify, onRefreshHistoryCount, allowFreeAi = false, paidVision = false }: ModeAnalyzeProps) {
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

      if (!allowFreeAi && !paidVision) {
        // Nothing to gain from uploading: analyze entirely in the browser.
        data = metrics
          ? { ...analyzeFromMetrics(metrics), analysisSource: 'local-pixels' }
          : { ...analyzeThumbnailLocally(videoTitle), isLocal: true, analysisSource: 'title-only' };
      } else {
        // Smaller re-encoded copy (no EXIF/GPS metadata) for the server and any AI provider.
        const uploadImage = await prepareImageForUpload(image);
        const res = await fetch('/api/ai/simple-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: uploadImage, videoTitle, metrics, allowFreeAi })
        });
        if (res.ok) {
          data = await res.json();
        } else {
          data = metrics
            ? { ...analyzeFromMetrics(metrics), analysisSource: 'local-pixels' }
            : { ...analyzeThumbnailLocally(videoTitle), isLocal: true, analysisSource: 'title-only' };
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
            ? 'Análise local concluída (medições da imagem, sem IA).'
            : 'Análise genérica concluída (imagem não examinada).'
      );
    } catch {
      const fallback: AnalyzeThumbnailSimpleResult = metrics
        ? { ...analyzeFromMetrics(metrics), analysisSource: 'local-pixels' }
        : { ...analyzeThumbnailLocally(videoTitle), isLocal: true, analysisSource: 'title-only' };
      setResult(fallback);
      onNotify(fallback.analysisSource === 'local-pixels' ? 'Análise local concluída (medições da imagem, sem IA).' : 'Análise genérica concluída (imagem não examinada).');
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

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-2 sm:py-4">
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

      {!image && (
        <div className="space-y-8">
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
              className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center transition-colors ${focusRing} ${
                isDragging ? 'border-amber-500 bg-amber-500/5' : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/40'
              }`}
            >
              <Upload className={`h-6 w-6 ${isDragging ? 'text-amber-400' : 'text-zinc-400'}`} aria-hidden="true" />
              <span className="text-base font-semibold text-zinc-100">
                {isDragging ? 'Solte para analisar' : 'Enviar thumbnail'}
              </span>
              <span className="text-sm text-zinc-500">Ou arraste a imagem aqui (JPG, PNG ou WebP)</span>
            </button>
          </div>
        </div>
      )}

      {image && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className={`${panelSurface} space-y-4 lg:col-span-5`}>
            <div className="aspect-video overflow-hidden rounded-lg bg-zinc-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Thumbnail para análise" className="mx-auto h-full w-full object-contain" />
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className={`${secondaryButton} ${secondaryIdle} h-10 w-full`}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Trocar imagem
            </button>

            {titleField}

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isLoading}
              aria-busy={isLoading}
              className={`inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl px-6 text-sm font-bold uppercase tracking-[0.06em] transition-colors ${focusRing} ${
                isLoading ? 'cursor-wait bg-amber-500 text-zinc-950' : 'bg-amber-500 text-zinc-950 hover:bg-amber-400 active:bg-amber-600'
              }`}
            >
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
          </div>

          <div className="space-y-4 lg:col-span-7">
            {!result && !isLoading && (
              <div className={`${panelSurface} space-y-2 py-10 text-center`}>
                <ShieldCheck className="mx-auto h-7 w-7 text-zinc-600" aria-hidden="true" />
                <p className="text-sm font-medium text-zinc-300">Pronto para auditar sua thumbnail</p>
                <p className="mx-auto max-w-md text-sm text-zinc-500">
                  Diagnóstico de contraste, iluminação artificial, distorções de hardware e pele plástica.
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {result.analysisSource && SOURCE_LABEL[result.analysisSource] && (
                  <p className="text-xs text-zinc-500">{SOURCE_LABEL[result.analysisSource]}</p>
                )}
                {result.isLocal && (!result.analysisSource || result.analysisSource === 'title-only') && (
                  <div role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
                    <strong className="font-semibold">Análise genérica — a imagem não foi examinada.</strong>{' '}
                    Sem um diretor visual configurado, o motor local só usa o título do vídeo. Os pontos abaixo são verificações comuns para esse tipo de thumbnail, não observações da sua imagem. Confira cada um antes de aplicar o prompt corretivo.
                  </div>
                )}

                <div className={`${panelSurface} space-y-3`}>
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    O que funciona
                  </h3>
                  <ul className="space-y-2">
                    {result.functioning.map((item, idx) => (
                      <li key={idx} className="text-sm leading-relaxed text-zinc-200">{item}</li>
                    ))}
                  </ul>
                </div>

                <div className={`${panelSurface} space-y-3`}>
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-400">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    O que parece artificial
                  </h3>
                  <ul className="space-y-2">
                    {result.aiLooking.map((item, idx) => (
                      <li key={idx} className="text-sm leading-relaxed text-zinc-200">{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-400">
                    <Flame className="h-4 w-4" aria-hidden="true" />
                    Maior problema
                  </h3>
                  <p className="text-sm font-medium leading-relaxed text-zinc-100">{result.topProblem}</p>
                  <button
                    type="button"
                    onClick={() => setShowFixPrompt(prev => !prev)}
                    aria-expanded={showFixPrompt}
                    aria-controls="analyze-fix-prompt"
                    className={`${secondaryButton} ${secondaryIdle} h-10`}
                  >
                    <WandSparkles className="h-4 w-4" aria-hidden="true" />
                    {showFixPrompt ? 'Ocultar prompt de correção' : 'Gerar prompt para corrigir'}
                  </button>
                </div>

                {showFixPrompt && (
                  <div id="analyze-fix-prompt" className={`${panelSurface} space-y-3`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={fieldLabel}>Prompt corretivo</span>
                      <button
                        type="button"
                        onClick={handleCopyFix}
                        className={`inline-flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-bold uppercase tracking-[0.06em] text-zinc-950 transition-colors hover:bg-amber-400 active:bg-amber-600 ${focusRing}`}
                      >
                        {copiedFix ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                        {copiedFix ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <div className="whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-200">
                      {result.fixPrompt}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
