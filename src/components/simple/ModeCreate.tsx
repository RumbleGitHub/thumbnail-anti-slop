'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  WandSparkles,
  Copy,
  Check,
  Upload,
  X,
  RotateCcw,
  RefreshCw,
  ImagePlus,
  AlertTriangle,
  Type,
  Settings,
  ChevronDown,
  RectangleHorizontal,
  RectangleVertical,
  Info
} from 'lucide-react';
import {
  SimpleReference,
  SimpleReferenceRole,
  ScenarioInterpretation,
  TargetModel,
  TextTreatment,
  ReservedSpacePosition,
  CreateThumbnailResult,
  normalizeTargetModel,
  TARGET_MODEL_CONFIGS,
  getSelectableTargetModels
} from '@/types/simple';
import { generateSimpleThumbnail } from '@/lib/simpleEngine/engine';
import { saveSimpleHistoryItem } from '@/lib/simpleEngine/history';
import { prepareImageForUpload } from '@/lib/client/imageTools';
import { describeAiFallback } from '@/lib/ai/free/reasons';
import {
  focusRing,
  fieldLabel,
  subLabel,
  fieldSurface,
  smallField,
  secondaryButton,
  secondaryIdle,
  secondaryActive,
  panelSurface,
  segmentClass
} from './ui';

const ALL_ROLES: SimpleReferenceRole[] = [
  'PESSOA',
  'PRODUTO',
  'CENÁRIO',
  'IMAGEM_ALVO',
  'ESTILO',
  'COMPOSIÇÃO',
  'TIPOGRAFIA',
  'OUTRA'
];

// Display names only; the stored role values are unchanged.
const ROLE_LABEL: Record<SimpleReferenceRole, string> = {
  PESSOA: 'Pessoa (rosto)',
  PRODUTO: 'Produto',
  CENÁRIO: 'Cenário',
  IMAGEM_ALVO: 'Imagem-alvo',
  ESTILO: 'Estilo',
  COMPOSIÇÃO: 'Composição',
  TIPOGRAFIA: 'Tipografia',
  OUTRA: 'Outra'
};

const ROLE_MICROCOPY: Record<SimpleReferenceRole, string> = {
  PESSOA: 'Preserva traços, rosto e aparência real.',
  PRODUTO: 'Preserva formato, botões e detalhes reais do objeto.',
  CENÁRIO: 'Ambiente ou espaço importante para a cena.',
  IMAGEM_ALVO: 'Estrutura mestre da edição (pose, personagem, enquadramento).',
  ESTILO: 'Apenas cores, iluminação e linguagem visual.',
  COMPOSIÇÃO: 'Apenas enquadramento e posição dos elementos.',
  TIPOGRAFIA: 'Referência de fonte e tratamento do texto.',
  OUTRA: 'Referência geral de apoio.'
};

const TEXT_TREATMENTS: { id: TextTreatment; label: string }[] = [
  { id: 'AUTO', label: 'Automático' },
  { id: 'USAR_REFERENCIA', label: 'Usar referência' },
  { id: 'SEM_TEXTO', label: 'Sem texto' }
];

const RESERVED_POSITIONS: { id: ReservedSpacePosition; label: string }[] = [
  { id: 'ESQUERDA', label: 'Esquerda' },
  { id: 'DIREITA', label: 'Direita' },
  { id: 'SUPERIOR', label: 'Superior' },
  { id: 'INFERIOR', label: 'Inferior' }
];

