'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import { WalToken } from '@/components/ui/Brand';
import { MnemosLogo } from '@/components/ui/Logo';
import type { SynthesisDocument } from '@/types';

interface BlobDetail {
  blob_id: string;
  synthesis?: SynthesisDocument;
  raw?: Record<string, unknown>;
  workspace_id?: string;
  memory_type?: string;
  importance?: number;
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() =>
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1300);
        }).catch(() => {})
      }
      className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
    >
      <Icon name={copied ? 'check' : 'copy'} size={13} />
      {copied ? 'Copied' : 'Copy ID'}
    </button>
  );
}

export default function MemoryDetail({ detail, onBack }: { detail: BlobDetail; onBack: () => void }) {
  const aggregator =
    process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ??
    'https://aggregator.walrus-testnet.walrus.space';
  const synth = detail.synthesis;
  const hasSynth = !!synth && Array.isArray(synth.themes) && synth.themes.length > 0;
  const confidence = hasSynth ? Math.round((synth!.confidence ?? 0) * 100) : null;
  const goal = synth?.synthesis_goal?.replace(/^Synthesize findings on:\s*/i, '') ?? 'Stored memory';
  const gaps = synth?.knowledge_gaps ?? [];

  return (
    <div className="anim-fade-up">
      {/* back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors mb-6"
      >
        <Icon name="arrow-right" size={15} className="rotate-180" />
        All memories
      </button>

      {/* header */}
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-8 h-8 rounded-full border border-[var(--line)] bg-[var(--card)] flex items-center justify-center flex-shrink-0">
          <MnemosLogo size={17} />
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[var(--faint)]">
            {detail.workspace_id ?? 'Memory'}
          </span>
          {detail.memory_type && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--line)] capitalize">{detail.memory_type}</span>
          )}
          {confidence != null && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full grad-bg text-white">{confidence}% confident</span>
          )}
        </div>
      </div>

      <h1 className="text-[1.6rem] sm:text-[1.9rem] font-bold tracking-tight leading-snug mb-6">{goal}</h1>

      {/* themes */}
      {hasSynth && (
        <div className="space-y-3.5 mb-7">
          {synth!.themes.map((theme, i) => (
            <div key={i} className="anim-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg grad-bg text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">{i + 1}</span>
                <h3 className="text-[15px] font-semibold leading-snug">{theme.label}</h3>
              </div>
              {theme.supporting_findings?.length > 0 && (
                <ul className="mt-1.5 space-y-1.5" style={{ paddingLeft: '2.125rem' }}>
                  {theme.supporting_findings.slice(0, 3).map((f, j) => (
                    <li key={j} className="flex gap-2.5 text-[14px] text-[var(--muted)] leading-relaxed">
                      <span className="mt-2 flex-shrink-0 w-1 h-1 rounded-full bg-[var(--faint)]" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* open questions */}
      {gaps.length > 0 && (
        <div className="mb-7">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--faint)] mb-2.5">Open questions</p>
          <ul className="space-y-1.5">
            {gaps.map((gap, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-[var(--muted)] leading-relaxed">
                <span className="text-[var(--faint)] flex-shrink-0">·</span>
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!hasSynth && (
        <p className="text-sm text-[var(--faint)] mb-7">This memory has no synthesized summary.</p>
      )}

      {/* Walrus proof */}
      <div className="rounded-2xl overflow-hidden border border-[var(--line)]">
        <div className="grad-bg px-4 py-2.5 flex items-center gap-2 text-white">
          <WalToken size={17} variant="white" />
          <span className="text-[11px] font-semibold tracking-widest uppercase text-white/90">Walrus proof</span>
          <span className="ml-auto"><CopyBtn value={detail.blob_id} /></span>
        </div>
        <div className="bg-[var(--card)] px-4 py-3.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="font-mono text-xs text-[var(--muted)] break-all flex-1 min-w-0">{detail.blob_id}</p>
          <a
            href={`${aggregator}/v1/blobs/${detail.blob_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-[var(--line)] hover:border-[var(--ink)] transition-colors flex-shrink-0"
          >
            Verify on Walrus
            <Icon name="arrow-up-right" size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}
