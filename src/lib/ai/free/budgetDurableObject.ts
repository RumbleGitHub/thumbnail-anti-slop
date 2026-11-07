import { DurableObject } from 'cloudflare:workers';
import { emptyLedger, exhaust, reserve, settle, used, type LedgerState, type ReserveResult } from './budgetLedger.ts';

/**
 * One global Neuron ledger for the whole account (all Worker instances and isolates), stored in a
 * SQLite-backed Durable Object (included in the Workers Free plan). A Durable Object instance
 * handles one call at a time, so reserve() cannot be raced by concurrent requests.
 *
 * Exported from cloudflare-worker.ts; bound as FREE_AI_BUDGET in wrangler.jsonc. Previews get
 * their own namespace automatically, so preview traffic is accounted separately.
 */
export class FreeAiBudget extends DurableObject {
  private state: LedgerState | null = null;

  private async load(): Promise<LedgerState> {
    if (!this.state) this.state = (await this.ctx.storage.get<LedgerState>('ledger')) || emptyLedger();
    return this.state;
  }

  private async save(): Promise<void> {
    if (this.state) await this.ctx.storage.put('ledger', this.state);
  }

  async reserve(amount: number, dailyLimit: number, perMinute: number, now: number): Promise<ReserveResult & { day: string }> {
    const state = await this.load();
    const result = reserve(state, amount, dailyLimit, perMinute, now);
    await this.save();
    return { ...result, day: state.day };
  }

  async settle(day: string, reserved: number, actual: number): Promise<void> {
    settle(await this.load(), day, reserved, actual);
    await this.save();
  }

  async exhaust(day: string, dailyLimit: number): Promise<void> {
    exhaust(await this.load(), day, dailyLimit);
    await this.save();
  }

  async used(now: number): Promise<number> {
    return used(await this.load(), now);
  }
}
