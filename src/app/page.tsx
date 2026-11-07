'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { SimpleHeader } from '@/components/simple/Header';
import { ModeCreate } from '@/components/simple/ModeCreate';
import { ModeImprove } from '@/components/simple/ModeImprove';
import { ModeAnalyze } from '@/components/simple/ModeAnalyze';
import { HistoryModal } from '@/components/simple/HistoryModal';
import { getSimpleHistory } from '@/lib/simpleEngine/history';
import { SimpleHistoryItem } from '@/types/simple';

const subscribeNever = () => () => {};

export default function Home() {
  const [currentMode, setCurrentMode] = useState<'CRIAR' | 'MELHORAR' | 'ANALISAR'>('CRIAR');
  const [historyItems, setHistoryItems] = useState<SimpleHistoryItem[]>(() => {
    return typeof window !== 'undefined' ? getSimpleHistory() : [];
  });
  // false during SSR and hydration, true afterwards: local-only data (history count)
  // is shown only after hydration, so the first client render matches the server HTML.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [showHistory, setShowHistory] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);
  // Cloud AI (free Workers AI and/or an owner-paid provider): offered only when the server has one,
  // OFF until the creator turns it on (opt-in, remembered in this browser). Off = no image or prompt
  // is ever forwarded to any AI service; ANALYZE then runs entirely in the browser.
  const [freeAiAvailable, setFreeAiAvailable] = useState(false);
  const [paidProvider, setPaidProvider] = useState<'openai' | 'gemini' | null>(null);
  const [cloudAiAllowed, setCloudAiAllowed] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem('tas-cloud-ai') === 'on';
    } catch {
      return false;
    }
  });
  const cloudAiAvailable = freeAiAvailable || paidProvider !== null;
  const allowCloudAi = cloudAiAvailable && cloudAiAllowed;

  const toggleCloudAi = () => {
    const next = !cloudAiAllowed;
    setCloudAiAllowed(next);
    try {
      window.localStorage.setItem('tas-cloud-ai', next ? 'on' : 'off');
    } catch {
      // Storage blocked: keep the choice for this session only.
    }
    // The header tooltip is not visible on touch screens: say what changes, every time.
    // Pessoa photos are withheld only from free models; an owner-paid provider receives them.
    handleNotify(next
      ? paidProvider
        ? 'IA na nuvem ligada: thumbnails e referências, inclusive fotos marcadas como Pessoa, vão para a IA configurada.'
        : 'IA na nuvem ligada: thumbnails e referências (exceto as marcadas como Pessoa) vão para a IA. Qualquer imagem pode conter rostos.'
      : 'IA na nuvem desligada: nenhuma imagem vai para IA.');
  };

  // Check server AI status on mount
  useEffect(() => {
    fetch('/api/ai/status')
      .then(res => res.json())
      .then(data => {
        if (data && data.configured) {
          setAiConfigured(true);
        }
        setFreeAiAvailable(Boolean(data?.freeAi?.enabled));
        const provider = data?.director?.provider;
        setPaidProvider(provider === 'openai' || provider === 'gemini' ? provider : null);
      })
      .catch(() => {
        setAiConfigured(false);
      });
  }, []);

  const refreshHistory = () => {
    setHistoryItems(getSimpleHistory());
  };

  const handleNotify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090a0d] text-zinc-100 selection:bg-amber-500 selection:text-zinc-950">
      {/* 1. Header with 3 Modes and History */}
      <SimpleHeader
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        onOpenHistory={() => setShowHistory(true)}
        historyCount={hydrated ? historyItems.length : 0}
        aiConfigured={aiConfigured}
        cloudAi={cloudAiAvailable ? { allowed: cloudAiAllowed, onToggle: toggleCloudAi, paidProvider } : undefined}
      />

      {/* 2. Main Work Area (Pure & Simple, Spacious Creative Canvas) */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* All modes stay mounted (inactive ones hidden) so switching modes
            keeps what the creator typed, uploaded or generated. */}
        <div hidden={currentMode !== 'CRIAR'}>
          <ModeCreate
            onNotify={handleNotify}
            onRefreshHistoryCount={refreshHistory}
            allowCloudAi={allowCloudAi}
          />
        </div>

        <div hidden={currentMode !== 'MELHORAR'}>
          <ModeImprove
            onNotify={handleNotify}
            onRefreshHistoryCount={refreshHistory}
            allowCloudAi={allowCloudAi}
          />
        </div>

        <div hidden={currentMode !== 'ANALISAR'}>
          <ModeAnalyze
            onNotify={handleNotify}
            onRefreshHistoryCount={refreshHistory}
            allowCloudAi={allowCloudAi}
          />
        </div>
      </main>

      {/* 3. Subtle Editorial Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/70 py-6 mt-16 text-center text-xs font-mono text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-semibold text-zinc-400">THUMBNAIL ANTI-SLOP</span>
          <span className="text-zinc-600 font-sans text-xs">Subtrair antes de decorar • Menos efeitos, mais decisões</span>
          <span className="text-zinc-500">
            {allowCloudAi
              ? freeAiAvailable && !paidProvider
                ? 'IA na nuvem: Cloudflare Workers AI (sem retenção) · Built with Llama'
                : 'IA na nuvem ligada'
              : 'IA na nuvem desligada · análise no navegador'}
          </span>
        </div>
      </footer>

      {/* 4. History Modal */}
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        items={historyItems}
        onUpdateItems={setHistoryItems}
        onNotify={handleNotify}
      />

      {/* 5. Minimalist Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/95 border border-amber-500/40 text-amber-300 px-5 py-2.5 rounded-2xl shadow-2xl text-xs font-mono font-medium backdrop-blur-md toast-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
