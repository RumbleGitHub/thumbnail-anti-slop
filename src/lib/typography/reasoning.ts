/**
 * Typography reasoning for the prompt engine. Given the headline the creator wants, the thumbnail's
 * genre and the rest of the scene, it decides HOW the lettering should look and writes that decision as
 * a short, positive instruction for the image generator. Nothing here is a fixed template: each
 * dimension (genre, length, hierarchy, relation to the subject, colour, outline, shadow) is chosen from
 * the case at hand.
 *
 * Pure and deterministic. It never names a font as a promise and never changes the requested wording.
 */

export type TypoGenre = 'gaming' | 'tech' | 'opinion' | 'food' | 'general';

export interface TypographyContext {
  /** The exact headline the creator wants visible. */
  text: string;
  /** The creator's idea (may describe the scene). */
  idea?: string;
  /** The video title. */
  title?: string;
  hasProduct?: boolean;
  hasPerson?: boolean;
}

export interface TypographyBrief {
  genre: TypoGenre;
  length: 'short' | 'medium' | 'long';
  accents: boolean;
  /** Positive instruction for the image generator, written for this case. */
  instruction: string;
  /** Short phrase for Midjourney-style prompts (the words themselves are quoted elsewhere). */
  shortPhrase: string;
  /** Plain-language reasons (Portuguese) for the typography plan shown to the creator. */
  reasons: string[];
}

const ACCENT = /[ãõçáéíóúâêôàÃÕÇÁÉÍÓÚÂÊÔÀ]/;

// Genre signals. Opinion is checked first: a verdict in the headline ("não compre", "vale a pena") is the
// strongest signal, even when the title names a console or a phone.
const OPINION = /(n[ãa]o\s+compre|vale\s+a\s+pena|opini|pol[êe]mic|verdade|mentira|erro|chocante|eu\s+acho|desabafo|cuidado|cansei|s[ée]rio)/i;
const GAMING = /(\bgta\b|\bps[1-5]\b|playstation|xbox|nintendo|switch|zelda|minecraft|fortnite|valorant|\bcs2?\b|steam\s*deck|jogo|jogos|jogando|jogar|game|gamer|gaming|zerei|platina|rpg|boss|chefe|controle|console|capa|speedrun|partida|elden)/i;
const TECH = /(iphone|galaxy|samsung|pixel|celular|smartphone|notebook|laptop|\bpc\b|monitor|headset|fone|\bgpu\b|\brtx\b|ryzen|legion\s*go|rog\s*ally|unboxing|review|teste|tecnologia|tech)/i;
const FOOD = /(comida|prato|feijoada|receita|hamb[úu]rguer|pizza|churrasco|restaurante|sobremesa|cozinha|cozinhar|comer|doce)/i;

export function genreOf(ctx: Pick<TypographyContext, 'idea' | 'title' | 'text'>): TypoGenre {
  const title = ctx.title || '';
  const idea = ctx.idea || '';
  // A verdict in the video title is the clearest signal of an opinion thumbnail.
  if (OPINION.test(title)) return 'opinion';
  // The genre the creator names in the request outranks a verdict word inside the headline.
  if (GAMING.test(`${title} ${idea}`)) return 'gaming';
  if (OPINION.test(ctx.text || '')) return 'opinion';
  if (TECH.test(`${title} ${idea}`)) return 'tech';
  if (OPINION.test(idea)) return 'opinion';
  if (FOOD.test(`${title} ${idea}`)) return 'food';
  return 'general';
}

function lengthOf(text: string): 'short' | 'medium' | 'long' {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 2) return 'short';
  if (words <= 5) return 'medium';
  return 'long';
}

// Each genre gets its own letter construction, size and effects: they are chosen, not pasted.
const LETTERS: Record<TypoGenre, string> = {
  gaming: 'Draw one cohesive, professionally designed display face with consistent proportions and clean curves',
  tech: 'Draw one clean geometric sans with even strokes and natural spacing',
  opinion: 'Draw one heavy condensed display face with consistent proportions and open counters',
  food: 'Draw one warm, bold display face with rounded terminals',
  general: 'Draw one coherent display face with consistent proportions',
};

const SIZE: Record<'short' | 'medium' | 'long', string> = {
  short: 'as one large, dominant line readable at a glance',
  medium: 'on two lines at most, large and comfortably spaced',
  long: 'in two or three compact lines broken at word boundaries',
};

