/**
 * Daily Neuron ledger for the free AI layer. Pure and synchronous: the caller must make each
 * reserve() atomic (a Durable Object processes one call at a time; in-process callers run it
 * without awaiting in between).
 *
 * reserve() books the worst case before the model call; settle() replaces it with the real
 * usage afterwards; exhaust() locks the rest of the UTC day when the platform reports the
 * allocation is used up.
 */
export interface LedgerState {
  day: string;
  neurons: number;
  minuteStart: number;
  minuteCount: number;
}

export type ReserveResult = { ok: true } | { ok: false; reason: 'throttled' | 'daily-budget-exhausted' };

export function emptyLedger(): LedgerState {
  return { day: '', neurons: 0, minuteStart: 0, minuteCount: 0 };
}

export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function roll(state: LedgerState, now: number): void {
  const today = utcDay(now);
  if (state.day !== today) {
    state.day = today;
    state.neurons = 0;
  }
  if (now - state.minuteStart >= 60_000) {
    state.minuteStart = now;
    state.minuteCount = 0;
  }
}

export function reserve(state: LedgerState, amount: number, dailyLimit: number, perMinute: number, now: number): ReserveResult {
  roll(state, now);
  if (state.minuteCount >= perMinute) return { ok: false, reason: 'throttled' };
  if (state.neurons + amount > dailyLimit) return { ok: false, reason: 'daily-budget-exhausted' };
  state.minuteCount++;
  state.neurons += amount;
  return { ok: true };
}

/** Replaces a reservation by the measured usage (same UTC day only). */
export function settle(state: LedgerState, day: string, reserved: number, actual: number): void {
  if (state.day !== day) return;
  state.neurons = Math.max(0, state.neurons + actual - reserved);
}

export function exhaust(state: LedgerState, day: string, dailyLimit: number): void {
  if (state.day === day) state.neurons = Math.max(state.neurons, dailyLimit);
}

export function used(state: LedgerState, now: number): number {
  return state.day === utcDay(now) ? state.neurons : 0;
}
