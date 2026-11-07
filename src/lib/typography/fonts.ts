/**
 * The five real fonts the overlay editor can use (SIL Open Font License 1.1; files in public/fonts,
 * each family ships its OFL.txt). Portuguese accents, cedilla and punctuation were checked with fontTools.
 */
export interface RealFont {
  id: 'anton' | 'archivo-black' | 'barlow-condensed' | 'bebas-neue' | 'oswald';
  label: string;
  /** CSS family name registered for the canvas (must match the font file's family). */
  family: string;
  file: string;
  weight: number;
  /** Short hint shown under the picker. */
  use: string;
}

export const REAL_FONTS: RealFont[] = [
  { id: 'anton', label: 'Anton', family: 'Anton', file: '/fonts/anton/Anton-Regular.ttf', weight: 400, use: 'Título curto e forte' },
  { id: 'archivo-black', label: 'Archivo Black', family: 'Archivo Black', file: '/fonts/archivoblack/ArchivoBlack-Regular.ttf', weight: 400, use: 'Texto grande e pesado' },
  { id: 'barlow-condensed', label: 'Barlow Condensed', family: 'Barlow Condensed', file: '/fonts/barlowcondensed/BarlowCondensed-ExtraBold.ttf', weight: 800, use: 'Frases mais longas' },
  { id: 'bebas-neue', label: 'Bebas Neue', family: 'Bebas Neue', file: '/fonts/bebasneue/BebasNeue-Regular.ttf', weight: 400, use: 'Títulos condensados' },
  { id: 'oswald', label: 'Oswald', family: 'Oswald', file: '/fonts/oswald/Oswald-Variable.ttf', weight: 700, use: 'Equilibrado, uso geral' },
];

export function fontById(id: string): RealFont {
  return REAL_FONTS.find(f => f.id === id) || REAL_FONTS[0];
}
