// Shared class names for the minimalist interface (no UI framework, plain Tailwind).
// Orange is reserved for the active mode, the primary action and meaningful states.

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0d]';

export const fieldLabel = 'block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300';

export const subLabel = 'block text-xs font-medium text-zinc-400';

export const fieldSurface =
  'w-full rounded-xl border border-zinc-800 bg-[#111216] text-zinc-100 placeholder:text-zinc-500 transition-colors hover:border-zinc-700 focus:border-amber-500/70 focus:outline-none focus:ring-2 focus:ring-amber-500/20';

export const smallField = `${fieldSurface} px-3.5 py-2.5 text-sm`;

export const secondaryButton = `inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${focusRing}`;

export const secondaryIdle =
  'border-zinc-800 bg-transparent text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900 active:bg-zinc-800';

export const secondaryActive =
  'border-amber-500/50 bg-amber-500/10 text-amber-200 hover:border-amber-500/70 hover:bg-amber-500/15';

export const panelSurface = 'rounded-xl border border-zinc-800 bg-[#0e0f12] p-4 sm:p-5';

/** Segmented option (radio-like). */
export function segmentClass(selected: boolean): string {
  return `h-9 whitespace-nowrap rounded-lg px-2 text-xs font-medium transition-colors sm:px-3 sm:text-[13px] ${focusRing} ${
    selected ? 'bg-zinc-700 text-zinc-50' : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100'
  }`;
}
