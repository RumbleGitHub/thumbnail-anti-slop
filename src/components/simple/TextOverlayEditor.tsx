'use client';

import React, { useEffect, useRef, useState } from 'react';
import { REAL_FONTS, fontById } from '@/lib/typography/fonts';
import {
  OUTLINE_RANGE,
  SIZE_RANGE,
  normalizeSpec,
  outlineWidthPx,
  overlayFontPx,
  overlayWarnings,
  placeText,
  type OverlaySpec,
  type Placement
} from '@/lib/typography/overlayLayout';
import { fieldLabel, focusRing, panelSurface, segmentClass, smallField, subLabel } from './ui';

const DEFAULT_SPEC: OverlaySpec = { text: '', sizePct: 9, xPct: 50, yPct: 84, outlinePct: 1.5 };

// The five OFL fonts are registered once, from public/fonts. Until they load, the canvas draws with a
// system fallback and is redrawn; the status line says which font is really in use.
let fontsPromise: Promise<void> | null = null;
function loadRealFonts(): Promise<void> {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      if (typeof FontFace === 'undefined' || typeof document === 'undefined') return;
      await Promise.all(
        REAL_FONTS.map(async f => {
          try {
            const face = new FontFace(f.family, `url(${f.file})`, { weight: String(f.weight) });
            await face.load();
            document.fonts.add(face);
          } catch {
            // Keeps the fallback; the status line reports it.
          }
        })
      );
    })();
  }
  return fontsPromise;
}

function isFontReady(family: string, weight: number): boolean {
  try {
    return typeof document !== 'undefined' && document.fonts.check(`${weight} 20px "${family}"`);
  } catch {
    return false;
  }
}

/**
 * Minimal real-font overlay: the image is drawn at its native resolution, the exact text is drawn on top
 * with a real font, and the result is exported as PNG. Nothing already in the image is erased.
 */
