// Minimal declarations for the Workers runtime module used by the Durable Object
// (avoids adding @cloudflare/workers-types; wrangler bundles the real module).
declare module 'cloudflare:workers' {
  export abstract class DurableObject<Env = unknown> {
    protected ctx: {
      storage: {
        get<T>(key: string): Promise<T | undefined>;
        put<T>(key: string, value: T): Promise<void>;
      };
    };
    protected env: Env;
    constructor(ctx: unknown, env: Env);
  }
}
