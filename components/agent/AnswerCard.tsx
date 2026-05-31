'use client';

import { useState } from 'react';
import type { SynthesisDocument } from '@/types';
import Icon from '@/components/ui/Icon';
import { MnemosLogo } from '@/components/ui/Logo';
import { WalToken } from '@/components/ui/Brand';
import MessageActions from '@/components/agent/MessageActions';

type StoreState = 'saving' | 'saved' | 'skipped';

interface AnswerCardProps {
  query: string;
  synthesis: SynthesisDocument;
  blobId?: string;
  durationMs?: number;
  sessionId?: string;
  createdAt?: number;
  storeState?: StoreState;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      onClick={copy}
      aria-label={`Copy ${label}`}
      className="inline-flex items-center gap-1 font-medium text-white/90 hover:text-white transition-colors"
    >
      <Icon name={copied ? 'check' : 'copy'} size={12} />
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function AnswerCard({ synthesis, blobId, durationMs, sessionId, createdAt, storeState }: AnswerCardProps) {
  const aggregator =
    process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ??
    'https://aggregator.walrus-testnet.walrus.space';

  const confidence = Math.round((synthesis.confidence ?? 0) * 100);
  const delta = synthesis.confidence_delta ?? 0;
  const themes = synthesis.themes ?? [];
  const gaps = synthesis.knowledge_gaps ?? [];
  const contradictions = synthesis.contradictions ?? [];
  const goal = synthesis.synthesis_goal?.replace(/^Synthesize findings on:\s*/i, '') ?? '';

  const stored = createdAt
    ? new Date(createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  // Plain-text rendering of the answer for the Copy action.
  const plainText = [
    goal,
    ...themes.map((t) => `${t.label}\n${(t.supporting_findings ?? []).map((f) => `  - ${f}`).join('\n')}`),
    gaps.length ? `Open questions:\n${gaps.map((g) => `  - ${g}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n');

  return (
    <div className="anim-fade-up">
      {/* header */}
      <div className="flex items-center flex-wrap gap-2.5 mb-5">
        <span className="flex-shrink-0 w-9 h-9 rounded-full border border-[var(--line)] bg-[var(--card)] flex items-center justify-center">
          <MnemosLogo size={20} />
        </span>
        <span className="text-[15px] font-bold">Mnemos</span>
        <span className="text-[11px] font-semibold text-white px-2.5 py-1 rounded-full grad-bg">
          {confidence}% confident
        </span>
        {delta !== 0 && (
          <span
            className={`text-[11px] font-semibold rounded-full px-2.5 py-1 ${
              delta > 0 ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#b91c1c]'
            }`}
          >
            {delta > 0 ? '↑ +' : '↓ '}{Math.abs(Math.round(delta * 100))}% vs. prior
          </span>
        )}
        {durationMs ? <span className="text-[11px] text-[var(--faint)] ml-auto">{(durationMs / 1000).toFixed(1)}s</span> : null}
      </div>

      {/* title */}
      {goal && (
        <h2 className="text-[1.5rem] sm:text-[1.8rem] font-bold tracking-tight leading-snug mb-6">{goal}</h2>
      )}

      {/* themes — readable answer sections */}
      <div className="space-y-6">
        {themes.map((theme, i) => (
          <div key={i} className="anim-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-start gap-2.5 mb-2">
              <span className="mt-0.5 w-6 h-6 rounded-lg grad-bg text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                {i + 1}
              </span>
              <h3 className="text-[17px] font-semibold leading-snug">{theme.label}</h3>
            </div>
            {theme.supporting_findings?.length > 0 && (
              <ul className="space-y-2" style={{ paddingLeft: '2.125rem' }}>
                {theme.supporting_findings.map((f, j) => (
                  <li key={j} className="flex gap-3 text-[15.5px] text-[var(--muted)] leading-[1.7]">
                    <span className="mt-2.5 flex-shrink-0 w-1.5 h-1.5 rounded-full grad-bg" />
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* open questions */}
      {gaps.length > 0 && (
        <div className="mt-7 rounded-2xl bg-[var(--card)] border border-[var(--line)] p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Icon name="question" size={15} className="text-[#a855f7]" />
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--faint)]">Open questions</p>
          </div>
          <ul className="space-y-1.5">
            {gaps.map((gap, i) => (
              <li key={i} className="flex gap-2.5 text-[14.5px] text-[var(--muted)] leading-relaxed">
                <span className="text-[var(--faint)] flex-shrink-0">·</span>
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* tensions */}
      {contradictions.length > 0 && (
        <div className="mt-5 rounded-2xl bg-[var(--card)] border border-[var(--line)] p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Icon name="merge" size={15} className="text-[#f59e0b]" />
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--faint)]">Tensions</p>
          </div>
          <ul className="space-y-2">
            {contradictions.map((c, i) => (
              <li key={i} className="text-[14.5px] text-[var(--muted)] leading-relaxed">
                <span className="font-medium text-[var(--ink)]">{c.claim_a}</span>
                <span className="text-[var(--faint)]"> vs. </span>
                <span className="font-medium text-[var(--ink)]">{c.claim_b}</span>
                {c.resolution && <span className="block text-[var(--faint)] mt-0.5">→ {c.resolution}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* actions */}
      <MessageActions text={plainText} />

      {/* Walrus storage state */}
      <div className="mt-5">
        {storeState === 'saving' && (
          <div className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--muted)] rounded-full border border-[var(--line)] bg-[var(--card)] px-3.5 py-2">
            <span className="w-1.5 h-1.5 rounded-full grad-bg animate-pulse" />
            Saving memory to Walrus…
          </div>
        )}

        {storeState === 'skipped' && (
          <p className="inline-flex items-center gap-1.5 text-[12px] text-[var(--faint)]">
            <Icon name="database" size={13} />
            Not stored — nothing new worth remembering.
          </p>
        )}

        {storeState === 'saved' && blobId && (
          <div className="rounded-2xl overflow-hidden border-[1.5px] border-[var(--ink)]">
            <div className="grad-bg px-4 py-2.5 flex items-center gap-2 text-white">
              <WalToken size={17} variant="white" />
              <span className="text-[11px] font-semibold tracking-widest uppercase text-white/90">Stored on Walrus</span>
              <span className="ml-auto"><CopyButton value={blobId} label="blob ID" /></span>
            </div>
            <div className="bg-[var(--card)] px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-mono text-xs text-[var(--muted)] break-all flex-1 min-w-0">{blobId}</span>
              <a
                href={`${aggregator}/v1/blobs/${blobId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-[var(--line)] hover:border-[var(--ink)] transition-colors flex-shrink-0"
              >
                Verify on Walrus
                <Icon name="arrow-up-right" size={13} />
              </a>
              {sessionId && <span className="text-[11px] text-[var(--faint)] font-mono w-full">session {sessionId.slice(0, 8)}{stored ? ` · ${stored}` : ''}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
