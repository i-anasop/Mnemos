'use client';

import { useState } from 'react';
import type { SynthesisDocument } from '@/types';
import Icon from '@/components/ui/Icon';
import { MnemosLogo } from '@/components/ui/Logo';
import { WalToken } from '@/components/ui/Brand';

interface AnswerCardProps {
  query: string;
  synthesis: SynthesisDocument;
  blobId?: string;
  durationMs?: number;
  sessionId?: string;
  createdAt?: number;
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
      className="inline-flex items-center gap-1.5 pill text-[11px] font-semibold px-2.5 py-1 bg-[#0e0e0e] text-white hover:opacity-90 transition-opacity"
    >
      <Icon name={copied ? 'check' : 'copy'} size={12} className="text-white" />
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function AnswerCard({ query, synthesis, blobId, durationMs, sessionId, createdAt }: AnswerCardProps) {
  const aggregator =
    process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ??
    'https://aggregator.walrus-testnet.walrus.space';

  const confidence = Math.round((synthesis.confidence ?? 0) * 100);
  const delta = synthesis.confidence_delta ?? 0;
  const themes = synthesis.themes ?? [];
  const gaps = synthesis.knowledge_gaps ?? [];
  const contradictions = synthesis.contradictions ?? [];

  const stored = createdAt
    ? new Date(createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="anim-fade-up bg-white border-[1.5px] border-[#0e0e0e] rounded-[1.75rem] shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f0eee8]">
        <div className="flex items-center gap-2.5">
          <MnemosLogo size={28} />
          <div className="leading-tight">
            <p className="text-sm font-bold">Mnemos</p>
            <p className="text-[11px] text-[#9a9a93] uppercase tracking-widest">Intelligence brief</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {delta !== 0 && (
            <span
              className={`pill text-[11px] font-semibold px-2.5 py-1 ${
                delta > 0 ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#b91c1c]'
              }`}
            >
              {delta > 0 ? '↑' : '↓'} {delta > 0 ? '+' : ''}{Math.round(delta * 100)}%
            </span>
          )}
          <span className="pill grad-bg text-white text-[11px] font-semibold px-3 py-1">
            {confidence}% confident
          </span>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Query restated as title */}
        <div>
          <h2 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight leading-snug">{query}</h2>
          <p className="text-[13px] text-[#9a9a93] mt-2">
            {themes.length} theme{themes.length !== 1 ? 's' : ''}
            {gaps.length > 0 ? ` · ${gaps.length} open question${gaps.length !== 1 ? 's' : ''}` : ''}
            {durationMs ? ` · ${(durationMs / 1000).toFixed(1)}s` : ''}
          </p>
        </div>

        {/* Themes */}
        {themes.length > 0 && (
          <div className="space-y-5">
            {themes.map((theme, i) => (
              <div key={i} className="anim-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-6 h-6 rounded-lg grad-bg text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <h3 className="text-base font-semibold leading-snug flex-1">{theme.label}</h3>
                  <span className="text-[11px] font-mono text-[#9a9a93] flex-shrink-0">
                    {Math.round((theme.strength ?? 0.5) * 100)}%
                  </span>
                </div>
                {theme.supporting_findings?.length > 0 && (
                  <ul className="space-y-1.5" style={{ paddingLeft: '2.125rem' }}>
                    {theme.supporting_findings.map((f, j) => (
                      <li key={j} className="flex gap-2.5 text-[15px] text-[#4a4a45] leading-relaxed">
                        <span className="flex-shrink-0 mt-2 block w-1.5 h-1.5 rounded-full grad-bg" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Open questions */}
        {gaps.length > 0 && (
          <div className="rounded-2xl bg-[#faf9f5] border border-[#f0eee8] p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Icon name="question" size={16} className="text-[#a855f7]" />
              <p className="text-xs font-semibold tracking-widest uppercase text-[#9a9a93]">Open questions</p>
            </div>
            <ul className="space-y-1.5">
              {gaps.map((gap, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-[#6b6b66] leading-relaxed">
                  <span className="text-[#c2c0b5] flex-shrink-0">·</span>
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Contradictions */}
        {contradictions.length > 0 && (
          <div className="rounded-2xl bg-[#fffaf0] border border-[#fde9c8] p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Icon name="merge" size={16} className="text-[#f59e0b]" />
              <p className="text-xs font-semibold tracking-widest uppercase text-[#b88207]">Tensions found</p>
            </div>
            <ul className="space-y-2">
              {contradictions.map((c, i) => (
                <li key={i} className="text-sm text-[#6b6b66] leading-relaxed">
                  <span className="font-medium text-[#0e0e0e]">{c.claim_a}</span>
                  <span className="text-[#c2c0b5]"> vs. </span>
                  <span className="font-medium text-[#0e0e0e]">{c.claim_b}</span>
                  {c.resolution && <span className="block text-[#9a9a93] mt-0.5">→ {c.resolution}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Walrus receipt */}
        {blobId && (
          <div className="rounded-2xl border-[1.5px] border-[#0e0e0e] overflow-hidden">
            <div className="grad-bg px-4 py-2.5 flex items-center gap-2 text-white">
              <WalToken size={18} variant="white" />
              <span className="text-[11px] font-semibold tracking-widest uppercase text-white/90">Stored on Walrus</span>
              <span className="ml-auto text-[10px] font-mono text-white/70">receipt</span>
            </div>
            <div className="bg-white p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-[#9a9a93]">Blob ID</p>
                  <p className="font-mono text-xs text-[#0e0e0e] truncate">{blobId}</p>
                </div>
                <CopyButton value={blobId} label="blob ID" />
              </div>
              <div className="grid grid-cols-2 gap-3 receipt-edge pt-2.5">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-[#9a9a93]">Session</p>
                  <p className="font-mono text-xs text-[#4a4a45] truncate">{sessionId ? sessionId.slice(0, 12) : '—'}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-[#9a9a93]">Stored</p>
                  <p className="text-xs text-[#4a4a45] truncate">{stored ?? 'just now'}</p>
                </div>
              </div>
              <a
                href={`${aggregator}/v1/blobs/${blobId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-1 inline-flex items-center gap-1.5 pill pill-outline text-xs px-3.5 py-1.5"
              >
                Verify on Walrus
                <Icon name="arrow-up-right" size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
