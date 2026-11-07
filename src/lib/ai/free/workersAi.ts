/**
 * Cloudflare Workers AI — the zero-spend hosted AI layer.
 *
 * Why Workers AI (docs checked 2026-11-07):
 * - 10,000 Neurons/day free; on the Workers FREE plan further calls fail with an error (no charge).
 *   On Workers PAID, usage above the allocation is billed, so FREE_AI_DAILY_NEURONS keeps an app-side cap.
 * - No API key: the Worker's `AI` binding authenticates with the account itself.
 * - Cloudflare does not train on Customer Content and keeps zero data retention for standard inference.
 *
 * Every call goes through runWorkersAi(), which enforces: opt-in flag, per-isolate request throttle,
 * per-isolate daily Neuron budget (estimated), hard max_tokens, timeout, and never throws — callers
 * always get { ok: false, reason } and fall back to the deterministic engine.
 * Counters are per isolate (in memory): the platform's 10k/day hard stop on the Free plan is the
 * authoritative guarantee; the app cap only adds an earlier, conservative stop.
 */

const env = (name: string) => (typeof process !== 'undefined' ? process.env?.[name]?.trim() : undefined);

/**
 * Default models, chosen by a live benchmark on 2026-11-07 (docs/FREE_AI.md):
 * - Llama 4 Scout: correct subject on 4/4 real photos, 0 invented defects on real photos, read
 *   "VALE A PENA?" and "NÃO COMPRE" exactly, ~16-42 Neurons per image; best prompt rewrites
 *   (Portuguese change notes, no invented settings in 3/4). Image as data URI only.
 * - Rejected: Moondream 3.1 (empty answers over the API), Mistral Small 3.1 (invented defects on
 *   2/4 real photos), Llama 3.1 8B (invented settings in 3/4 rewrites), Llama 3.2 Vision (requires
 *   accepting Meta's license first).
 * Override with FREE_AI_VISION_MODEL / FREE_AI_TEXT_MODEL.
 */
export const WORKERS_AI_MODELS = {
  vision: '@cf/meta/llama-4-scout-17b-16e-instruct',
  text: '@cf/meta/llama-4-scout-17b-16e-instruct',
} as const;

const visionModel = () => env('FREE_AI_VISION_MODEL') || WORKERS_AI_MODELS.vision;
const textModel = () => env('FREE_AI_TEXT_MODEL') || WORKERS_AI_MODELS.text;

// Neurons per million tokens (Workers AI pricing page, 2026-10-20). Unknown models use a high rate.
const NEURONS_PER_M: Record<string, { input: number; output: number }> = {
  '@cf/meta/llama-4-scout-17b-16e-instruct': { input: 24545, output: 77273 },
  '@cf/mistralai/mistral-small-3.1-24b-instruct': { input: 31876, output: 50488 },
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast': { input: 4119, output: 34868 },
};

// Conservative token assumption for one 768px image (measured 565-1580 prompt tokens with Scout).
const IMAGE_TOKENS_ESTIMATE = 1700;

