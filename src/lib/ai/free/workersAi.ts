/**
 * Cloudflare Workers AI — the zero-spend hosted AI layer.
 *
 * Why Workers AI (docs checked 2026-11-07):
 * - 10,000 Neurons/day free; on the Workers FREE plan further calls fail with an error (no charge).
 *   On Workers PAID, usage above the allocation is billed, so FREE_AI_DAILY_NEURONS keeps an app-side cap.
 * - No API key: the Worker's `AI` binding authenticates with the account itself.
 * - Cloudflare does not train on Customer Content and keeps zero data retention for standard inference.
 *
 * Every call goes through runWorkersAi(), which enforces: opt-in flag, a global per-minute throttle
 * and daily Neuron cap (FREE_AI_BUDGET Durable Object, shared by all instances), hard max_tokens and
 * a timeout, and never throws: callers get { ok: false, reason } and fall back to the deterministic
 * engine. On the Workers Free plan the platform's 10,000 Neurons/day stop is the final guarantee.
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

import { emptyLedger, reserve as reserveLocal, settle as settleLocal, exhaust as exhaustLocal, used as usedLocal, type LedgerState, type ReserveResult } from './budgetLedger.ts';

type RunResult<T> = { ok: true; data: T; neurons: number; latencyMs: number } | { ok: false; reason: string };

// ---------- binding resolution ----------

/** Global budget ledger (Durable Object RPC stub); see budgetDurableObject.ts. */
export interface BudgetStub {
  reserve(amount: number, dailyLimit: number, perMinute: number, now: number): Promise<ReserveResult & { day: string }>;
  settle(day: string, reserved: number, actual: number): Promise<void>;
  exhaust(day: string, dailyLimit: number): Promise<void>;
  used(now: number): Promise<number>;
}

interface DurableObjectNamespaceLike {
  idFromName(name: string): unknown;
  get(id: unknown): BudgetStub;
}

interface FreeAiEnv {
  ai: WorkersAiBinding | null;
  /** null when not running on Workers with the FREE_AI_BUDGET Durable Object (tests, `next dev`). */
  budget: BudgetStub | null;
}

let injected: FreeAiEnv | undefined;

/** Tests (and benchmarks) inject a binding (and optionally a budget stub); production uses env. */
export function setWorkersAiBindingForTests(binding: WorkersAiBinding | null | undefined, budget: BudgetStub | null = null): void {
  injected = binding === undefined ? undefined : { ai: binding, budget };
  resetFreeAiCountersForTests();
}

