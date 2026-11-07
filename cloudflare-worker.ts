// Custom Worker entry (OpenNext "custom worker" pattern): the generated Next.js handler plus the
// Durable Object that keeps the global free-AI budget. Built by `opennextjs-cloudflare build`
// first; wrangler bundles this file as `main`.
// Generated at build time by opennextjs-cloudflare (not in the repo); this file is excluded from tsconfig.
import handler from './.open-next/worker.js';

export { FreeAiBudget } from './src/lib/ai/free/budgetDurableObject.ts';

export default handler;
