/**
 * Named products and game covers in the creator's words.
 *
 * Shared by the engine (prompt locks) and the Spatial Hierarchy Planner, so both name the same
 * objects. Everything here is conservative: when a name cannot be identified with confidence,
 * nothing is returned and callers fall back to their previous generic behavior.
 */

const KNOWN_BRAND_WORDS = /^(iphone|ipad|macbook|airpods|galaxy|pixel|xiaomi|redmi|poco|motorola|moto|samsung|apple|sony|playstation|xbox|nintendo|switch|steam|legion|rog|lenovo|asus|acer|dell|alienware|razer|logitech|corsair|hyperx|nvidia|geforce|radeon|ryzen|intel|gopro|dji|canon|nikon|fujifilm|tesla|honda|toyota|civic|corolla|volkswagen|fiat|chevrolet|ford|bmw|porsche|ferrari|lego|minecraft|fortnite|zelda|mario|pokemon|pokémon)$/i;

// Words that describe the video, not the object ("Gameplay", "Review", "Unboxing", "Vs").
const TITLE_VIDEO_WORDS = /^(gameplay|review|reviews|unboxing|teste|testei|tutorial|novidades|vale|vs|versus|top|melhores|piores|dicas|guia|tier|ranking|análise|analise|comparativo)$/i;

/** A token that clearly signals a product/proper name rather than an ordinary capitalized word. */
function isStrongNameToken(token: string): boolean {
  return /[A-Za-z]\d|\d[A-Za-z]/.test(token) ||   // S26, PS5, RTX4090, 4K
    /^[a-z]+[A-Z]/.test(token) ||                 // iPhone, eFootball
    /^[A-Z]{2,5}$/.test(token) ||                 // OLED, GTA, DLC
    KNOWN_BRAND_WORDS.test(token);
}

/**
 * Product/proper names that appear in the video title, e.g. "iPhone 17 Pro vs Galaxy S26 Ultra"
 * -> ["iPhone 17 Pro", "Galaxy S26 Ultra"]. Conservative: a run of capitalized/numeric tokens is kept
 * only when it contains a strong name token, so "Unboxing Gamer" or "Testei" never qualify.
 */
export function extractTitleNames(title: string): string[] {
  const text = (title || '').trim();
  // An all-caps title has no usable capitalization signal.
  if (!text || text === text.toUpperCase()) return [];
  const tokens = text.split(/\s+/);
  const names: string[] = [];
  let run: string[] = [];
  const flush = () => {
    // A lone brand or acronym ("Apple", "GTA") names a topic, not a specific object to draw.
    const qualifies = run.length > 1
      ? run.some(isStrongNameToken)
      : run.length === 1 && (/[A-Za-z]\d|\d[A-Za-z]/.test(run[0]) || /^[a-z]+[A-Z]/.test(run[0]));
    if (qualifies) names.push(run.join(' '));
    run = [];
  };
  for (const raw of tokens) {
    const token = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}+]+$/gu, '');
    if (TITLE_VIDEO_WORDS.test(token)) { flush(); continue; }
    const startsName = /^\p{Lu}/u.test(token) || /^[a-z]+[A-Z]/.test(token) || /[A-Za-z]\d|\d[A-Za-z]/.test(token);
    const continuesName = run.length > 0 && /^\d+$/.test(token); // "iPhone 17"
    if (token && (startsName || continuesName)) run.push(token);
    else flush();
    if (/[,:;!?()|]$|—|–/.test(raw)) flush();
  }
  flush();
  return names;
}

/** True when the creator talks about physical game covers / boxes / cases. */
export function mentionsGameCovers(text: string): boolean {
  return /\b(capas?|covers?|box\s*art|caixinhas?|game\s*(?:boxes|cases))\b/i.test(text || '');
}

/**
 * Game titles the creator explicitly names as covers: "capas de GTA San Andreas e God of War reconhecíveis"
 * -> ["GTA San Andreas", "God of War"]. Only titles written right after "capa(s) de" / "covers of" count,
 * so a console name or an unrelated phrase is never mistaken for a game.
 */