const EFFECTS: Record<TypoGenre, string> = {
  gaming: 'One strong accent colour, a bold, even outline that keeps the letters readable over a busy background, and a firm shadow for depth; no bevel or chrome, and a glow only if the scene itself is neon.',
  tech: 'One high-contrast tone with a crisp edge or a small shadow for separation; no bevel and no glow.',
  opinion: 'Maximum value contrast against the background, with at most one restrained edge or a tight soft shadow.',
  food: 'A warm, high-contrast tone, with a tight soft shadow only if the letters need separation.',
  general: 'High contrast, with no outline or shadow unless it helps reading.',
};

/** Where the lettering goes, chosen from the subject and the genre, never one fixed sentence. */
function placementOf(ctx: TypographyContext, genre: TypoGenre, length: 'short' | 'medium' | 'long'): string {
  if (ctx.hasPerson) return 'Keep it in clean space away from the face and hands.';
  if (ctx.hasProduct) return 'Keep it in clean space away from the product and its logo.';
  if (length === 'long') return 'Set it along the lower third, clear of the main subject.';
  switch (genre) {
    case 'gaming': return 'Place it in the open area of the frame, clear of the main subject silhouette.';
    case 'tech': return 'Place it on the cleaner side of the frame, clear of the products.';
    case 'opinion': return 'Place it over the flattest area of the background, clear of the subject.';
    case 'food': return 'Place it in the empty part of the frame, away from the dish.';
    default: return 'Keep it in clean negative space, not over the main subject.';
  }
}

const REASON_GENRE: Record<TypoGenre, string> = {
  gaming: 'Gênero gamer: letras grandes e com personalidade, contorno só onde ajuda a separar do fundo.',
  tech: 'Gênero tecnologia: sans limpa e geométrica, sem contorno nem brilho.',
  opinion: 'Gênero opinião: caixa-alta condensada e pesada, contraste máximo.',
  food: 'Gênero comida: display quente e arredondado, legível no celular.',
  general: 'Tipografia geral: display coerente, sem efeitos desnecessários.',
};

/**
 * The lettering instruction for one case: wording, construction and size for the genre, placement relative to
 * the subject, colour and effects, and the protection of the rest of the image. Five short sentences.
 */
export function typographyBrief(ctx: TypographyContext): TypographyBrief {
  const text = (ctx.text || '').trim();
  const genre = genreOf(ctx);
  const length = lengthOf(text);
  const accents = ACCENT.test(text);

  const marks = [accents ? 'accent' : '', /[çÇ]/.test(text) ? 'cedilha' : ''].filter(Boolean);
  const wording = `Render the headline "${text}" exactly as written, every letter${marks.map(m => `, ${m}`).join('')} and punctuation mark, never translated or shortened.`;
  const construction = `${LETTERS[genre]}, set ${SIZE[length]}.`;
  const instruction = [wording, construction, placementOf(ctx, genre, length), EFFECTS[genre], 'Change only the lettering; keep the background, scene, lighting, face, product and logos as they are.'].join(' ');

  const shortPhrase = `one cohesive display typeface, ${length === 'short' ? 'very large lettering' : 'large lettering'}, ${genre === 'tech' ? 'clean geometric sans, one high-contrast tone' : genre === 'opinion' ? 'heavy condensed caps, high contrast' : genre === 'food' ? 'warm bold display' : 'controlled outline, one accent colour'}, readable at phone size`;

  const reasons = [REASON_GENRE[genre], length === 'short' ? 'Texto curto: pode ser grande e dominante.' : length === 'medium' ? 'Texto médio: no máximo duas linhas.' : 'Texto longo: duas ou três linhas compactas.'];
  if (accents) reasons.push('Acentos e cedilha: preservados exatamente como digitados.');
  if (ctx.hasPerson) reasons.push('Há uma pessoa na cena: o texto fica longe do rosto e das mãos.');
  else if (ctx.hasProduct) reasons.push('Há um produto na cena: o texto fica longe dele e do logotipo.');

  return { genre, length, accents, instruction, shortPhrase, reasons };
}

/**
 * MELHORAR: replaces typography instructions that push the image generator toward fake-looking lettering
 * with a better direction. Only phrases that name lettering are touched (never the scene, never text
 * inside quotes), and the requested wording is never changed.
 */