export interface WorkersAiBinding {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

export interface FreeAiStatus {
  enabled: boolean;
  provider: 'workers-ai' | 'none';
  reason?: string;
  remainingNeuronsEstimate?: number;
}

type RunResult<T> = { ok: true; data: T; neurons: number; latencyMs: number } | { ok: false; reason: string };

// ---------- binding resolution ----------

let injectedBinding: WorkersAiBinding | null | undefined;

/** Tests (and benchmarks) inject a binding; production resolves env.AI through OpenNext. */
export function setWorkersAiBindingForTests(binding: WorkersAiBinding | null | undefined): void {
  injectedBinding = binding;
  resetFreeAiCountersForTests();
}

async function resolveBinding(): Promise<WorkersAiBinding | null> {
  if (injectedBinding !== undefined) return injectedBinding;
  try {
    const mod = await import('@opennextjs/cloudflare');
    const ctx = await mod.getCloudflareContext({ async: true });
    const ai = (ctx?.env as Record<string, unknown> | undefined)?.AI as WorkersAiBinding | undefined;
    return ai && typeof ai.run === 'function' ? ai : null;
  } catch {
    return null; // Not running on Workers (tests, plain `next start`).
  }
}

// ---------- limits ----------


export function isFreeAiEnabled(): boolean {
  return env('FREE_AI_PROVIDER') === 'workers-ai';
}

function dailyBudget(): number {
  const n = Number(env('FREE_AI_DAILY_NEURONS') || 8000);
  // Never above the free allocation: this layer must not create a bill even on a paid plan.
  return Math.max(0, Math.min(Number.isFinite(n) ? n : 8000, 9500));
}

function perMinuteLimit(): number {
  const n = Number(env('FREE_AI_MAX_REQUESTS_PER_MINUTE') || 20);
  return Math.max(1, Math.min(Number.isFinite(n) ? n : 20, 120));
}

const counters = { day: '', neurons: 0, minuteStart: 0, minuteCount: 0 };

export function resetFreeAiCountersForTests(): void {
  counters.day = '';
  counters.neurons = 0;
  counters.minuteStart = 0;
  counters.minuteCount = 0;
}

function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function estimateNeurons(model: string, inputTokens: number, outputTokens: number): number {
  const rate = NEURONS_PER_M[model] || { input: 35000, output: 100000 };
  return Math.ceil((inputTokens * rate.input + outputTokens * rate.output) / 1_000_000);
}

export function freeAiStatus(now = Date.now()): FreeAiStatus {
  if (!isFreeAiEnabled()) return { enabled: false, provider: 'none', reason: 'FREE_AI_PROVIDER is not "workers-ai"' };
  const used = counters.day === utcDay(now) ? counters.neurons : 0;
  return { enabled: true, provider: 'workers-ai', remainingNeuronsEstimate: Math.max(0, dailyBudget() - used) };
}

/**
 * Runs one Workers AI call under all limits. `maxOutputTokens` is enforced on the request;
 * `inputTokensEstimate` (including images) is used for the budget check before the call.
 */
export async function runWorkersAi<T = unknown>(
  model: string,
  inputs: Record<string, unknown>,
  opts: { inputTokensEstimate: number; maxOutputTokens: number; timeoutMs?: number; now?: number }
): Promise<RunResult<T>> {
  if (!isFreeAiEnabled()) return { ok: false, reason: 'disabled' };

  const now = opts.now ?? Date.now();
  const today = utcDay(now);
  if (counters.day !== today) {
    counters.day = today;
    counters.neurons = 0;
  }
  if (now - counters.minuteStart >= 60_000) {
    counters.minuteStart = now;
    counters.minuteCount = 0;
  }
  if (counters.minuteCount >= perMinuteLimit()) return { ok: false, reason: 'throttled' };

  const worstCase = estimateNeurons(model, opts.inputTokensEstimate, opts.maxOutputTokens);
  if (counters.neurons + worstCase > dailyBudget()) return { ok: false, reason: 'daily-budget-exhausted' };

  const binding = await resolveBinding();
  if (!binding) return { ok: false, reason: 'no-binding' };

  counters.minuteCount++;
  // Reserve the worst case up front so concurrent requests cannot overshoot the cap.
  counters.neurons += worstCase;
  const started = Date.now();
  try {
    const timeoutMs = opts.timeoutMs ?? 20_000;
    const data = await Promise.race([
      binding.run(model, { ...inputs, max_tokens: opts.maxOutputTokens }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    // Refund the unused reservation when the model reports real usage (Workers AI returns
    // usage.neurons for chat models; otherwise estimate from token counts).
    const usage = (data as { usage?: { prompt_tokens?: number; completion_tokens?: number; neurons?: number } } | null)?.usage;
    let neurons = worstCase;
    if (usage && typeof usage.neurons === 'number' && Number.isFinite(usage.neurons)) {
      neurons = Math.ceil(usage.neurons);
      counters.neurons += neurons - worstCase;
    } else if (usage && typeof usage.prompt_tokens === 'number' && typeof usage.completion_tokens === 'number') {
      neurons = estimateNeurons(model, usage.prompt_tokens, usage.completion_tokens);
      counters.neurons += neurons - worstCase;
    }
    return { ok: true, data: data as T, neurons, latencyMs: Date.now() - started };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Allocation exhausted or plan limit: stop calling for the rest of the UTC day.
    if (/neuron|quota|limit|429|exceed/i.test(message)) counters.neurons = dailyBudget();
    return { ok: false, reason: /timeout/.test(message) ? 'timeout' : 'error' };
  }
}

type ChatOut = { response?: string | null; choices?: { message?: { content?: string | null } }[]; result?: { response?: string } };
// Chat models return the OpenAI shape (choices[0].message.content); older ones return `response`.
const chatText = (d: ChatOut | null | undefined) => d?.choices?.[0]?.message?.content ?? d?.response ?? d?.result?.response;

/** One image + one question (chat format, image as data URI; remote URLs are rejected by Workers AI). */
export async function askImage(imageDataUrl: string, question: string, maxOutputTokens = 400) {
  const res = await runWorkersAi<ChatOut>(
    visionModel(),
    {
      messages: [{ role: 'user', content: [{ type: 'text', text: question }, { type: 'image_url', image_url: { url: imageDataUrl } }] }],
      temperature: 0.2,
    },
    { inputTokensEstimate: IMAGE_TOKENS_ESTIMATE + Math.ceil(question.length / 3), maxOutputTokens }
  );
  if (!res.ok) return res;
  const answer = chatText(res.data);
  return typeof answer === 'string' && answer.trim()
    ? { ...res, data: answer.trim() }
    : ({ ok: false, reason: 'empty-answer' } as const);
}

/** Small text model with a system + user message; returns the raw text. */
export async function askText(system: string, user: string, maxOutputTokens = 700) {
  const res = await runWorkersAi<ChatOut>(
    textModel(),
    { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.3 },
    { inputTokensEstimate: Math.ceil((system.length + user.length) / 3), maxOutputTokens }
  );
  if (!res.ok) return res;
  const text = chatText(res.data);
  return typeof text === 'string' && text.trim()
    ? { ...res, data: text.trim() }
    : ({ ok: false, reason: 'empty-answer' } as const);
}

/** First JSON object in a model answer (models often wrap JSON in prose or code fences). */
export function extractJsonObject<T>(text: string): T | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
