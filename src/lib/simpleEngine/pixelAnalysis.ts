/**
 * Local, deterministic image inspection for ANALYZE.
 *
 * Runs on pixels the browser already has (canvas): nothing is uploaded, nothing is paid. The image
 * is measured at feed scale (about 160x90, close to the 120px mobile thumbnail), so readability
 * findings reflect what a viewer actually sees.
 *
 * These are heuristics over measured numbers (contrast, exposure, saturation, neon share, edge
 * density, center focus), not a model's opinion. Each finding names the number it comes from.
 */
import type { AnalyzeThumbnailSimpleResult } from '../../types/simple.ts';

export interface ImageMetrics {
  width: number;
  height: number;
  /** Mean luminance 0..1 */
  meanLuma: number;
  /** Std deviation of luminance 0..1 (global contrast) */
  lumaStd: number;
  /** Share of pixels with luma >= 0.97 (clipped highlights) */
  clippedHighlights: number;
  /** Of the clipped pixels, the share sitting in flat areas (a plain white studio background, not HDR) */
  clippedFlatShare: number;
  /** Share of pixels with luma <= 0.03 (crushed shadows) */
  crushedShadows: number;
  /** Mean HSV saturation 0..1 */
  meanSaturation: number;
  /** Share of saturated, bright purple/magenta/cyan pixels (typical "gaming neon" wash) */
  neonShare: number;
  /** Hasler–Süsstrunk colorfulness */
  colorfulness: number;
  /** Share of pixels with a strong luminance gradient (visual busyness) */
  edgeDensity: number;
  /** Edge density in the central 50% area divided by the outer ring (>1 = a central focal subject) */
  centerFocus: number;
}

/** Computes metrics from RGBA bytes (canvas ImageData), typically downscaled to ~160x90. */
export function computeImageMetrics(data: ArrayLike<number>, width: number, height: number): ImageMetrics {
  const n = width * height;
  const luma = new Float32Array(n);
  let sumL = 0, sumL2 = 0, clippedHi = 0, crushed = 0, sumS = 0, neon = 0;
  let sumRG = 0, sumRG2 = 0, sumYB = 0, sumYB2 = 0;

  for (let i = 0; i < n; i++) {
    const r = data[i * 4] / 255, g = data[i * 4 + 1] / 255, b = data[i * 4 + 2] / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    luma[i] = l;
    sumL += l; sumL2 += l * l;
    if (l >= 0.97) clippedHi++;
    if (l <= 0.03) crushed++;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const s = max === 0 ? 0 : (max - min) / max;
    sumS += s;
    if (s > 0.55 && max > 0.55) {
      // Hue in degrees.
      let h = 0;
      const d = max - min;
      if (d > 0) {
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h = (h * 60 + 360) % 360;
      }
      // Magenta/purple/violet (260-330) and electric cyan (175-200).
      if ((h >= 260 && h <= 330) || (h >= 175 && h <= 200)) neon++;
    }
    const rg = (r - g) * 255, yb = (0.5 * (r + g) - b) * 255;
    sumRG += rg; sumRG2 += rg * rg; sumYB += yb; sumYB2 += yb * yb;
  }

  const meanL = sumL / n;
  const stdL = Math.sqrt(Math.max(0, sumL2 / n - meanL * meanL));
  const mRG = sumRG / n, mYB = sumYB / n;
  const sRG = Math.sqrt(Math.max(0, sumRG2 / n - mRG * mRG));
  const sYB = Math.sqrt(Math.max(0, sumYB2 / n - mYB * mYB));
  const colorfulness = Math.sqrt(sRG * sRG + sYB * sYB) + 0.3 * Math.sqrt(mRG * mRG + mYB * mYB);

  // Sobel-like gradient magnitude on luma.
  let edges = 0, centerEdges = 0, centerPx = 0, outerEdges = 0, outerPx = 0, clippedFlat = 0, clippedInner = 0;
  const x0 = Math.floor(width * 0.25), x1 = Math.ceil(width * 0.75);
  const y0 = Math.floor(height * 0.25), y1 = Math.ceil(height * 0.75);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx = luma[i + 1] - luma[i - 1];
      const gy = luma[i + width] - luma[i - width];
      const grad = Math.sqrt(gx * gx + gy * gy);
      const strong = grad > 0.12;
      if (luma[i] >= 0.97) {
        clippedInner++;
        if (grad < 0.02) clippedFlat++;
      }
      const central = x >= x0 && x < x1 && y >= y0 && y < y1;
      if (central) centerPx++; else outerPx++;
      if (strong) {
        edges++;
        if (central) centerEdges++; else outerEdges++;
      }
    }
  }
  const inner = Math.max(1, (width - 2) * (height - 2));
  const centerDensity = centerPx ? centerEdges / centerPx : 0;
  const outerDensity = outerPx ? outerEdges / outerPx : 0;

  const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
  return {
    width,
    height,
    meanLuma: round(meanL),
    lumaStd: round(stdL),
    clippedHighlights: round(clippedHi / n),
    clippedFlatShare: round(clippedInner ? clippedFlat / clippedInner : 0),
    crushedShadows: round(crushed / n),
    meanSaturation: round(sumS / n),
    neonShare: round(neon / n),
    colorfulness: round(colorfulness, 1),
    edgeDensity: round(edges / inner),
    centerFocus: round(outerDensity === 0 ? (centerDensity > 0 ? 3 : 1) : centerDensity / outerDensity, 2),
  };
}