export function TextOverlayEditor({ src, onNotify }: { src: string; onNotify?: (msg: string) => void }) {
  const [spec, setSpec] = useState<OverlaySpec>(DEFAULT_SPEC);
  const [fontId, setFontId] = useState<string>('anton');
  const [color, setColor] = useState('#ffffff');
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [fontsTick, setFontsTick] = useState(0);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load the image (keeps its own resolution; no re-encoding happens here).
  useEffect(() => {
    let alive = true;
    const el = new Image();
    el.onload = () => {
      if (alive) setImg(el);
    };
    el.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  // Register the real fonts, then redraw once they are available.
  useEffect(() => {
    let alive = true;
    loadRealFonts().then(() => {
      if (alive) setFontsTick(t => t + 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  const font = fontById(fontId);
  const fontReady = isFontReady(font.family, font.weight);

  // Draws the complete composition: original image, then the text layer. Used for the preview and the export.
  const drawInto = (canvas: HTMLCanvasElement): Placement | null => {
    if (!img) return null;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const s = normalizeSpec(spec);
    if (!s.text) return null;
    const f = fontById(fontId);
    const px = overlayFontPx(canvas.height, s.sizePct);
    ctx.font = `${f.weight} ${px}px "${f.family}", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText(s.text);
    const ascent = m.actualBoundingBoxAscent || px * 0.8;
    const descent = m.actualBoundingBoxDescent || px * 0.2;
    const width = Math.ceil(m.width);
    const height = Math.ceil(ascent + descent);
    const p = placeText(canvas.width, canvas.height, width, height, s.xPct, s.yPct);
    const baseline = p.y + ascent;

    const stroke = outlineWidthPx(px, s.outlinePct);
    if (stroke > 0) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke * 2; // stroke is centred on the glyph edge: half of it sits outside
      ctx.strokeStyle = '#000000';
      ctx.strokeText(s.text, p.x, baseline);
    }
    ctx.fillStyle = color;
    ctx.fillText(s.text, p.x, baseline);
    return p;
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    setPlacement(drawInto(canvasRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, spec, fontId, color, fontsTick]);

  const warnings = overlayWarnings(spec, placement);

  const exportPng = async () => {
    if (!img || !spec.text.trim()) return;
    await loadRealFonts();
    const out = document.createElement('canvas');
    drawInto(out);
    out.toBlob(blob => {
      if (!blob) {
        onNotify?.('Não foi possível gerar o PNG.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'thumbnail-texto-real.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onNotify?.('PNG exportado com a fonte real.');
    }, 'image/png');
  };

  const range = 'h-11 w-full accent-amber-500 cursor-pointer';

  return (
    <div className={`${panelSurface} space-y-5`}>
      <div className="space-y-1">
        <p className={fieldLabel}>Adicionar texto com fonte real</p>
        <p className="text-xs leading-relaxed text-zinc-500">
          A imagem original não é alterada. O texto é desenhado por cima, com uma das fontes instaladas.
          Se a imagem já tem letras feitas pela IA, elas continuam lá: use uma versão limpa da imagem.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <canvas
            ref={canvasRef}
            aria-label="Pré-visualização da thumbnail com texto"
            className="block h-auto max-h-[70vh] w-full rounded-lg border border-zinc-800 bg-zinc-950 object-contain"
          />
          <p className="mt-2 text-xs text-zinc-500" aria-live="polite">
            {fontReady ? `Fonte em uso: ${font.label}.` : `Carregando a fonte ${font.label}; a prévia usa uma reserva até carregar.`}
          </p>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            <label htmlFor="overlay-text" className={subLabel}>Texto exato</label>
            <input
              id="overlay-text"
              type="text"
              value={spec.text}
              placeholder="Ex: VALE A PENA?"
              onChange={e => setSpec(s => ({ ...s, text: e.target.value }))}
              className={`${smallField} h-11`}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="space-y-2">
            <span className={subLabel}>Fonte</span>
            <div role="radiogroup" aria-label="Fonte" className="grid grid-cols-2 gap-1.5">
              {REAL_FONTS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={fontId === f.id}
                  onClick={() => setFontId(f.id)}
                  style={{ fontFamily: `"${f.family}", sans-serif`, fontWeight: f.weight }}
                  className={`${segmentClass(fontId === f.id)} h-11 text-left text-[15px] leading-none`}
                  title={f.use}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="overlay-size" className={subLabel}>Tamanho: {spec.sizePct.toFixed(1)}% da altura</label>
            <input
              id="overlay-size"
              type="range"
              className={range}
              min={SIZE_RANGE.min}
              max={SIZE_RANGE.max}
              step={0.5}
              value={spec.sizePct}
              onChange={e => setSpec(s => ({ ...s, sizePct: Number(e.target.value) }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="overlay-x" className={subLabel}>Horizontal</label>
              <input id="overlay-x" type="range" className={range} min={0} max={100} step={1} value={spec.xPct}
                onChange={e => setSpec(s => ({ ...s, xPct: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <label htmlFor="overlay-y" className={subLabel}>Vertical</label>
              <input id="overlay-y" type="range" className={range} min={0} max={100} step={1} value={spec.yPct}
                onChange={e => setSpec(s => ({ ...s, yPct: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="overlay-color" className={subLabel}>Cor</label>
              <input id="overlay-color" type="color" value={color} onChange={e => setColor(e.target.value)}
                className={`h-11 w-full cursor-pointer rounded-xl border border-zinc-800 bg-[#111216] p-1 ${focusRing}`} />
            </div>
            <div className="space-y-1">
              <label htmlFor="overlay-outline" className={subLabel}>Contorno: {spec.outlinePct.toFixed(1)}</label>
              <input id="overlay-outline" type="range" className={range} min={OUTLINE_RANGE.min} max={OUTLINE_RANGE.max} step={0.5}
                value={spec.outlinePct} onChange={e => setSpec(s => ({ ...s, outlinePct: Number(e.target.value) }))} />
            </div>
          </div>

          {warnings.length > 0 && (
            <ul className="space-y-1 text-xs text-amber-300" role="status">
              {warnings.map(w => <li key={w}>{w}</li>)}
            </ul>
          )}

          <button
            type="button"
            onClick={exportPng}
            disabled={!spec.text.trim() || !img}
            className={`inline-flex h-11 w-full items-center justify-center rounded-xl bg-amber-500 px-5 text-sm font-bold uppercase tracking-[0.06em] text-zinc-950 transition-colors hover:bg-amber-400 disabled:pointer-events-none disabled:opacity-40 ${focusRing}`}
          >
            Baixar PNG
          </button>
        </div>
      </div>
    </div>
  );
}