const BAD_TYPOGRAPHY: { re: RegExp; to: string; note: string }[] = [
  { re: /\b(?:3d|3-d)\s+(?:text|letters?|lettering|title|headline|letras?|texto|tipografia)\b/gi, to: 'flat display lettering', note: 'efeito 3D artificial nas letras' },
  { re: /\b(?:bevel(?:ed)?|extruded|embossed|chrome|metallic|melting|melted|dripping|inflated|derretid[oa]s?|infl[ao]d[oa]s?|plastific[oa]d[oa]s?)\s+(?:text|letters?|lettering|title|headline|letras?|texto|tipografia)\b/gi, to: 'solid display lettering', note: 'letras plastificadas, derretidas ou infladas' },
  { re: /\b(?:glowing|neon|glow|brilhant[ea]s?)\s+(?:text|letters?|lettering|title|headline|letras?|texto|tipografia)\b/gi, to: 'lettering with one controlled edge', note: 'brilho que compete com o texto' },
  { re: /\b(?:thick|heavy|huge|massive|grossa?|pesad[oa])\s+(?:outline|stroke|border|contorno|borda)\b/gi, to: 'a thin, even outline', note: 'contorno excessivamente grosso' },
  { re: /\b(?:outline|stroke|border|contorno|borda)\s+(?:thick|heavy|huge|massive|grosso|grossa|pesado|pesada)\b/gi, to: 'a thin, even outline', note: 'contorno excessivamente grosso' },
  { re: /\b(?:heavy|strong|thick|big)\s+(?:drop\s+)?shadows?\b|\bsombras?\s+(?:pesad[oa]s?|fortes?|grossas?)\b/gi, to: 'a tight, soft shadow only for separation', note: 'sombra competindo com o texto' },
  { re: /\b(?:8k|ultra[- ]detailed|hyper[- ]?realistic)\s+(?:text|letters?|lettering|texto|letras?)\b/gi, to: 'lettering', note: 'termo de qualidade colado ao texto' },
  { re: /\b(?:text|letters?|lettering|texto|letras?)\s+(?:with|com)\s+(?:effects?|efeitos?)\b/gi, to: 'lettering with controlled effects', note: 'efeitos genéricos no texto' },
  { re: /\b(?:ai[- ]looking|fake|artificial)\s+(?:text|letters?|lettering|texto|letras?)\b/gi, to: 'well-constructed lettering', note: 'letras de aparência artificial' },
];

/** A run of such words joined by "e", "and", "com", "with" or commas: replaced by one direction. */
const BARE_RUN = /\b(?:3d|3-d|bevel(?:ed)?|extruded|embossed|glow|glowing|chrome|metallic)\b(?:\s*(?:,|\be\b|\band\b|\bcom\b|\bwith\b)?\s*\b(?:3d|3-d|bevel(?:ed)?|extruded|embossed|glow|glowing|chrome|metallic)\b)*/gi;

const TEXT_CLAUSE = /(?<!\p{L})(?:texto|text|escrit[oa]s?|letreiro|headline|t[íi]tulo|legenda|frase|letras?|lettering|caption)(?!\p{L})|"[^"\n]*"|“[^”\n]*”/iu;

export function reviseTypographyRequest(raw: string): { text: string; changes: string[] } {
  const changes: string[] = [];
  const QUOTE_SPLIT = /("[^"\n]*"|“[^”\n]*”|«[^»\n]*»)/u;
  // Work clause by clause, so an effect word is read in the context of its own clause ("texto X com 3D e glow").
  const text = (raw || '')
    .split(/(?<=[,;.])/)
    .map(clause => {
      const textClause = TEXT_CLAUSE.test(clause);
      // Quoted text is the wording to render: never rewritten, even when it contains an effect word.
      return clause
        .split(QUOTE_SPLIT)
        .map((part, i) => {
          if (i % 2 === 1) return part;
          let out = part;
          for (const rule of BAD_TYPOGRAPHY) {
            out = out.replace(rule.re, match => {
              changes.push(`"${match}" → "${rule.to}" (${rule.note})`);
              return rule.to;
            });
          }
          if (textClause) {
            out = out.replace(BARE_RUN, match => {
              changes.push(`"${match.trim()}" → "flat display lettering with one controlled edge" (efeitos 3D ou brilho no texto)`);
              return 'flat display lettering with one controlled edge';
            });
          }
          return out;
        })
        .join('');
    })
    .join('');
  return { text, changes };
}