export function extractCoverTitles(text: string): string[] {
  const m = (text || '').match(/\b(?:capas?|covers?|box\s*art)\s+(?:de|do|da|dos|das|of)\s+(.+?)(?=\s+(?:reconhec\w*|recognizable|do\s+lado|ao\s+lado|atr[aá]s|em\s+cima|na\s+m[aã]o|nas\s+m[aã]os|na\s+mesa|no\s+fundo|que|com|para)\b|[,.;:!?()]|$)/i);
  if (!m) return [];
  return m[1]
    .split(/\s*,\s*|\s+(?:e|and)\s+/i)
    .map(s => s.trim())
    // A title needs a capitalized or numeric start ("God of War", "FIFA 2005"), not "jogos antigos".
    .filter(s => s.length > 1 && /^[\p{Lu}\d]/u.test(s));
}

/**
 * Distinct named products in the title and idea ("iPhone 17 Pro", "Galaxy S26 Ultra", "PS5",
 * "Xbox Series X"). Game cover titles are excluded: they are covers, not products being compared.
 */
export function extractNamedProducts(title: string, idea: string): string[] {
  const covers = extractCoverTitles(`${title} ${idea}`).map(c => c.toLowerCase());
  const all = [...extractTitleNames(title), ...extractTitleNames(idea)]
    .filter(name => !covers.some(c => c.includes(name.toLowerCase()) || name.toLowerCase().includes(c)));

  // Same product written differently ("PlayStation 2" / "PS2") counts once.
  const aliasKey = (name: string) => name.toLowerCase().replace(/playstation\s*(\d)/g, 'ps$1').replace(/\s+/g, ' ').trim();
  const tokens = (name: string) => aliasKey(name).split(' ');
  const containsTokens = (outer: string[], inner: string[]) =>
    inner.length < outer.length && outer.some((_, i) => inner.every((t, j) => outer[i + j] === t));

  // "controle de PS5" names the controller, not the console.
  const text = `${title} ${idea}`;
  const accessoryOf = (name: string): string | undefined => {
    const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const accessoryRe = new RegExp(`\\b(controles?|controladores?|joysticks?|headsets?|fones?|carregador(?:es)?|capinhas?|cases?)\\s+(?:do|da|de|para\\s+o|para\\s+a)\\s+${n}\\b`, 'gi');
    const m = accessoryRe.exec(text);
    if (!m) return undefined;
    // The product itself is also named on its own ("PS5 vs Xbox ... e o controle do PS5"): keep the product.
    if (new RegExp(`\\b${n}\\b`, 'i').test(text.replace(accessoryRe, ' '))) return undefined;
    const kind = m[1].toLowerCase();
    return /^(controle|controlador|joystick)/.test(kind) ? 'controller'
      : /^(headset|fone)/.test(kind) ? 'headset'
      : /^carregador/.test(kind) ? 'charger' : 'case';
  };

  const out: string[] = [];
  for (const raw of all) {
    const accessory = accessoryOf(raw);
    const name = accessory ? `${raw} ${accessory}` : raw;
    if (out.some(o => aliasKey(o) === aliasKey(name))) continue;
    out.push(name);
  }
  // "Colecionando PS2" vs "PS2": the extra word is ordinary, so it is the same product (keep "PS2").
  // "Galaxy S26 Ultra" vs "S26": the extra words are name tokens, so keep the more specific one.
  return out.filter(name => !out.some(other => {
    if (other === name) return false;
    const [a, b] = [tokens(name), tokens(other)];
    if (containsTokens(a, b)) {
      const extra = a.filter(t => !b.includes(t));
      return extra.every(t => !isStrongNameToken(t) && !/^\d+$/.test(t)); // name = other + common words
    }
    if (containsTokens(b, a)) {
      const extra = b.filter(t => !a.includes(t));
      return extra.some(t => isStrongNameToken(t) || /^\d+$/.test(t) || /^(pro|ultra|max|plus|mini|lite|oled|slim)$/i.test(t));
    }
    return false;
  }));
}

/**
 * The product the creator singles out ("com o PS5 em destaque", "destaque para o PS5"), if it is one
 * of the named products.
 */
export function featuredProduct(text: string, products: string[]): string | undefined {
  const lower = (text || '').toLowerCase();
  return products.find(p => {
    const n = p.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`${n}\\s+(?:em\\s+destaque|como\\s+destaque|in\\s+focus|featured)|destaque\\s+(?:para|no|na|ao|à)\\s+(?:o\\s+|a\\s+)?${n}`, 'i').test(lower);
  });
}
