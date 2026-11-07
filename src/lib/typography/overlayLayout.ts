/**
 * Pure geometry for the typography overlay. Positions are percentages of the image so the same
 * layout works at any resolution; the text box is always kept fully inside the image.
 */
export interface OverlaySpec {
  text: string;
  /** Font size as a percentage of the image height (2 to 30). */
  sizePct: number;
  /** Centre of the text box, percentages of the image width / height (0 to 100). */
  xPct: number;
  yPct: number;
  /** Outline width as a percentage of the font size (0 to 6). 0 = no outline. */
  outlinePct: number;
}

export const SIZE_RANGE = { min: 2, max: 30 } as const;
export const OUTLINE_RANGE = { min: 0, max: 6 } as const;

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function normalizeSpec(spec: OverlaySpec): OverlaySpec {
  return {
    text: spec.text,
    sizePct: clamp(spec.sizePct, SIZE_RANGE.min, SIZE_RANGE.max),
    xPct: clamp(spec.xPct, 0, 100),
    yPct: clamp(spec.yPct, 0, 100),
    outlinePct: clamp(spec.outlinePct, OUTLINE_RANGE.min, OUTLINE_RANGE.max),
  };
}

/** Font size in image pixels. Never below 8 px so a tiny slider value still draws something. */
export function overlayFontPx(imageHeight: number, sizePct: number): number {
  return Math.max(8, Math.round((imageHeight * clamp(sizePct, SIZE_RANGE.min, SIZE_RANGE.max)) / 100));
}

/** Outline width in image pixels (stroke is centred on the glyph edge, so the visible ring is half). */
export function outlineWidthPx(fontPx: number, outlinePct: number): number {
  return Math.round((fontPx * clamp(outlinePct, OUTLINE_RANGE.min, OUTLINE_RANGE.max)) / 100 * 10) / 10;
}

export interface Placement {
  /** Top-left corner of the text box, in image pixels. */
  x: number;
  y: number;
  /** True when the box was moved to stay inside the image. */
  moved: boolean;
  /** True when the text is wider or taller than the image: it cannot fit without clipping. */
  tooLarge: boolean;
}

/** Centres the box on (xPct, yPct) and clamps it inside the image with a 2% margin. */
export function placeText(imgW: number, imgH: number, textW: number, textH: number, xPct: number, yPct: number): Placement {
  const margin = Math.round(Math.min(imgW, imgH) * 0.02);
  const wantedX = (clamp(xPct, 0, 100) / 100) * imgW - textW / 2;
  const wantedY = (clamp(yPct, 0, 100) / 100) * imgH - textH / 2;
  const maxX = imgW - textW - margin;
  const maxY = imgH - textH - margin;
  const tooLarge = textW + 2 * margin > imgW || textH + 2 * margin > imgH;
  const x = tooLarge ? Math.round((imgW - textW) / 2) : Math.round(clamp(wantedX, margin, Math.max(margin, maxX)));
  const y = tooLarge ? Math.round((imgH - textH) / 2) : Math.round(clamp(wantedY, margin, Math.max(margin, maxY)));
  return { x, y, moved: Math.abs(x - wantedX) > 0.5 || Math.abs(y - wantedY) > 0.5, tooLarge };
}

/** Human-readable warnings for the editor (empty text, text larger than the image). */
export function overlayWarnings(spec: OverlaySpec, placement: Placement | null): string[] {
  const warnings: string[] = [];
  if (!spec.text.trim()) warnings.push('Digite o texto exato que vai na thumbnail.');
  if (placement?.tooLarge) warnings.push('O texto é maior que a imagem: reduza o tamanho para que ele não seja cortado.');
  return warnings;
}