async function resolveEnv(): Promise<FreeAiEnv> {
  if (injected !== undefined) return injected;
  try {
    const mod = await import('@opennextjs/cloudflare');
    const ctx = await mod.getCloudflareContext({ async: true });
    const e = (ctx?.env || {}) as Record<string, unknown>;
    const ai = e.AI as WorkersAiBinding | undefined;
    const ns = e.FREE_AI_BUDGET as DurableObjectNamespaceLike | undefined;
    return {
      ai: ai && typeof ai.run === 'function' ? ai : null,
      budget: ns && typeof ns.idFromName === 'function' ? ns.get(ns.idFromName('free-ai-budget')) : null,
    };
  } catch {
    return { ai: null, budget: null }; // Not running on Workers (tests, plain `next start`).
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

// In-process ledger: used only when the global Durable Object is not available.
const localLedger: LedgerState = emptyLedger();

export function resetFreeAiCountersForTests(): void {
  Object.assign(localLedger, emptyLedger());
}

function estimateNeurons(model: string, inputTokens: number, outputTokens: number): number {
  const rate = NEURONS_PER_M[model] || { input: 35000, output: 100000 };
  return Math.ceil((inputTokens * rate.input + outputTokens * rate.output) / 1_000_000);
}

/** Synchronous status for /api/ai/status (in-process view; the global ledger lives in the Durable Object). */
export function freeAiStatus(now = Date.now()): FreeAiStatus {
  if (!isFreeAiEnabled()) return { enabled: false, provider: 'none', reason: 'FREE_AI_PROVIDER is not "workers-ai"' };
  return { enabled: true, provider: 'workers-ai', remainingNeuronsEstimate: Math.max(0, dailyBudget() - usedLocal(localLedger, now)) };
}

/**
 * Runs one Workers AI call under all limits. `maxOutputTokens` is enforced on the request;
 * `inputTokensEstimate` (including images) sets the worst case reserved before the call.
 *
 * Accounting: the worst case is reserved in the global FREE_AI_BUDGET Durable Object (one
 * instance for the account, one call at a time) before calling the model, then settled to the
 * real `usage.neurons`. If the ledger cannot be reached, the call is NOT made (fail closed).
 * Without the Durable Object (tests, `next dev`), the same ledger runs in-process, booked with no
 * await between the check and the reservation.
 */
export async function runWorkersAi<T = unknown>(
  model: string,
  inputs: Record<string, unknown>,
  opts: { inputTokensEstimate: number; maxOutputTokens: number; timeoutMs?: number; now?: number }
): Promise<RunResult<T>> {
  if (!isFreeAiEnabled()) return { ok: false, reason: 'disabled' };

  const { ai, budget } = await resolveEnv();
  if (!ai) return { ok: false, reason: 'no-binding' };

  const now = opts.now ?? Date.now();
  const worstCase = estimateNeurons(model, opts.inputTokensEstimate, opts.maxOutputTokens);

  let day: string;
  if (budget) {
    try {
      const r = await budget.reserve(worstCase, dailyBudget(), perMinuteLimit(), now);
      if (!r.ok) return { ok: false, reason: r.reason };
      day = r.day;
    } catch {
      return { ok: false, reason: 'budget-unavailable' };
    }
  } else {
    const r = reserveLocal(localLedger, worstCase, dailyBudget(), perMinuteLimit(), now);
    if (!r.ok) return { ok: false, reason: r.reason };
    day = localLedger.day;
  }

  const settleTo = async (actual: number) => {
    if (budget) await budget.settle(day, worstCase, actual).catch(() => undefined);
    else settleLocal(localLedger, day, worstCase, actual);
  };

  const started = Date.now();
  try {
    const timeoutMs = opts.timeoutMs ?? 20_000;
    const data = await Promise.race([
      ai.run(model, { ...inputs, max_tokens: opts.maxOutputTokens }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    // Replace the reservation by the real usage (Workers AI returns usage.neurons for chat models).
    const usage = (data as { usage?: { prompt_tokens?: number; completion_tokens?: number; neurons?: number } } | null)?.usage;
    let neurons = worstCase;
    if (usage && typeof usage.neurons === 'number' && Number.isFinite(usage.neurons)) {
      neurons = Math.ceil(usage.neurons);
    } else if (usage && typeof usage.prompt_tokens === 'number' && typeof usage.completion_tokens === 'number') {
      neurons = estimateNeurons(model, usage.prompt_tokens, usage.completion_tokens);
    }
    if (neurons !== worstCase) await settleTo(neurons);
    return { ok: true, data: data as T, neurons, latencyMs: Date.now() - started };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const quota = /neuron|quota|limit|429|exceed/i.test(message);
    // Allocation exhausted or plan limit: stop calling for the rest of the UTC day.
    if (quota) {
      if (budget) await budget.exhaust(day, dailyBudget()).catch(() => undefined);
      else exhaustLocal(localLedger, day, dailyBudget());
    }
    // A failed call keeps its worst-case reservation (conservative).
    return { ok: false, reason: /timeout/.test(message) ? 'timeout' : quota ? 'platform-quota' : 'error' };
  }
}

type ChatOut = { response?: string | null; choices?: { message?: { content?: string | null } }[]; result?: { response?: string } };
// Chat models return the OpenAI shape (choices[0].message.content); older ones return `response`.
const chatText = (d: ChatOut | null | undefined) => d?.choices?.[0]?.message?.content ?? d?.response ?? d?.result?.response;

/** One image + one question (chat format, image as data URI; remote URLs are rejected by Workers AI). */
/**
 * Largest image data URL sent to the vision model. The browser sends 768px JPEGs (~50-250 KB);
 * the public API could be called directly with much larger images, whose Neuron cost would exceed
 * the per-call reservation. Over the cap = no call (the route falls back to local results).
 */
export const MAX_IMAGE_DATA_URL_CHARS = 1_500_000;

export async function askImage(imageDataUrl: string, question: string, maxOutputTokens = 400) {
  if (imageDataUrl.length > MAX_IMAGE_DATA_URL_CHARS) return { ok: false, reason: 'image-too-large' } as const;
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
  if (start < 0) return null;
  const end = text.lastIndexOf('}');
  const candidates = [
    end > start ? text.slice(start, end + 1) : '',
    // Seen live with Llama 4 Scout through the Workers binding: the final "}" is sometimes missing.
    text.slice(start).replace(/```[\s\S]*$/, '').trimEnd() + '}',
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      return JSON.parse(c) as T;
    } catch {
      // try the next candidate
    }
  }
  return null;
}
