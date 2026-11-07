// Thumbnail Quality Lab — golden dataset.
//
// Each case is a realistic creator request. Checks are deterministic text
// assertions over the generated prompt; they evaluate PROMPT INSTRUCTIONS only.
// Passing these checks does not prove that a generated image looks good.
//
// Fields:
//   kind: 'create' | 'improve' | 'analyze'
//   input: payload for the engine function
//   expect:
//     person: true | false           -> whether a human should be depicted
//     productLock: true              -> a product-fidelity instruction must exist
//     mustInclude: [string|RegExp]   -> must appear in the final prompt
//     mustNotIncludePositive: [...]  -> must not appear in POSITIVE instructions
//                                       (negation clauses are stripped first)
//     mustNotInclude: [...]          -> must not appear anywhere in the prompt
//     exactText: string              -> visible overlay text that must be kept verbatim

// A typography instruction that asks the generator to render the requested headline (any supported adapter).
const RENDER_TYPO = /Render the headline "[^"]+" exactly as written|with the words "[^"]+" written/;

const ref = (id, role, extra = {}) => ({ id, name: id, url: `https://example.com/${id}.jpg`, role, ...extra });

export const LAB_MODELS = [
  'GERAL',
  'OPENAI_GPT_IMAGE_2_5_SUNBURST',
  'GOOGLE_NANO_BANANA_2',
  'MIDJOURNEY_V8_2',
  'FLUX_2_PRO',
];

export const GOLDEN_CASES = [
  {
    id: '01_ps2_covers',
    title: 'PS2 com capas de jogos reconhecíveis',
    kind: 'create',
    input: {
      videoTitle: 'Os 10 melhores jogos de PS2',
      ideaDescription: 'Eu segurando o PS2 com as capas de GTA San Andreas e God of War reconhecíveis do lado',
      references: [ref('minha-foto', 'PESSOA')],
    },
    expect: { person: true, productLock: true, mustInclude: ['GTA San Andreas', 'God of War'], coverTitles: true },
  },
  {
    id: '02_creator_in_game_world',
    title: 'Criador integrado a um mundo de jogo',
    kind: 'create',
    input: {
      videoTitle: 'Joguei Crimson Desert por 50 horas',
      ideaDescription: 'Eu dentro do mundo de Crimson Desert vestido como um guerreiro',
      references: [ref('minha-foto', 'PESSOA')],
    },
    expect: { person: true, mustInclude: ['Crimson Desert'], mustNotIncludePositive: [/bedroom/i, /\bsofa\b/i, /\bdesk\b/i] },
  },
  {
    id: '03_product_with_reference',
    title: 'Produto com imagem de referência',
    kind: 'create',
    input: {
      videoTitle: 'Unboxing Gamer',
      ideaDescription: 'Mostrando o novo headset gamer na mão.',
      references: [ref('headset-pro-x', 'PRODUTO')],
    },
    // Reference file names: in the prompt for models that map images by name; for Midjourney they
    // must go to the attach instructions instead (Midjourney cannot read file names).
    expect: { productLock: true, refNames: ['headset-pro-x'] },
  },
  {
    id: '04_named_products_no_reference',
    title: 'Produtos nomeados sem referência (comparação)',
    kind: 'create',
    input: {
      videoTitle: 'iPhone 17 Pro vs Galaxy S26 Ultra',
      ideaDescription: 'Os dois celulares lado a lado em cima de uma superfície neutra',
      references: [],
    },
    expect: { person: false, productLock: true, mustInclude: ['iPhone 17 Pro', 'Galaxy S26 Ultra'], distinctProducts: ['iPhone 17 Pro', 'Galaxy S26 Ultra'] },
  },
  {
    id: '05_person_holding_object',
    title: 'Pessoa segurando um objeto físico',
    kind: 'create',
    input: {
      videoTitle: 'O melhor café que já tomei',
      ideaDescription: 'Eu segurando uma caneca de café quente perto do rosto',
      references: [ref('minha-foto', 'PESSOA')],
    },
    expect: { person: true },
  },
  {
    id: '06_multi_element_hierarchy',
    title: 'Vários elementos competindo por atenção',
    kind: 'create',
    input: {
      videoTitle: 'Qual console comprar em 2026?',
      ideaDescription: 'Eu no centro com um PS5, um Xbox Series X e um Switch 2, com o PS5 em destaque',
      references: [ref('minha-foto', 'PESSOA')],
    },
    expect: { person: true, productLock: true, mustInclude: ['PS5'], distinctProducts: ['PS5', 'Xbox Series X', 'Switch 2'] },
  },
  {
    id: '07_explicit_bedroom',
    title: 'Quarto explicitamente pedido',
    kind: 'create',
    input: {
      videoTitle: 'Meu setup 2026',
      ideaDescription: 'Eu sentado no meu quarto gamer com o monitor atrás',
      references: [ref('minha-foto', 'PESSOA')],
    },
    expect: { person: true, mustInclude: [/bedroom|quarto/i], mustNotInclude: [/no bedrooms/i] },
  },
  {
    id: '08_no_environment_conservative',
    title: 'Sem ambiente definido (inferência conservadora)',
    kind: 'create',
    input: {
      videoTitle: 'Vale a pena estudar programação?',
      ideaDescription: 'Eu olhando para a câmera com cara de dúvida',
      references: [ref('minha-foto', 'PESSOA')],
    },
    expect: { person: true, mustNotIncludePositive: [/bedroom/i, /living room/i, /\bsofa\b/i, /\bdesk\b/i, /gaming room/i] },
  },
  {
    id: '09_target_image_locked',
    title: 'Imagem-alvo com composição travada',
    kind: 'create',
    input: {
      videoTitle: 'Virei o protagonista',
      ideaDescription: 'Coloque meu rosto no personagem da imagem alvo sem mudar mais nada',
      references: [ref('personagem-alvo', 'IMAGEM_ALVO', { isTarget: true }), ref('minha-foto', 'PESSOA')],
    },
    expect: { person: true, refNames: ['personagem-alvo'] },
  },
  {
    id: '10_analyze_existing',
    title: 'Thumbnail existente precisando de correção',
    kind: 'analyze',
    input: { videoTitle: 'Testei o Steam Deck OLED' },
    expect: {},
  },
  {
    id: '11_exact_portuguese_text',
    title: 'Tipografia exata em português',
    kind: 'create',
    input: {
      videoTitle: 'Nunca compre isso',
      ideaDescription: 'Eu segurando um Steam Deck com expressão de desconfiança',
      thumbnailText: 'NÃO COMPRE',
      references: [ref('minha-foto', 'PESSOA')],
    },
    expect: { person: true, productLock: true, exactText: 'NÃO COMPRE' },
  },
  {
    id: '12_simple_stays_simple',
    title: 'Pedido simples deve continuar simples',
    kind: 'create',
    input: {
      videoTitle: 'Review do meu teclado',
      ideaDescription: 'Só o teclado em cima da mesa, simples',
      references: [],
    },
    expect: { person: false, productLock: true, mustNotIncludePositive: [/disassembled/i, /circuitry/i, /repair tools/i] },
  },
  {
    id: '13_non_tech_object_no_person',
    title: 'Objeto não-tecnológico sem pessoa (comida)',
    kind: 'create',
    input: {
      videoTitle: 'A feijoada perfeita',
      ideaDescription: 'Um prato de feijoada fumegante visto de cima',
      references: [],
    },
    expect: { person: false },
  },
  {
    id: '15_ps2_unnamed_covers',
    title: 'PS2 com capas sem jogos nomeados (sem capas falsas)',
    kind: 'create',
    input: {
      videoTitle: 'Minha coleção de PS2',
      ideaDescription: 'Eu segurando um PS2 com várias capas de jogos ao lado',
      references: [ref('minha-foto', 'PESSOA')],
    },
    expect: { person: true, productLock: true, genericCovers: true },
  },
  {
    id: '16_exclusions_and_meta_words',
    title: 'Exclusões e pedidos sobre a imagem fora da cena',
    kind: 'create',
    input: {
      videoTitle: 'Joguei 100 horas',
      ideaDescription: 'Eu segurando um controle de PS5, bem chamativo, sem neon e sem cara de IA',
      references: [ref('minha-foto', 'PESSOA')],
    },
    expect: {
      person: true,
      mustNotIncludePositive: [/sem neon/i, /chamativ/i, /cara de IA/i],
      excludedInAvoid: [/neon/i, /AI-generated look/i],
    },
  },
  {
    id: '14_improve_slop_prompt',
    title: 'Melhorar prompt cheio de slop preservando o texto',
    kind: 'improve',
    input: {
      rawPrompt: 'epic gaming thumbnail of a guy holding a ps5, shocked face, 8k, ultra detailed, neon glow, red arrow, text "VALE A PENA?"',
      targetModel: 'GERAL',
    },
    expect: { exactText: 'VALE A PENA?', mustNotIncludePositive: [/\b8k\b/i, /ultra detailed/i, /neon glow/i, /red arrow/i] },
  },
  // Typography (synthetic fixtures, deterministic prompt checks only; visual judgment is separate).
  {
    id: '17_typography_pt_accents_real_layer',
    title: 'Texto em português com acentos vai para camada real, não é desenhado pela IA',
    kind: 'create',
    input: {
      videoTitle: 'Vale a pena comprar?',
      ideaDescription: 'Eu apontando para a tela com cara séria',
      thumbnailText: 'AÇÃO: NÃO COMPRE!',
      fontName: 'Anton',
      references: [],
    },
    expect: {
      person: true,
      exactText: 'AÇÃO: NÃO COMPRE!',
      mustInclude: [/Render the headline "[^"]+" exactly as written|with the words "[^"]+" written/],
      mustNotInclude: ['real typography layer', 'Anton typeface'],
    },
  },
  {
    id: '18_typography_explicit_in_image',
    title: 'Pedido explícito de texto dentro da imagem mantém a regra literal',
    kind: 'create',
    input: {
      videoTitle: 'Teste do controle',
      ideaDescription: 'Controle sobre a mesa, luz natural',
      thumbnailText: 'VALE A PENA?',
      textTreatment: 'RENDER_IN_IMAGE',
      references: [],
    },
    expect: { exactText: 'VALE A PENA?', mustInclude: [/Render the headline "[^"]+" exactly as written|with the words "[^"]+" written/], mustNotInclude: ['Do not draw the headline'] },
  },
  {
    id: '19_typography_gaming_title_large',
    title: 'Título grande de jogo na camada real, sem deformar a capa nem a cena',
    kind: 'create',
    input: {
      videoTitle: 'Zerei GTA San Andreas',
      ideaDescription: 'Eu segurando o controle na frente da TV, cena do jogo ao fundo',
      thumbnailText: 'SAN ANDREAS',
      references: [],
    },
    expect: { exactText: 'SAN ANDREAS', mustInclude: [/Render the headline "[^"]+" exactly as written|with the words "[^"]+" written/], mustNotInclude: ['real typography layer'] },
  },
  {
    id: '20_typography_camada_depois_real_layer',
    title: 'Camada depois: espaço limpo para a fonte real, sem desenhar a manchete',
    kind: 'create',
    input: {
      videoTitle: 'Vale a pena comprar?',
      ideaDescription: 'Eu apontando para a tela, cara séria',
      thumbnailText: 'AÇÃO: NÃO COMPRE!',
      textTreatment: 'CAMADA_REAL',
      references: [],
    },
    expect: { exactText: 'AÇÃO: NÃO COMPRE!', mustInclude: [/Do not draw the headline text|for a real typography layer/], mustNotInclude: ['must read exactly'] },
  },
  // Typography reasoning (synthetic fixtures). Judged by the typography rubric in suite 45, not by word presence alone.
  {
    id: '21_typography_gta_stylized_title',
    title: 'GTA com título grande e estilizado: letras de jogo com personalidade, sem pseudo-letras',
    kind: 'create',
    input: { videoTitle: 'Zerei GTA San Andreas em 2026', ideaDescription: 'Eu com o controle na frente da TV, título gigante estilizado do jogo', thumbnailText: 'SAN ANDREAS', references: [ref('minha-foto', 'PESSOA')] },
    expect: { person: true, exactText: 'SAN ANDREAS', mustInclude: [RENDER_TYPO] },
  },
  {
    id: '22_typography_tech_short',
    title: 'Tecnologia com texto curto: sans geométrica limpa, sem brilho',
    kind: 'create',
    input: { videoTitle: 'Testei o Legion Go', ideaDescription: 'Legion Go na mão, tela ligada', thumbnailText: 'TESTE COMPLETO', references: [] },
    expect: { exactText: 'TESTE COMPLETO', mustInclude: [RENDER_TYPO] },
  },
  {
    id: '23_typography_opinion_pt',
    title: 'Opinião em português: caixa-alta pesada e contraste máximo',
    kind: 'create',
    input: { videoTitle: 'Vale a pena comprar o PS5 em 2026?', ideaDescription: 'Eu falando olhando para a câmera, expressão séria', thumbnailText: 'NÃO COMPRE AGORA', references: [] },
    expect: { exactText: 'NÃO COMPRE AGORA', mustInclude: [RENDER_TYPO] },
  },
  {
    id: '24_typography_comparison',
    title: 'Comparação de produtos: título curto que decide, sem fundir os produtos',
    kind: 'create',
    input: { videoTitle: 'iPhone 17 Pro vs Galaxy S26 Ultra', ideaDescription: 'Dois celulares lado a lado', thumbnailText: 'QUAL COMPRAR?', references: [] },
    expect: { exactText: 'QUAL COMPRAR?', mustInclude: [RENDER_TYPO], mustNotInclude: ['Do not draw the headline'] },
  },
  {
    id: '25_typography_accents_cedilha',
    title: 'Título com acentos e cedilha preservados exatamente',
    kind: 'create',
    input: { videoTitle: 'O grande anúncio', ideaDescription: 'Eu com uma caixa de ação, sorriso leve', thumbnailText: 'O GRANDE ANÚNCIO: É HOJE, ÇA É SÉRIO', references: [] },
    expect: { exactText: 'O GRANDE ANÚNCIO: É HOJE, ÇA É SÉRIO', mustInclude: [RENDER_TYPO] },
  },
  {
    id: '26_typography_overloaded_improve',
    title: 'Prompt cheio de efeitos tipográficos exagerados: troca por direções boas, mantém o título',
    kind: 'improve',
    input: { rawPrompt: 'epic gaming thumbnail, text "VALE A PENA" with 3D bevel chrome letters and thick outline, heavy drop shadow, glowing neon text, 8k ultra detailed text, lots of particles', targetModel: 'GERAL' },
    expect: { exactText: 'VALE A PENA', mustInclude: [RENDER_TYPO], mustNotInclude: [/3D bevel|chrome letters|thick outline|heavy drop shadow|glowing neon text|8k ultra detailed text/i] },
  },
  {
    id: '27_typography_no_text',
    title: 'Sem texto pedido: nenhum título inventado',
    kind: 'create',
    input: { videoTitle: 'Testei o PS2', ideaDescription: 'Eu segurando o PS2 na mesa', thumbnailText: '', references: [] },
    expect: { mustNotInclude: [/Render the headline|real typography layer|Do not draw the headline text/] },
  },
  {
    id: '28_typography_game_logo_preserved',
    title: 'Logotipo de jogo que precisa permanecer intacto, com o texto pedido',
    kind: 'create',
    input: { videoTitle: 'Jogando Elden Ring', ideaDescription: 'Eu com o controle, a capa com o logotipo do jogo visível', thumbnailText: 'ELDEN RING', references: [ref('capa-elden', 'PRODUTO')] },
    expect: { exactText: 'ELDEN RING', mustInclude: [/logo|printed markings|official/i] },
  },
];

// Fixture-specific content that earlier archetypes injected regardless of the
// request. Each term is a defect unless the creator's own words justify it.
export const TEMPLATE_LEAK_TERMS = [
  { term: /weathered structure|cracked concrete|creeping moss|moss texture/i, allowIf: /abandonad|ru[ií]na|musgo|concreto|urbex|explora/i, label: 'abandoned-structure template' },
  { term: /vintage retro gaming console|sleek modern gaming console/i, allowIf: /console|videogame|playstation|ps[1-5]|xbox|nintendo|mega\s*drive|atari/i, label: 'retro-vs-modern console template' },
  { term: /disassembled device|exposed internal circuitry|ribbon cables|repair tools|hex drivers/i, allowIf: /desmont|abert|por\s*dentro|teardown|circuito|conserto|reparo|bancada/i, label: 'teardown template' },
  { term: /opened laptop chassis|motherboard components/i, allowIf: /aberto|desmont|teardown|placa/i, label: 'opened-laptop template' },
  { term: /Legion Go/i, allowIf: /legion/i, label: 'Legion Go fixture' },
  { term: /holding the map/i, allowIf: /mapa|map\b/i, label: 'map fixture' },
];

// Positive slop vocabulary that should never be emitted as an instruction.
export const POSITIVE_SLOP_TERMS = [/\b8k\b/i, /ultra[- ]detailed/i, /\bepic\b/i, /lens flare/i, /trending on artstation/i, /hyper[- ]?realistic/i, /cinematic lighting/i];

// Positive (to-be-drawn) part of a prompt: drops AVOID sections and negated clauses.
export function positiveOnly(prompt) {
  let text = prompt.split(/NEGATIVE \/ STRICTLY AVOID:|^AVOID:|^NEGATIVE PROMPT:/m)[0];
  text = text.replace(/\((?:no|without|zero)\b[^)]*\)/gi, ' ');
  text = text.replace(/--no\s[^\n]*/gi, ' ');
  return text
    .split(/(?<=[.;!?\n])/)
    .filter(s => !/^\s*(zero|do not|don't|no|not|never|avoid|without|absolutely no|strictly avoid)\b/i.test(s))
    .join('')
    .replace(/\b(?:no|without|zero|avoid(?:ing)?|never)\s[^,.;\n]*/gi, ' ');
}
