'use client';

import MemoryExplorer from '@/components/memory/MemoryExplorer';
import Icon from '@/components/ui/Icon';
import type { BlobMetadata, SynthesisDocument } from '@/types';

interface BlobDetail {
  blob_id: string;
  synthesis?: SynthesisDocument;
  raw?: Record<string, unknown>;
}

interface MemoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  blobs: BlobMetadata[];
  selectedBlobId: string | null;
  onSelect: (blobId: string) => void;
  isLoading: boolean;
  blobDetail: BlobDetail | null;
  onBack: () => void;
}

function isSynthesis(d?: SynthesisDocument): boolean {
  return !!d && Array.isArray(d.themes) && d.themes.length > 0;
}

function DetailView({ detail, onBack }: { detail: BlobDetail; onBack: () => void }) {
  const aggregator =
    process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ??
    'https://aggregator.walrus-testnet.walrus.space';
  const synth = detail.synthesis;

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-5 py-4 text-sm font-medium text-[#6b6b66] hover:text-[#0e0e0e] transition-colors border-b border-[#e6e4dc]"
      >
        <Icon name="arrow-right" size={15} className="rotate-180" />
        Back to memories
      </button>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Walrus proof */}
        <div className="card-bold p-4 grad-bg">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-white/80 mb-1.5">
            Walrus blob ID
          </p>
          <p className="font-mono text-xs text-white break-all leading-relaxed">{detail.blob_id}</p>
          <a
            href={`${aggregator}/v1/blobs/${detail.blob_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 pill bg-white text-[#0e0e0e] text-xs px-3.5 py-1.5"
          >
            Verify on Walrus ↗
          </a>
        </div>

        {/* Human summary */}
        {isSynthesis(synth) ? (
          <>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-[#9a9a93] mb-3">
                Themes
              </p>
              <div className="space-y-2.5">
                {synth!.themes.map((theme, i) => (
                  <div key={i} className="card-soft p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">{theme.label}</p>
                      <span className="text-[11px] text-[#9a9a93]">
                        {((theme.strength ?? 0.5) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#f0eee8] rounded-full overflow-hidden">
                      <div
                        className="h-full grad-bg rounded-full transition-all"
                        style={{ width: `${(theme.strength ?? 0.5) * 100}%` }}
                      />
                    </div>
                    {theme.supporting_findings?.length > 0 && (
                      <ul className="mt-2.5 space-y-1">
                        {theme.supporting_findings.slice(0, 3).map((f, j) => (
                          <li key={j} className="text-xs text-[#6b6b66] flex gap-2 leading-relaxed">
                            <span className="text-[#c2c0b5] flex-shrink-0">·</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {synth!.knowledge_gaps?.length > 0 && (
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-[#9a9a93] mb-3">
                  Open questions
                </p>
                <ul className="space-y-1.5">
                  {synth!.knowledge_gaps.map((gap, i) => (
                    <li key={i} className="text-sm text-[#6b6b66] flex gap-2 leading-relaxed">
                      <span className="text-[#c2c0b5] flex-shrink-0 mt-0.5">?</span>
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-[#9a9a93]">
            This blob has no synthesized summary. View the raw payload below.
          </p>
        )}

        {/* Raw JSON — collapsed by default */}
        <details className="card-soft overflow-hidden">
          <summary className="cursor-pointer select-none px-4 py-3 text-xs font-semibold tracking-widest uppercase text-[#9a9a93] hover:text-[#0e0e0e] transition-colors">
            Raw JSON
          </summary>
          <pre className="text-[11px] font-mono text-[#6b6b66] bg-[#faf9f5] p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed border-t border-[#e6e4dc]">
            {JSON.stringify(detail.raw, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

export default function MemoryDrawer({
  isOpen,
  onClose,
  blobs,
  selectedBlobId,
  onSelect,
  isLoading,
  blobDetail,
  onBack,
}: MemoryDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-[#0e0e0e]/30 backdrop-blur-[2px] anim-overlay"
        onClick={onClose}
      />

      {/* panel */}
      <aside className="relative w-full max-w-md h-full bg-[#f6f5f1] border-l-[1.5px] border-[#0e0e0e] shadow-[-24px_0_60px_-24px_rgba(0,0,0,0.35)] anim-drawer flex flex-col">
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#e6e4dc] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg grad-bg flex items-center justify-center">
              <Icon name="layers" size={15} className="text-white" />
            </span>
            <h2 className="text-base font-bold">Memory on Walrus</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close memory drawer"
            className="w-8 h-8 rounded-full border border-[#e6e4dc] hover:border-[#0e0e0e] flex items-center justify-center text-[#6b6b66] hover:text-[#0e0e0e] transition-colors"
          >
            <Icon name="close" size={15} />
          </button>
        </header>

        <div className="flex-1 overflow-hidden">
          {blobDetail ? (
            <DetailView detail={blobDetail} onBack={onBack} />
          ) : (
            <div className="h-full overflow-y-auto">
              <MemoryExplorer
                blobs={blobs}
                selectedBlobId={selectedBlobId}
                onSelect={onSelect}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
