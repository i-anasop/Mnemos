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
      className="inline-flex items-center gap-1 font-medium text-[#6b6b66] hover:text-[#0e0e0e] transition-colors"
    >
      <Icon name={copied ? 'check' : 'copy'} size={12} />
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function AnswerCard({ synthesis, blobId, durationMs, sessionId, createdAt }: AnswerCardProps) {
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
    <div className="anim-fade-up flex gap-3 sm:gap-4">
      {/* avatar */}
      <span className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full border border-[#e6e4dc] bg-white flex items-center justify-center">
        <MnemosLogo size={18} />
      </span>

      {/* answer body */}
      <div className="flex-1 min-w-0">
        {/* name + confidence */}
        <div className="flex items-center flex-wrap gap-2 mb-4">
          <span className="text-sm font-semibold">Mnemos</span>
          <span className="text-[11px] font-medium text-[#6b6b66] bg-[#efeee9] rounded-full px-2 py-0.5">
            {confidence}% confident
          </span>
          {delta !== 0 && (
            <span
              className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${
                delta > 0 ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#b91c1c]'
              }`}
            >
              {delta > 0 ? '↑ +' : '↓ '}{Math.abs(Math.round(delta * 100))}% vs. prior
            </span>
          )}
          {durationMs ? <span className="text-[11px] text-[#b3b1a8]">{(durationMs / 1000).toFixed(1)}s</span> : null}
        </div>

        {/* themes — clean sections */}
        <div className="space-y-5">
          {themes.map((theme, i) => (
            <div key={i} className="anim-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <h3 className="text-[15px] font-semibold mb-1.5">{theme.label}</h3>
              {theme.supporting_findings?.length > 0 && (
                <ul className="space-y-1.5">
                  {theme.supporting_findings.map((f, j) => (
                    <li key={j} className="flex gap-2.5 text-[15px] text-[#3a3a35] leading-relaxed">
                      <span className="mt-[0.6rem] flex-shrink-0 w-1 h-1 rounded-full bg-[#c2c0b5]" />
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
          <div className="mt-6">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[#9a9a93] mb-2">Open questions</p>
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

        {/* tensions */}
        {contradictions.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[#9a9a93] mb-2">Tensions</p>
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

        {/* Walrus receipt — compact, subtle */}
        {blobId && (
          <div className="mt-6 pt-4 border-t border-[#ece9e0] flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#0e0e0e]">
              <WalToken size={15} variant="color" />
              Stored on Walrus
            </span>
            <span className="font-mono text-[#9a9a93]">{blobId.slice(0, 14)}…</span>
            <CopyButton value={blobId} label="blob ID" />
            <a
              href={`${aggregator}/v1/blobs/${blobId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[#6b6b66] hover:text-[#0e0e0e] transition-colors"
            >
              Verify
              <Icon name="arrow-up-right" size={12} />
            </a>
            {sessionId && <span className="text-[#b3b1a8] font-mono">· {sessionId.slice(0, 8)}</span>}
            {stored && <span className="text-[#b3b1a8]">· {stored}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
