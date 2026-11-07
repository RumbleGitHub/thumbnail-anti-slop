/** Plain-language reasons for falling back from cloud AI to local analysis / the deterministic engine. */
const REASONS: Record<string, string> = {
  throttled: 'muitos pedidos neste minuto',
  'daily-budget-exhausted': 'limite diário gratuito atingido (volta às 21h de Brasília / 00:00 UTC)',
  'platform-quota': 'limite diário gratuito da Cloudflare atingido (volta às 21h de Brasília / 00:00 UTC)',
  timeout: 'a IA demorou demais para responder',
  'no-binding': 'IA indisponível neste ambiente',
  'budget-unavailable': 'controle de limite indisponível, então a IA não foi chamada',
  error: 'erro no serviço de IA',
  'unusable-answer': 'a resposta da IA veio fora do formato',
  'exact-text-lost': 'a IA alterou o texto exato, então a reescrita foi descartada',
  'invented-setting': 'a IA inventou um cenário, então a reescrita foi descartada',
  disabled: 'IA desligada no servidor',
  'unsupported-image': 'formato de imagem não suportado pela IA',
  'prompt-length': 'prompt curto ou longo demais para a IA',
};

export function describeAiFallback(reason?: string): string {
  if (!reason) return '';
  return REASONS[reason] || reason;
}
