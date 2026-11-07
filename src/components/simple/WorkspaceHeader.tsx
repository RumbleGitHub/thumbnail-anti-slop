import React from 'react';
import { eyebrow, pageTitle, leadText } from './ui';

/** Top of every workflow: where you are, what the screen does, one sentence of guidance. */
export function WorkspaceHeader({ step, title, lead, aside }: { step: string; title: string; lead: string; aside?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-zinc-800/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className={eyebrow}>{step}</p>
        <h2 className={`${pageTitle} mt-2`}>{title}</h2>
        <p className={leadText}>{lead}</p>
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </header>
  );
}