interface ModeCreateProps {
  onNotify: (msg: string) => void;
  onRefreshHistoryCount: () => void;
  /** The creator turned "IA na nuvem" on: product/scene/target references get a quick check. */
  allowCloudAi?: boolean;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ModeCreate({ onNotify, onRefreshHistoryCount, allowCloudAi = false }: ModeCreateProps) {
  // Main form inputs
  const [videoTitle, setVideoTitle] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [thumbnailText, setThumbnailText] = useState('');
  const [textTreatment, setTextTreatment] = useState<TextTreatment>('AUTO');
  const [fontName, setFontName] = useState('');
  const [reserveSpaceForText, setReserveSpaceForText] = useState(false);
  const [reservedSpacePosition, setReservedSpacePosition] = useState<ReservedSpacePosition>('DIREITA');
  const [references, setReferences] = useState<SimpleReference[]>([]);

  // Inline panels
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced settings
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [stylePreset, setStylePreset] = useState<'Natural' | 'Cinematográfico' | 'Editorial' | 'Fotojornalismo'>('Natural');
  const [realismLevel, setRealismLevel] = useState<'Alto' | 'Estilizado'>('Alto');
  const [targetModel, setTargetModel] = useState<TargetModel>('GERAL');
  const [preserveFace, setPreserveFace] = useState(false);
  const [preserveProduct, setPreserveProduct] = useState(false);
  const [extraInstructions, setExtraInstructions] = useState('');

  // Execution state & Result
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CreateThumbnailResult | null>(null);
  const [copied, setCopied] = useState(false);

  const selectableTargetModels = useMemo(() => getSelectableTargetModels(), []);
  const [approachCount, setApproachCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replacingIdRef = useRef<string | null>(null);
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const thumbTextRef = useRef<HTMLInputElement>(null);
  const referencesSectionRef = useRef<HTMLElement>(null);
  const addReferenceRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef(false);
  const scrollToResultRef = useRef(false);

  const canGenerate = Boolean(videoTitle.trim() || ideaDescription.trim());

  // Helper for word count on thumbnail text
  const textWords = thumbnailText.trim() ? thumbnailText.trim().split(/\s+/).length : 0;

  // Title vs. Thumbnail Text Repetition check
  const isTitleRepeatedInThumbnailText = useMemo(() => {
    if (!videoTitle.trim() || !thumbnailText.trim() || textTreatment === 'SEM_TEXTO') return false;
    const cleanTitle = videoTitle.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
    const cleanThumb = thumbnailText.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
    if (!cleanTitle || !cleanThumb) return false;

    if (cleanTitle.includes(cleanThumb) || cleanThumb.includes(cleanTitle)) return true;

    const titleTokens = new Set(cleanTitle.split(/\s+/).filter(w => w.length > 2));
    const thumbTokens = cleanThumb.split(/\s+/).filter(w => w.length > 2);
    if (thumbTokens.length === 0) return false;

    const overlap = thumbTokens.filter(t => titleTokens.has(t)).length;
    return overlap >= Math.ceil(thumbTokens.length * 0.7);
  }, [videoTitle, thumbnailText, textTreatment]);

  // Contextual quick chips based on user description (Rule 4)
  const contextualChips = useMemo(() => {
    const combined = `${videoTitle} ${ideaDescription}`.toLowerCase();
    const chips: string[] = [];

    const hasPersonInText = /(eu|meu\s*rosto|minha\s*cara|minha\s*rea[çc][ãa]o|pessoa|homem|mulher|criador|cara)(\b|$)/i.test(combined);
    const hasPersonRef = references.some(r => r.role === 'PESSOA');
    if (hasPersonInText && !hasPersonRef) {
      chips.push('+ Foto sua');
    }

    const hasProductInText = /(legion|console|notebook|laptop|celular|smartphone|mouse|teclado|fone|headset|hardware|pe[çc]a|produto|aparelho|switch|steam\s*deck)/i.test(combined);
    const hasProductRef = references.some(r => r.role === 'PRODUTO');
    if (hasProductInText && !hasProductRef) {
      const match = combined.match(/(legion\s*go|legion|steam\s*deck|switch|notebook|laptop|console|celular)/i);
      const name = match ? match[0] : 'produto';
      chips.push(`+ ${name.charAt(0).toUpperCase() + name.slice(1)}`);
    }

    const hasSceneInText = /(sof[aá]|quarto|sala|mesa|bancada|escrit[oó]rio|est[uú]dio|oficina|cen[aá]rio)/i.test(combined);
    const hasSceneRef = references.some(r => r.role === 'CENÁRIO');
    if (hasSceneInText && !hasSceneRef) {
      chips.push('+ Cenário');
    }

    const hasTargetInText = /(adapte|personagem|character|alvo|target|crimson|substitua|troque\s*o)/i.test(combined);
    const hasTargetRef = references.some(r => r.role === 'IMAGEM_ALVO' || r.isTarget);
    if (hasTargetInText && !hasTargetRef) {
      chips.push('+ Imagem-alvo');
    }

    return chips;
  }, [videoTitle, ideaDescription, references]);

  // Focus the exact-text field when the text panel opens
  useEffect(() => {
    if (showTextPanel && textTreatment !== 'SEM_TEXTO') {
      thumbTextRef.current?.focus();
    }
    // Only when the panel opens, not on every treatment change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTextPanel]);

  // Bring a fresh result into view
  useEffect(() => {
    if (result && scrollToResultRef.current) {
      scrollToResultRef.current = false;
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  const openFilePicker = () => fileInputRef.current?.click();

  // Handle image upload with auto-role detection
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const all = Array.from(files);
    const images = all.filter(file => file.type.startsWith('image/'));
    const skipped = all.length - images.length;

    images.forEach(file => {
      readAsDataUrl(file)
        .then(url => {
          const nameLower = file.name.toLowerCase();
          let role: SimpleReferenceRole = 'OUTRA';
          if (nameLower.includes('alvo') || nameLower.includes('target') || nameLower.includes('personagem') || nameLower.includes('character') || nameLower.includes('crimson')) {
            role = 'IMAGEM_ALVO';
          } else if (nameLower.includes('face') || nameLower.includes('rosto') || nameLower.includes('me') || nameLower.includes('eu')) {
            role = 'PESSOA';
            setPreserveFace(true);
          } else if (nameLower.includes('legion') || nameLower.includes('console') || nameLower.includes('produto') || nameLower.includes('phone') || nameLower.includes('hardware')) {
            role = 'PRODUTO';
            setPreserveProduct(true);
          } else if (nameLower.includes('sala') || nameLower.includes('quarto') || nameLower.includes('cenario') || nameLower.includes('room') || nameLower.includes('fundo') || nameLower.includes('desk')) {
            role = 'CENÁRIO';
          } else if (nameLower.includes('fonte') || nameLower.includes('font') || nameLower.includes('type') || nameLower.includes('texto')) {
            role = 'TIPOGRAFIA';
            setTextTreatment('USAR_REFERENCIA');
          }

          setReferences(prev => [
            ...prev,
            {
              id: `ref-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              name: file.name,
              url,
              role
            }
          ]);
        })
        .catch(() => onNotify(`Não foi possível ler ${file.name}.`));
    });

    if (images.length > 0) {
      const added = images.length === 1 ? '1 referência adicionada' : `${images.length} referências adicionadas`;
      onNotify(skipped > 0 ? `${added}. ${skipped} arquivo(s) ignorado(s): use apenas imagens.` : `${added}. Confira o papel de cada uma.`);
    } else if (skipped > 0) {
      onNotify('Nenhuma imagem encontrada. Use arquivos JPG, PNG ou WebP.');
    }
  };

  const startReplace = (id: string) => {
    replacingIdRef.current = id;
    replaceInputRef.current?.click();
  };

  // Replace the image of an existing reference, keeping its assigned role
  const handleReplaceFile = (files: FileList | null) => {
    const id = replacingIdRef.current;
    replacingIdRef.current = null;
    const file = files?.[0];
    if (!id || !file) return;
    if (!file.type.startsWith('image/')) {
      onNotify('Use um arquivo de imagem para substituir a referência.');
      return;
    }
    readAsDataUrl(file)
      .then(url => {
        setReferences(prev => prev.map(r => (r.id === id ? { ...r, url, name: file.name } : r)));
        onNotify('Imagem substituída. O papel da referência foi mantido.');
      })
      .catch(() => onNotify(`Não foi possível ler ${file.name}.`));
  };

  const handleRoleChange = (id: string, role: SimpleReferenceRole) => {
    setReferences(prev => {
      const updated = prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            role,
            scenarioMode: role === 'CENÁRIO' ? (r.scenarioMode || 'MEU_AMBIENTE') : r.scenarioMode
          };
        }
        return r;
      });
      if (role === 'PESSOA') setPreserveFace(true);
      if (role === 'PRODUTO') setPreserveProduct(true);
      if (role === 'TIPOGRAFIA') setTextTreatment('USAR_REFERENCIA');
      return updated;
    });
  };

  const handleScenarioModeChange = (id: string, scenarioMode: ScenarioInterpretation) => {
    setReferences(prev =>
      prev.map(r => (r.id === id ? { ...r, scenarioMode } : r))
    );
  };

  const handleRemoveRef = (id: string) => {
    setReferences(prev => prev.filter(r => r.id !== id));
  };

  // Compact "Referências" button: open the picker when empty, otherwise show the strip
  const handleReferencesButton = () => {
    referencesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (references.length === 0) {
      openFilePicker();
    } else {
      addReferenceRef.current?.focus({ preventScroll: true });
    }
  };

  // Generate thumbnail direction & prompt
  const handleGenerate = async (forcedApproachIndex?: number) => {
    if (inFlightRef.current) return;
    if (!videoTitle.trim() && !ideaDescription.trim()) {
      onNotify('Preencha ao menos o título do vídeo ou a descrição da sua ideia.');
      ideaRef.current?.focus();
      return;
    }

    const currentApproach = forcedApproachIndex !== undefined ? forcedApproachIndex : approachCount;
    inFlightRef.current = true;
    setIsLoading(true);

    try {
      const payload = {
        videoTitle,
        ideaDescription,
        thumbnailText: textTreatment === 'SEM_TEXTO' ? '' : thumbnailText,
        textTreatment,
        fontName: fontName.trim() || undefined,
        reserveSpaceForText,
        reservedSpacePosition,
        references,
        targetModel,
        aspectRatio,
        stylePreset,
        realismLevel,
        preserveFace: preserveFace || references.some(r => r.role === 'PESSOA'),
        preserveProduct: preserveProduct || references.some(r => r.role === 'PRODUTO'),
        extraInstructions,
        approachIndex: currentApproach
      };

      // The prompt engine only needs each reference's role and name, never its pixels.
      // Cloud AI off: no image leaves the browser. On: only smaller, metadata-free (EXIF-stripped)
      // copies are sent; the server withholds PESSOA photos from free models.
      const apiReferences = allowCloudAi
        ? await Promise.all(references.map(async r => ({ ...r, url: await prepareImageForUpload(r.url) })))
        : references.map(r => ({ ...r, url: '' }));
      const res = await fetch('/api/ai/simple-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, references: apiReferences, allowCloudAi })
      });

      let genResult: CreateThumbnailResult;

      if (res.ok) {
        const data = await res.json();
        genResult = {
          direction: data.direction,
          finalPrompt: data.finalPrompt,
          approachTitle: data.approachTitle || 'Direção Visual Gerada',
          approachIndex: currentApproach,
          typographyPlan: data.typographyPlan,
          outputMetadata: data.outputMetadata,
          modelNotes: data.modelNotes,
          aiAssist: data.aiAssist
        };
      } else {
        genResult = {
          ...generateSimpleThumbnail(payload),
          ...(allowCloudAi ? { aiAssist: { provider: 'none' as const, fallbackReason: 'server-error' } } : {})
        };
      }

      scrollToResultRef.current = true;
      setResult(genResult);

      saveSimpleHistoryItem({
        mode: 'CRIAR',
        title: videoTitle || ideaDescription.slice(0, 40) || 'Thumbnail Sem Título',
        previewSummary: genResult.direction.ideia,
        data: genResult
      });
      onRefreshHistoryCount();

      onNotify('Direção visual e prompt gerados com sucesso!');
    } catch {
      const fallback = generateSimpleThumbnail({
        videoTitle,
        ideaDescription,
        thumbnailText: textTreatment === 'SEM_TEXTO' ? '' : thumbnailText,
        textTreatment,
        fontName: fontName.trim() || undefined,
        reserveSpaceForText,
        reservedSpacePosition,
        references,
        targetModel,
        aspectRatio,
        stylePreset,
        realismLevel,
        preserveFace: preserveFace || references.some(r => r.role === 'PESSOA'),
        preserveProduct: preserveProduct || references.some(r => r.role === 'PRODUTO'),
        extraInstructions,
        approachIndex: currentApproach
      });
      scrollToResultRef.current = true;
      setResult(allowCloudAi ? { ...fallback, aiAssist: { provider: 'none', fallbackReason: 'network' } } : fallback);
      onNotify('Prompt gerado pelo motor local anti-slop.');
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  };

  const handleAnotherApproach = () => {
    if (inFlightRef.current) return;
    const nextApproach = approachCount + 1;
    setApproachCount(nextApproach);
    handleGenerate(nextApproach);
  };

  // Ctrl/Cmd + Enter submits from the title or the idea field
  const handleSubmitShortcut = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleCopyPrompt = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.finalPrompt);
    setCopied(true);
    onNotify('Prompt copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2500);
  };

  const ctaState: 'loading' | 'ready' | 'empty' = isLoading ? 'loading' : canGenerate ? 'ready' : 'empty';
  const AspectIcon = aspectRatio === '9:16' ? RectangleVertical : RectangleHorizontal;

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-2 sm:py-4">
      {/* 1. Título do vídeo */}
      <div className="space-y-3">
        <label htmlFor="create-title" className={fieldLabel}>
          Título do vídeo
        </label>
        <input
          id="create-title"
          type="text"
          value={videoTitle}
          onChange={e => setVideoTitle(e.target.value)}
          onKeyDown={handleSubmitShortcut}
          placeholder="Ex: Troquei o Windows do meu Legion Go"
          className={`${fieldSurface} h-14 px-5 text-base`}
        />
      </div>

      {/* 2. Ideia (focal point) */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="create-idea" className={fieldLabel}>
            O que você imagina?
          </label>
          <span className="hidden text-sm text-zinc-500 sm:inline">Descreva em linguagem natural</span>
        </div>
        <textarea
          id="create-idea"
          ref={ideaRef}
          rows={5}
          value={ideaDescription}
          onChange={e => setIdeaDescription(e.target.value)}
          onKeyDown={handleSubmitShortcut}
          placeholder={'Descreva sua thumbnail como falaria com uma pessoa...\nEx: o Legion Go ligado na minha mão, expressão autêntica, sem neon.'}
          className={`${fieldSurface} block min-h-[148px] resize-y px-5 py-4 text-base leading-relaxed`}
        />

        {contextualChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-500">Para ficar mais fiel:</span>
            {contextualChips.map(chip => (
              <button
                key={chip}
                type="button"
                onClick={openFilePicker}
                className={`h-8 rounded-lg border border-zinc-800 px-3 text-[13px] text-zinc-300 transition-colors hover:border-amber-500/50 hover:text-amber-200 ${focusRing}`}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Action row */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={handleReferencesButton}
              className={`${secondaryButton} ${secondaryIdle}`}
            >
              <Upload className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <span>Referências</span>
              {references.length > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-zinc-950">
                  {references.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowTextPanel(prev => !prev)}
              aria-expanded={showTextPanel}
              aria-controls="create-text-panel"
              className={`${secondaryButton} ${showTextPanel ? secondaryActive : secondaryIdle}`}
            >
              <Type className="h-4 w-4" aria-hidden="true" />
              <span>Texto</span>
              {thumbnailText.trim() && textTreatment !== 'SEM_TEXTO' && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-label="texto definido" />
              )}
            </button>

            <div className="relative">
              <AspectIcon
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <select
                value={aspectRatio}
                onChange={e => setAspectRatio(e.target.value as '16:9' | '9:16')}
                aria-label="Formato da thumbnail"
                className={`${secondaryButton} ${secondaryIdle} w-full appearance-none bg-transparent pl-10 pr-9 [&>option]:bg-zinc-900`}
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(prev => !prev)}
              aria-expanded={showAdvanced}
              aria-controls="create-advanced-panel"
              className={`${secondaryButton} ${showAdvanced ? secondaryActive : secondaryIdle}`}
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              <span>Avançado</span>
            </button>
          </div>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={ctaState !== 'ready'}
            aria-busy={ctaState === 'loading'}
            title={ctaState === 'empty' ? 'Preencha o título ou descreva a ideia' : 'Gerar (Ctrl + Enter)'}
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
                <span>Gerando...</span>
              </>
            ) : (
              <>
                <WandSparkles className="h-4 w-4" aria-hidden="true" />
                <span>Gerar thumbnail prompt</span>
              </>
            )}
          </button>
        </div>

        {/* Text panel */}
        {showTextPanel && (
          <div id="create-text-panel" className={`${panelSurface} space-y-5`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className={fieldLabel}>Texto na thumbnail</span>
              <div role="radiogroup" aria-label="Tratamento do texto" className="inline-flex w-full gap-1 rounded-xl border border-zinc-800 bg-[#111216] p-1 sm:w-auto">
                {TEXT_TREATMENTS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={textTreatment === option.id}
                    onClick={() => setTextTreatment(option.id)}
                    className={`flex-1 sm:flex-initial ${segmentClass(textTreatment === option.id)}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {textTreatment !== 'SEM_TEXTO' && (
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <div className="space-y-2">
                  <label htmlFor="create-thumb-text" className={subLabel}>
                    Texto exato
                  </label>
                  <input
                    id="create-thumb-text"
                    ref={thumbTextRef}
                    type="text"
                    value={thumbnailText}
                    onChange={e => setThumbnailText(e.target.value)}
                    placeholder="Ex: AGORA FUNCIONA"
                    className={smallField}
                  />
                  <p className="text-xs text-zinc-500">Usado exatamente como você escrever, sem palavras extras.</p>
                  {textWords > 4 && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {textWords} palavras: textos longos perdem impacto em telas mobile.
                    </p>
                  )}
                  {isTitleRepeatedInThumbnailText && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Seu texto está repetindo o título. Talvez a imagem possa entregar essa informação sozinha.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="create-font" className={subLabel}>
                    Fonte <span className="text-zinc-600">(opcional)</span>
                  </label>
                  <input
                    id="create-font"
                    type="text"
                    value={fontName}
                    onChange={e => setFontName(e.target.value)}
                    placeholder="Ex: Bebas Neue, Anton"
                    className={smallField}
                  />
                </div>
              </div>
            )}

            {textTreatment !== 'SEM_TEXTO' && (
              <p className="flex items-start gap-2 text-xs text-zinc-500">
                <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Para máxima fidelidade tipográfica, gere a imagem sem texto e aplique a fonte depois no editor.
              </p>
            )}

            <div className="flex flex-col gap-3 border-t border-zinc-800/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={reserveSpaceForText}
                  onChange={e => setReserveSpaceForText(e.target.checked)}
                  className="h-4 w-4 rounded accent-amber-500"
                />
                Reservar espaço limpo para texto
              </label>
              {reserveSpaceForText && (
                <div role="radiogroup" aria-label="Posição do espaço reservado" className="grid grid-cols-4 gap-1 rounded-xl border border-zinc-800 bg-[#111216] p-1 sm:inline-flex">
                  {RESERVED_POSITIONS.map(pos => (
                    <button
                      key={pos.id}
                      type="button"
                      role="radio"
                      aria-checked={reservedSpacePosition === pos.id}
                      onClick={() => setReservedSpacePosition(pos.id)}
                      className={segmentClass(reservedSpacePosition === pos.id)}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Advanced panel */}
        {showAdvanced && (
          <div id="create-advanced-panel" className={`${panelSurface} space-y-5`}>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="create-model" className={subLabel}>
                  Modelo alvo do prompt
                </label>
                <select
                  id="create-model"
                  value={normalizeTargetModel(targetModel)}
                  onChange={e => setTargetModel(normalizeTargetModel(e.target.value as TargetModel))}
                  className={smallField}
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

              <div className="space-y-2">
                <label htmlFor="create-style" className={subLabel}>
                  Estilo visual
                </label>
                <select
                  id="create-style"
                  value={stylePreset}
                  onChange={e => setStylePreset(e.target.value as 'Natural' | 'Cinematográfico' | 'Editorial' | 'Fotojornalismo')}
                  className={smallField}
                >
                  <option value="Natural">Natural / Iluminação Real (Padrão)</option>
                  <option value="Cinematográfico">Cinematográfico</option>
                  <option value="Editorial">Editorial / Revista</option>
                  <option value="Fotojornalismo">Fotojornalismo Documental</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="create-realism" className={subLabel}>
                  Nível de realismo
                </label>
                <select
                  id="create-realism"
                  value={realismLevel}
                  onChange={e => setRealismLevel(e.target.value as 'Alto' | 'Estilizado')}
                  className={smallField}
                >
                  <option value="Alto">Alto / Fotográfico Real</option>
                  <option value="Estilizado">Estilizado</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={preserveFace}
                  onChange={e => setPreserveFace(e.target.checked)}
                  className="h-4 w-4 rounded accent-amber-500"
                />
                Preservar traços de rosto (sem pele plástica)
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={preserveProduct}
                  onChange={e => setPreserveProduct(e.target.checked)}
                  className="h-4 w-4 rounded accent-amber-500"
                />
                Preservar integridade física do produto/hardware
              </label>
            </div>

            <div className="space-y-2">
              <label htmlFor="create-extra" className={subLabel}>
                Instruções extras de direção
              </label>
              <input
                id="create-extra"
                type="text"
                value={extraInstructions}
                onChange={e => setExtraInstructions(e.target.value)}
                placeholder="Ex: fundo um pouco mais escuro para destacar o contorno do aparelho"
                className={smallField}
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Referências (single upload flow: picker + drag-and-drop) */}
      <section
        ref={referencesSectionRef}
        aria-labelledby="create-refs-heading"
        className="scroll-mt-28 space-y-3"
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={e => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false);
        }}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 id="create-refs-heading" className={fieldLabel}>
            Referências
          </h3>
          <span className="w-full text-sm text-zinc-500 sm:w-auto">
            <span aria-hidden="true" className="mr-3 hidden text-zinc-600 sm:inline">•</span>
            Quanto mais você mostrar, menos a IA precisa inventar.
          </span>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/*"
          className="hidden"
          onChange={e => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          type="file"
          ref={replaceInputRef}
          accept="image/*"
          className="hidden"
          onChange={e => {
            handleReplaceFile(e.target.files);
            e.target.value = '';
          }}
        />

        {references.length === 0 ? (
          <button
            ref={addReferenceRef}
            type="button"
            onClick={openFilePicker}
            className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-colors ${focusRing} ${
              isDragging
                ? 'border-amber-500 bg-amber-500/5'
                : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/40'
            }`}
          >
            <Upload className={`h-6 w-6 ${isDragging ? 'text-amber-400' : 'text-zinc-400'}`} aria-hidden="true" />
            <span className="text-base font-semibold text-zinc-100">
              {isDragging ? 'Solte para adicionar' : 'Adicionar referência'}
            </span>
            <span className="text-sm text-zinc-500">
              Ou arraste fotos aqui (rosto, produto, cenário, estilo ou tipografia)
            </span>
          </button>
        ) : (
          <div
            className={`grid grid-cols-2 gap-3 rounded-xl transition-colors md:grid-cols-3 lg:grid-cols-4 ${
              isDragging ? 'outline-dashed outline-1 outline-offset-4 outline-amber-500' : ''
            }`}
          >
            {references.map(ref => (
              <div key={ref.id} className="flex flex-col gap-2.5 rounded-xl border border-zinc-800 bg-[#111216] p-2.5">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ref.url} alt={ref.name} className="h-full w-full object-cover" />
                  <div className="absolute right-1.5 top-1.5 flex gap-1">
                    <button
                      type="button"
                      onClick={() => startReplace(ref.id)}
                      aria-label={`Trocar imagem de ${ref.name}`}
                      title="Trocar imagem (mantém o papel)"
                      className={`grid h-8 w-8 place-items-center rounded-lg bg-zinc-950/80 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-50 ${focusRing}`}
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveRef(ref.id)}
                      aria-label={`Remover ${ref.name}`}
                      title="Remover referência"
                      className={`grid h-8 w-8 place-items-center rounded-lg bg-zinc-950/80 text-zinc-300 transition-colors hover:bg-rose-500/80 hover:text-zinc-50 ${focusRing}`}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <span className="truncate text-xs text-zinc-400" title={ref.name}>
                  {ref.name}
                </span>

                <div className="relative">
                  <select
                    value={ref.role}
                    onChange={e => handleRoleChange(ref.id, e.target.value as SimpleReferenceRole)}
                    aria-label={`Papel da referência ${ref.name}`}
                    className={`h-9 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950 pl-3 pr-8 text-[13px] font-semibold text-amber-300 transition-colors hover:border-zinc-700 focus:border-amber-500/70 focus:outline-none [&>option]:text-zinc-200`}
                  >
                    {ALL_ROLES.map(role => (
                      <option key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
                    aria-hidden="true"
                  />
                </div>

                {ref.role === 'CENÁRIO' ? (
                  <div className="space-y-1.5">
                    <div role="radiogroup" aria-label="Uso do cenário" className="grid grid-cols-2 gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                      {(
                        [
                          ['MEU_AMBIENTE', 'Meu ambiente'],
                          ['REFERENCIA_AMBIENTE', 'Referência']
                        ] as [ScenarioInterpretation, string][]
                      ).map(([mode, label]) => {
                        const selected = (ref.scenarioMode || 'MEU_AMBIENTE') === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => handleScenarioModeChange(ref.id, mode)}
                            className={`min-h-7 rounded-md px-1 py-1 text-[11px] font-semibold leading-tight transition-colors ${focusRing} ${
                              selected ? 'bg-zinc-700 text-zinc-50' : 'text-zinc-400 hover:text-zinc-100'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] leading-snug text-zinc-500">
                      {ref.scenarioMode === 'REFERENCIA_AMBIENTE'
                        ? 'Apenas atmosfera, não copia layout.'
                        : 'Preserva layout e elementos deste local.'}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] leading-snug text-zinc-500">{ROLE_MICROCOPY[ref.role]}</p>
                )}
              </div>
            ))}

            <button
              ref={addReferenceRef}
              type="button"
              onClick={openFilePicker}
              className={`flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900/40 hover:text-zinc-100 ${focusRing}`}
            >
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
              Adicionar imagem
            </button>
          </div>
        )}
      </section>

      {/* 5. Resultado */}
      {result && (
        <div ref={resultRef} className="scroll-mt-28 space-y-6 border-t border-zinc-800/80 pt-8">
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* Direção visual */}
            <div className="space-y-4 lg:col-span-5">
              <div className={`${panelSurface} space-y-4`}>
                <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                  <h3 className={fieldLabel}>Direção visual</h3>
                  <span className="truncate text-xs text-zinc-500">{result.approachTitle}</span>
                </div>

                <dl className="space-y-4">
                  {(
                    [
                      ['Ideia', result.direction.ideia],
                      ['Foco', result.direction.foco],
                      ['Composição', result.direction.composicao],
                      ['Expressão', result.direction.expressao],
                      ['Visual & luz', result.direction.visual]
                    ] as [string, string][]
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-500">{label}</dt>
                      <dd className="text-sm leading-relaxed text-zinc-200">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {result.typographyPlan && (
                <div className={`${panelSurface} space-y-2`}>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-500">
                    Plano de tipografia
                  </span>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">{result.typographyPlan}</p>
                </div>
              )}
            </div>

            {/* Prompt final */}
            <div className="space-y-4 lg:col-span-7">
              <div className={`${panelSurface} space-y-4`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <span className={fieldLabel}>Prompt final (English)</span>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-sm text-zinc-400">
                        Pronto para colar no{' '}
                        {normalizeTargetModel(targetModel) === 'GERAL'
                          ? 'Midjourney, FLUX ou seu gerador preferido'
                          : TARGET_MODEL_CONFIGS[normalizeTargetModel(targetModel)]?.displayName || targetModel}
                      </p>
                      {result.outputMetadata && (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 font-mono text-[11px] text-zinc-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                          {result.outputMetadata.modelId} · {result.outputMetadata.aspectRatioHint}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      Fonte: motor anti-slop determinístico
                      {result.aiAssist?.provider === 'workers-ai'
                        ? (result.aiAssist.referencesChecked || 0) > 0
                          ? ` · ${result.aiAssist.referencesChecked} referência(s) conferida(s) por IA na nuvem gratuita${result.aiAssist.findings ? '' : ' (sem observações)'}. Built with Llama.`
                          : ` · IA na nuvem não conferiu as referências${result.aiAssist.fallbackReason ? ` (${describeAiFallback(result.aiAssist.fallbackReason)})` : ''}.`
                        : result.aiAssist?.provider === 'openai' || result.aiAssist?.provider === 'gemini'
                          ? ' · referências analisadas pela IA configurada no servidor.'
                          : result.aiAssist?.fallbackReason
                            ? ` (sem IA: ${describeAiFallback(result.aiAssist.fallbackReason)}).`
                            : ' (sem IA).'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-bold uppercase tracking-[0.06em] text-zinc-950 transition-colors hover:bg-amber-400 active:bg-amber-600 ${focusRing}`}
                  >
                    {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                <div className="max-h-[28rem] select-all overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-800/80 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-200 sm:p-5">
                  {result.finalPrompt}
                </div>

                {result.modelNotes && result.modelNotes.length > 0 && (
                  <div className="space-y-2 rounded-lg border border-zinc-800 p-4">
                    <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-300">
                      <Info className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                      Antes de gerar (não faz parte do prompt)
                    </span>
                    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-400">
                      {result.modelNotes.map(note => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pb-4 text-center">
            <button
              type="button"
              onClick={handleAnotherApproach}
              disabled={isLoading}
              className={`${secondaryButton} ${secondaryIdle}`}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Gerar outra abordagem visual</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
