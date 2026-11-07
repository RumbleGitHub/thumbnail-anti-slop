// Shared visual system for the three workflows (plain Tailwind, no UI framework).
// Hierarchy: a mono eyebrow, a clear page title, one lead sentence, then the work.
// Orange is reserved for the active mode, the primary action and the one thing to look at next.

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0d]';

export const eyebrow = 'font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-amber-500';

export const pageTitle = 'text-2xl font-semibold tracking-tight text-zinc-50 sm:text-[28px] sm:leading-tight';

export const leadText = 'mt-2 max-w-2xl text-[15px] leading-relaxed text-zinc-400';

export const fieldLabel = 'block text-[13px] font-medium text-zinc-200';

export const subLabel = 'block text-xs font-medium text-zinc-400';

export const fieldSurface =
  'w-full rounded-lg border border-zinc-800 bg-[#0c0d11] text-zinc-100 placeholder:text-zinc-600 transition-colors hover:border-zinc-700 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/15';

export const smallField = `${fieldSurface} px-3 py-2.5 text-sm`;

export const secondaryButton = `inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${focusRing}`;

export const secondaryIdle =
  'border-zinc-800 bg-transparent text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900 active:bg-zinc-800';

export const secondaryActive =
  'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:border-amber-500/60 hover:bg-amber-500/15';

/** Primary action. Enabled = orange; the disabled state is neutral so the eye finds the one live action. */
export const primaryButton = `inline-flex h-12 items-center justify-center gap-2.5 rounded-lg px-6 text-sm font-semibold transition-colors ${focusRing}`;

export const primaryReady = 'bg-amber-500 text-zinc-950 hover:bg-amber-400 active:bg-amber-600';

export const primaryBusy = 'cursor-wait bg-amber-500/90 text-zinc-950';

export const primaryIdle = 'cursor-not-allowed border border-zinc-800 bg-zinc-900 text-zinc-500';

/** Main surface of a workflow block: one level only, no cards inside cards. */
export const panelSurface = 'rounded-xl border border-zinc-800/80 bg-[#0d0f13] p-5 sm:p-6';

/** Inset block for generated text (prompts): darker than the surface it sits on. */
export const insetSurface = 'rounded-lg border border-zinc-800/70 bg-[#07080b]';

/** Small uppercase label used for section titles inside a surface. */
export const sectionTitle = 'font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500';

/** Segmented option (radio-like). */
export function segmentClass(selected: boolean): string {
  return `h-9 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors sm:text-[13px] ${focusRing} ${
    selected ? 'bg-zinc-700 text-zinc-50' : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100'
  }`;
}

/** Loading placeholder: neutral bars sized like the content they stand for. */
export const skeletonBar = 'animate-pulse rounded bg-zinc-800/70';
