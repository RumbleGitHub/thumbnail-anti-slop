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
    expect: { person: true, productLock: true, mustInclude: ['GTA San Andreas', 'God of War'] },
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
    expect: { productLock: true, mustInclude: ['headset-pro-x'] },
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
    expect: { person: false, productLock: true, mustInclude: ['iPhone 17 Pro', 'Galaxy S26 Ultra'] },
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
    expect: { person: true, productLock: true, mustInclude: ['PS5'] },
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
    expect: { person: true, mustInclude: ['personagem-alvo'] },
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
    id: '14_improve_slop_prompt',
    title: 'Melhorar prompt cheio de slop preservando o texto',
    kind: 'improve',
    input: {
      rawPrompt: 'epic gaming thumbnail of a guy holding a ps5, shocked face, 8k, ultra detailed, neon glow, red arrow, text "VALE A PENA?"',
      targetModel: 'GERAL',
    },
    expect: { exactText: 'VALE A PENA?', mustNotIncludePositive: [/\b8k\b/i, /ultra detailed/i, /neon glow/i, /red arrow/i] },
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
