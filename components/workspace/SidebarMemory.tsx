'use client';

import Icon from '@/components/ui/Icon';
import type { BlobMetadata } from '@/types';

interface SidebarMemoryProps {
  blobs: BlobMetadata[];
  selectedBlobId: string | null;
  onSelect: (blobId: string) => void;
  isLoading: boolean;
}

const TYPE_META: Record<string, { label: string; accent: string }> = {
  synthesis_document: { label: 'Synthesis', accent: '#6366f1' },
  research_report: { label: 'Research', accent: '#06b6d4' },
  session_snapshot: { label: 'Snapshot', accent: '#22c55e' },
  embedding_index: { label: 'Index', accent: '#f59e0b' },
};

function relTime(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/* Prefer the curated summary; fall back to tags or the type label. */
function titleFor(blob: BlobMetadata): string {
  if (blob.summary) return blob.summary;
  const t = blob.tags?.[0];
  if (t) {
    const words = t.replace(/[-_]/g, ' ').trim();
    if (words && !/^[0-9a-f-]{8,}$/i.test(words)) {
      return words.charAt(0).toUpperCase() + words.slice(1);
    }
  }
  return TYPE_META[blob.type]?.label ?? 'Memory';
}

/* ─── List ───────────────────────────────────────────────────────────────── */
export default function SidebarMemory({
  blobs, selectedBlobId, onSelect, isLoading,
}: SidebarMemoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-1.5 anim-fade-up">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl shimmer" />
        ))}
      </div>
    );
  }

  if (blobs.length === 0) {
    return (
      <div className="anim-fade-up rounded-xl border border-dashed border-[var(--line)] px-3 py-5 text-center">
        <span className="inline-flex w-9 h-9 rounded-lg bg-[var(--card)] border border-[var(--line)] items-center justify-center text-[var(--faint)] mb-2">
          <Icon name="database" size={16} />
        </span>
        <p className="text-[12px] font-semibold">No memories yet</p>
        <p className="text-[11px] text-[var(--faint)] mt-0.5 leading-relaxed">Run a session — memory will be stored on Walrus.</p>
      </div>
    );
  }

  return (
    <div className="anim-fade-up space-y-1">
      {blobs.map((blob) => {
        const meta = TYPE_META[blob.type] ?? { label: blob.type, accent: '#9a9a93' };
        const active = blob.blob_id === selectedBlobId;
        return (
          <button
            key={blob.blob_id}
            onClick={() => onSelect(blob.blob_id)}
            className={`group w-full text-left rounded-xl px-2.5 py-2.5 border transition-all ${
              active
                ? 'border-[var(--ink)] bg-[var(--card)]'
                : 'border-transparent hover:bg-[var(--card)] hover:border-[var(--line)]'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span
                className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{ background: `${meta.accent}1a`, color: meta.accent }}
              >
                <Icon name="layers" size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[12.5px] font-semibold leading-snug line-clamp-2 flex-1">{titleFor(blob)}</p>
                  <span className="text-[10px] text-[var(--faint)] flex-shrink-0">{relTime(blob.created_at)}</span>
                </div>
                <p className="text-[10.5px] mt-0.5 font-medium capitalize" style={{ color: meta.accent }}>
                  {blob.memory_type ?? meta.label}
                  {typeof blob.importance === 'number' && (
                    <span className="text-[var(--faint)] font-normal"> · {(blob.importance * 100).toFixed(0)}%</span>
                  )}
                </p>
              </div>
              <Icon name="arrow-right" size={13} className="text-[var(--faint)] opacity-0 group-hover:opacity-100 transition-opacity mt-1.5 flex-shrink-0" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
