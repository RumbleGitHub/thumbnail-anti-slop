'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Wand2,
  Copy,
  Check,
  ShieldCheck
} from 'lucide-react';
import { AnalyzeThumbnailSimpleResult } from '@/types/simple';
import { analyzeThumbnailLocally } from '@/lib/simpleEngine/engine';
import { saveSimpleHistoryItem } from '@/lib/simpleEngine/history';

interface ModeAnalyzeProps {
  onNotify: (msg: string) => void;
  onRefreshHistoryCount: () => void;
}

export function ModeAnalyze({ onNotify, onRefreshHistoryCount }: ModeAnalyzeProps) {
  const [image, setImage] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeThumbnailSimpleResult | null>(null);
  const [showFixPrompt, setShowFixPrompt] = useState(false);
  const [copiedFix, setCopiedFix] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      setImage(e.target?.result as string);
      setResult(null);
      setShowFixPrompt(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!image) {
      onNotify('Envie uma imagem para análise.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/simple-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, videoTitle })
      });

      let data: AnalyzeThumbnailSimpleResult;

      if (res.ok) {
        data = await res.json();
      } else {
        data = { ...analyzeThumbnailLocally(videoTitle), isLocal: true };
      }

      setResult(data);

      saveSimpleHistoryItem({
        mode: 'ANALISAR',
        title: videoTitle || 'Auditoria de Thumbnail',
        previewSummary: data.topProblem,
        data
      });
      onRefreshHistoryCount();

      onNotify(data.isLocal ? 'Análise genérica concluída (imagem não examinada).' : 'Auditoria visual concluída!');
    } catch {
      const fallback = { ...analyzeThumbnailLocally(videoTitle), isLocal: true };
      setResult(fallback);
      onNotify('Análise genérica concluída (imagem não examinada).');
    } finally {
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2 sm:py-4">
      {/* Top Header / Intro */}
      <div className="space-y-1">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-500">
          ANALISAR THUMBNAIL
        </h2>
        <p className="text-xs text-zinc-400 font-sans">
          Identifique elementos artificiais e receba um diagnóstico estético direto sem pontuações numéricas fictícias.
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={e => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
        }}
      />

      {/* Case 1: No Image uploaded yet — Large Clean Drop Area */}
      {!image && (
        <div className="space-y-4">
          <div
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
            className={`border-2 border-dashed rounded-3xl p-12 sm:p-16 text-center cursor-pointer transition group flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 group-hover:bg-amber-500/20 group-hover:text-amber-400 text-zinc-400 flex items-center justify-center transition border border-zinc-700/60">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-sans font-medium text-zinc-200">
                Arraste uma thumbnail aqui ou clique para selecionar
              </p>
              <p className="text-xs text-zinc-500 mt-1 font-sans">
                Suporta imagens JPG, PNG ou WebP
              </p>
            </div>
          </div>

          {/* Optional Video Title input before upload */}
          <div className="max-w-xl mx-auto space-y-1 pt-2">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">
              Título do Vídeo <span className="text-zinc-500 font-normal lowercase">(opcional)</span>
            </label>
            <input
              type="text"
              value={videoTitle}
              onChange={e => setVideoTitle(e.target.value)}
              placeholder="Ex: Como dobrei a bateria do meu celular"
              className="w-full bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs font-sans text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition"
            />
          </div>
        </div>
      )}

      {/* Case 2: Image Uploaded — Hero Image on Left, Audit on Right */}
      {image && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (Hero Image: 5 of 12 cols = ~42%) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 sm:p-4 space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-zinc-800/90 bg-zinc-950 aspect-video group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt="Thumbnail para análise"
                  className="w-full h-full object-contain mx-auto"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-zinc-950/90 hover:bg-zinc-900 text-zinc-300 hover:text-zinc-100 text-xs font-mono border border-zinc-700/80 transition backdrop-blur-sm"
                >
                  Trocar Imagem
                </button>
              </div>

              {/* Title input */}
              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1 font-bold">
                  Título do Vídeo <span className="text-zinc-500 font-normal lowercase">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={e => setVideoTitle(e.target.value)}
                  placeholder="Ex: Como dobrei a bateria do meu celular"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-sans text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-mono font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    <span>AUDITANDO CONTRASTE & SLOP...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-zinc-950" />
                    <span>{result ? 'REANALISAR THUMBNAIL' : 'ANALISAR THUMBNAIL'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column (Structured Audit: 7 of 12 cols = ~58%) */}
          <div className="lg:col-span-7 space-y-4">
            {!result && !isLoading && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-sm font-medium text-zinc-300 font-sans">
                  Pronto para auditar sua thumbnail
                </p>
                <p className="text-xs text-zinc-500 font-sans max-w-md mx-auto">
                  Clique no botão &ldquo;Analisar Thumbnail&rdquo; ao lado para diagnosticar contraste, iluminação artificial, distorções de hardware e viés de pele plástica.
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {result.isLocal && (
                  <div role="note" className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-100 leading-relaxed font-sans">
                    <strong className="font-semibold">Análise genérica — a imagem não foi examinada.</strong>{' '}
                    Sem um diretor visual configurado, o motor local só usa o título do vídeo. Os pontos abaixo são verificações comuns para esse tipo de thumbnail, não observações da sua imagem. Confira cada um antes de aplicar o prompt corretivo.
                  </div>
                )}
                {/* O Que Funciona */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-2.5">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2 border-b border-zinc-800/80 pb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    O QUE FUNCIONA
                  </span>
                  <ul className="space-y-1.5">
                    {result.functioning.map((item, idx) => (
                      <li
                        key={idx}
                        className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs text-zinc-200 leading-relaxed font-sans"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* O Que Parece Artificial */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-2.5">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2 border-b border-zinc-800/80 pb-2">
                    <AlertTriangle className="w-4 h-4" />
                    O QUE PARECE ARTIFICIAL
                  </span>
                  <ul className="space-y-1.5">
                    {result.aiLooking.map((item, idx) => (
                      <li
                        key={idx}
                        className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs text-zinc-200 leading-relaxed font-sans"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Maior Problema (Recomendação Prioritária) */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
                    <Flame className="w-4 h-4 text-amber-500" />
                    MAIOR PROBLEMA (CORREÇÃO PRIORITÁRIA)
                  </div>
                  <p className="text-xs sm:text-sm font-sans font-medium text-zinc-100 leading-relaxed">
                    {result.topProblem}
                  </p>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowFixPrompt(prev => !prev)}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold transition shadow-sm"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>{showFixPrompt ? 'Ocultar Prompt de Correção' : 'GERAR PROMPT PARA CORRIGIR'}</span>
                    </button>
                  </div>
                </div>

                {/* Corrective Patch Prompt Drawer */}
                {showFixPrompt && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-500">
                        Prompt Corretivo (Inpainting / Patch)
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyFix}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-mono font-bold flex items-center gap-1.5 transition"
                      >
                        {copiedFix ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed">
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
