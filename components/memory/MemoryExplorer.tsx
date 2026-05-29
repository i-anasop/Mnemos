'use client';

import type { BlobMetadata } from '@/types';
import { aggregatorUrl } from '@/lib/walrus/client';

interface MemoryExplorerProps {
  blobs: BlobMetadata[];
  selectedBlobId: string | null;
  onSelect: (blobId: string) => void;
  isLoading: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  synthesis_document: '#06b6d4',
  research_report:    '#6366f1',
  session_snapshot:   '#888',
  embedding_index:    '#f59e0b',
};

const TYPE_LABELS: Record<string, string> = {
  synthesis_document: 'Synthesis',
  research_report:    'Research',
  session_snapshot:   'Snapshot',
  embedding_index:    'Index',
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
      <div className="p-4 space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-[#111] animate-pulse" />
        ))}
      </div>
    );
  }

  if (blobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
        <div className="text-2xl text-[#1f1f1f] mb-2 font-mono">◎</div>
        <p className="text-xs text-[#444]">No memory blobs yet</p>
        <p className="text-xs text-[#333] mt-1">Run a session to start building memory</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-1.5">
      {blobs.map(blob => {
        const isSelected = blob.blob_id === selectedBlobId;
        const color = TYPE_COLORS[blob.type] ?? '#888';
        const label = TYPE_LABELS[blob.type] ?? blob.type;

        return (
          <button
            key={blob.blob_id}
            onClick={() => onSelect(blob.blob_id)}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              isSelected
                ? 'border-[#06b6d4]/40 bg-[#06b6d4]/5 glow-cyan'
                : 'border-[#1a1a1a] bg-[#111] hover:border-[#2a2a2a]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-semibold" style={{ color }}>
                {label}
              </span>
              <span className="text-[10px] text-[#444] font-mono">
                {formatRelativeTime(blob.created_at)}
              </span>
            </div>
            <div className="font-mono text-[10px] text-[#555] truncate">
              {blob.blob_id.slice(0, 20)}…
            </div>
            {blob.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {blob.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#555] font-mono"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </button>
        );
      })}

      <div className="pt-2 border-t border-[#1a1a1a]">
        <p className="text-[10px] text-[#333] text-center font-mono">
          {blobs.length} blob{blobs.length !== 1 ? 's' : ''} on Walrus
        </p>
      </div>
    </div>
  );
}

export { aggregatorUrl };