export interface MetricFinding {
  kind: 'good' | 'issue';
  severity: number; // higher = more important (for strengths: display priority)
  text: string;
  fix?: string;
  avoid?: string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Turns measurements into findings; each one cites the number it is based on. */
export function findingsFromMetrics(m: ImageMetrics): MetricFinding[] {
  const f: MetricFinding[] = [];

  if (m.neonShare >= 0.12) {
    f.push({ kind: 'issue', severity: 9, text: `Banho de neon roxo/ciano em ${pct(m.neonShare)} da imagem, o visual "gamer genérico" que denuncia IA.`, fix: 'Replace the purple/cyan neon wash with motivated natural light; keep saturated color only on the subject.', avoid: 'neon wash, purple-cyan glow' });
  }
  if (m.lumaStd < 0.12) {
    f.push({ kind: 'issue', severity: 8, text: `Contraste baixo (desvio de luminância ${m.lumaStd}): a imagem some no feed em 120px.`, fix: 'Increase subject-to-background tonal separation with a motivated key light and a darker, calmer background.', avoid: 'flat low-contrast lighting' });
  } else if (m.lumaStd >= 0.2) {
    f.push({ kind: 'good', severity: 2, text: `Bom contraste global (desvio de luminância ${m.lumaStd}) para leitura em tamanho pequeno.` });
  }
  if (m.clippedHighlights > 0.08 && m.clippedFlatShare >= 0.8) {
    // A plain white background (product shot), not HDR: real risk is blending into YouTube's light theme.
    f.push({ kind: 'issue', severity: 3, text: `Fundo branco liso em ${pct(m.clippedHighlights)} da imagem: ok para produto, mas a thumbnail se mistura ao tema claro do YouTube.`, fix: 'Replace the plain white background with a light grey or tinted backdrop so the thumbnail edge stays visible on a white page.', avoid: 'pure white background' });
  } else if (m.clippedHighlights > 0.08) {
    f.push({ kind: 'issue', severity: 6, text: `Realces estourados em ${pct(m.clippedHighlights)} dos pixels dentro das áreas com detalhe: perde textura e parece HDR artificial.`, fix: 'Recover blown highlights; keep specular highlights small and physically placed.', avoid: 'blown highlights, overprocessed HDR' });
  }
  if (m.crushedShadows > 0.2) {
    f.push({ kind: 'issue', severity: 5, text: `Sombras esmagadas em ${pct(m.crushedShadows)} da imagem: detalhes somem no preto.`, fix: 'Lift crushed shadows slightly so dark areas keep readable shapes.', avoid: 'crushed blacks' });
  }
  if (m.meanSaturation > 0.6) {
    f.push({ kind: 'issue', severity: 7, text: `Saturação média muito alta (${pct(m.meanSaturation)}): cores competem com o assunto.`, fix: 'Reduce global saturation; keep one accent color on the subject.', avoid: 'oversaturated colors' });
  } else if (m.colorfulness < 12) {
    f.push({ kind: 'issue', severity: 4, text: `Cores muito apagadas (colorfulness ${m.colorfulness}): pouca energia visual no feed.`, fix: 'Add one deliberate accent color on the subject or background.', avoid: 'washed-out grey palette' });
  } else {
    f.push({ kind: 'good', severity: 1, text: `Paleta controlada (saturação média ${pct(m.meanSaturation)}), sem cores brigando entre si.` });
  }
  if (m.edgeDensity > 0.28) {
    f.push({ kind: 'issue', severity: 7, text: `Imagem muito carregada (${pct(m.edgeDensity)} de bordas fortes): em 120px vira ruído.`, fix: 'Remove secondary elements and simplify the background so one subject reads instantly.', avoid: 'visual clutter, too many focal points' });
  } else if (m.edgeDensity < 0.03) {
    f.push({ kind: 'issue', severity: 3, text: `Quase sem detalhes (${pct(m.edgeDensity)} de bordas): falta um assunto definido.`, fix: 'Introduce a clear hero subject with a defined silhouette.', avoid: 'empty composition' });
  } else {
    f.push({ kind: 'good', severity: 1, text: `Quantidade de detalhes equilibrada (${pct(m.edgeDensity)} de bordas fortes).` });
  }
  if (m.edgeDensity >= 0.03) {
    if (m.centerFocus < 0.9) {
      f.push({ kind: 'issue', severity: 6, text: `Foco disperso: o centro tem menos detalhe que as bordas (razão ${m.centerFocus}), sem ponto focal claro.`, fix: 'Bring the hero subject larger and closer to the focal area; calm the edges of the frame.', avoid: 'subject lost at the edges' });
    } else if (m.centerFocus >= 1.3) {
      f.push({ kind: 'good', severity: 3, text: `Ponto focal claro: o centro concentra ${m.centerFocus}x mais detalhe que as bordas.` });
    }
  }
  return f;
}

/** Full ANALYZE result from local measurements only (no AI, nothing uploaded). */
export function analyzeFromMetrics(m: ImageMetrics): AnalyzeThumbnailSimpleResult {
  const findings = findingsFromMetrics(m);
  const issues = findings.filter(x => x.kind === 'issue').sort((a, b) => b.severity - a.severity);
  const good = findings.filter(x => x.kind === 'good').sort((a, b) => b.severity - a.severity);
  const top = issues[0];

  const change = issues.slice(0, 3).map((x, i) => `${i + 1}. ${x.fix}`);
  const avoid = issues.map(x => x.avoid).filter(Boolean);

  return {
    functioning: good.length > 0 ? good.slice(0, 3).map(x => x.text) : ['Nenhum ponto forte mensurável se destacou nas medições de contraste, cor e foco.'],
    aiLooking: issues.length > 0 ? issues.slice(0, 3).map(x => x.text) : ['Nenhum problema mensurável de contraste, exposição, neon ou poluição visual.'],
    topProblem: top ? top.text : 'Nada crítico nas medições. Confira manualmente rosto, mãos e texto, que não são medidos localmente.',
    fixPrompt: `CORRECTION PROMPT (based on measured contrast, exposure, color and clutter):

CHANGE:
${change.length > 0 ? change.join('\n') : '1. No measurable global issue; only adjust details you see by eye.'}

PRESERVE:
1. Subject identity, pose, product geometry, and text exactly as they are.
2. Composition and camera framing.
3. Every element not listed in CHANGE.

AVOID:
${avoid.length > 0 ? avoid.join(', ') : 'unnecessary changes'}.`,
    isLocal: true,
  };
}
