'use client';

import type { BlobMetadata } from '@/types';
import { aggregatorUrl } from '@/lib/walrus/client';

interface MemoryExplorerProps {
  blobs: BlobMetadata[];
  selectedBlobId: string | null;
  onSelect: (blobId: string) => void;
  isLoading: boolean;
}

const TYPE_META: Record<string, { label: string; fill: string }> = {
  synthesis_document: { label: 'Synthesis', fill: 'var(--lavender)' },
  research_report:    { label: 'Research',  fill: 'var(--sky)' },
  session_snapshot:   { label: 'Snapshot',  fill: 'var(--mint)' },
  embedding_index:    { label: 'Index',     fill: 'var(--butter)' },
};

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function MemoryExplorer({
  blobs,
  selectedBlobId,
  onSelect,
  isLoading,
}: MemoryExplorerProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl shimmer" />
        ))}
      </div>
    );
  }

  if (blobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-[#f0eee8] border border-[#e6e4dc] flex items-center justify-center text-[#b3b1a8] text-lg mb-3">
          ○
        </div>
        <p className="text-sm font-semibold text-[#0e0e0e]">No memories yet</p>
        <p className="text-xs text-[#9a9a93] mt-1">
          Run a session — synthesized memory will be stored on Walrus and appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {blobs.map((blob) => {
        const isSelected = blob.blob_id === selectedBlobId;
        const meta = TYPE_META[blob.type] ?? { label: blob.type, fill: 'var(--paper)' };

        return (
          <button
            key={blob.blob_id}
            onClick={() => onSelect(blob.blob_id)}
            className={`w-full text-left p-4 rounded-2xl border transition-all ${
              isSelected
                ? 'border-[1.5px] border-[#0e0e0e] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.3)]'
                : 'border-[#e6e4dc] hover:border-[#0e0e0e]'
            }`}
            style={{ background: meta.fill }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="pill bg-[#0e0e0e] text-white text-[10px] font-semibold px-2.5 py-0.5">
                {meta.label}
              </span>
              <span className="text-[11px] text-[#3a3a35]/60 font-medium">
                {formatRelativeTime(blob.created_at)}
              </span>
            </div>
            <p className="font-mono text-xs text-[#3a3a35]/80 truncate">
              {blob.blob_id.slice(0, 24)}…
            </p>
            {blob.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {blob.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-white/60 text-[#3a3a35] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </button>
        );
      })}

      <p className="text-[11px] text-[#9a9a93] text-center pt-1">
        {blobs.length} blob{blobs.length !== 1 ? 's' : ''} on Walrus
      </p>
    </div>
  );
}

export { aggregatorUrl };
