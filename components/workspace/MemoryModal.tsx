'use client';

import { useEffect } from 'react';
import Icon from '@/components/ui/Icon';
import { WalToken } from '@/components/ui/Brand';
import type { BlobMetadata } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  blobs: BlobMetadata[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelect: (id: string) => void;
  workspaceName: string;
}

const TYPE_META: Record<string, { label: string; accent: string }> = {
  profile_fact: { label: 'Profile', accent: '#6366f1' },
  decision: { label: 'Decision', accent: '#a855f7' },
  architecture: { label: 'Architecture', accent: '#06b6d4' },
  research: { label: 'Research', accent: '#06b6d4' },
  preference: { label: 'Preference', accent: '#f59e0b' },
  plan: { label: 'Plan', accent: '#22c55e' },
  insight: { label: 'Insight', accent: '#eab308' },
  summary: { label: 'Summary', accent: '#6366f1' },
  synthesis_document: { label: 'Synthesis', accent: '#6366f1' },
  research_report: { label: 'Research', accent: '#06b6d4' },
  session_snapshot: { label: 'Memory', accent: '#22c55e' },
};

function relTime(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function titleFor(b: BlobMetadata): string {
  if (b.summary) return b.summary;
  const t = b.tags?.find(x => !/^[0-9a-f-]{8,}$/i.test(x));
  if (t) { const w = t.replace(/[-_]/g, ' ').trim(); return w.charAt(0).toUpperCase() + w.slice(1); }
  return TYPE_META[b.memory_type ?? b.type]?.label ?? 'Memory';
}

/* Dedicated, full memory explorer — opens on top of the profile modal. */
export default function MemoryModal({ open, onClose, blobs, isLoading, onRefresh, onSelect, workspaceName }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#0e0e0e]/50 backdrop-blur-[3px]" onClick={onClose} />

      <div className="relative w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-[0_24px_64px_-24px_rgba(0,0,0,0.55)] overflow-hidden anim-fade-up">
        {/* header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--line)]">
          <span className="w-9 h-9 rounded-xl grad-bg text-white flex items-center justify-center flex-shrink-0">
            <WalToken size={18} variant="white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-[var(--ink)]">Memory on Walrus</p>
            <p className="text-[12px] text-[var(--muted)] truncate">{blobs.length} stored · {workspaceName}</p>
          </div>
          <button onClick={onRefresh} aria-label="Refresh" title="Refresh" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card)]">
            <Icon name="restart" size={16} />
          </button>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card)]">
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* body */}
        <div className="overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl shimmer" />)}
            </div>
          ) : blobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="w-12 h-12 rounded-2xl bg-[var(--card)] border border-[var(--line)] flex items-center justify-center text-[var(--faint)] mb-3">
                <Icon name="database" size={20} />
              </span>
              <p className="text-sm font-semibold text-[var(--ink)]">No memories yet</p>
              <p className="text-[12px] text-[var(--muted)] mt-1 max-w-xs">Chat naturally — Mnemos saves meaningful facts and decisions here as verifiable Walrus blobs.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {blobs.map(b => {
                const meta = TYPE_META[b.memory_type ?? b.type] ?? { label: b.memory_type ?? b.type, accent: '#9a9a93' };
                return (
                  <button
                    key={b.blob_id}
                    onClick={() => onSelect(b.blob_id)}
                    className="group w-full text-left rounded-xl border border-[var(--line)] bg-[var(--card)] hover:border-[var(--muted)] p-3.5 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${meta.accent}1a`, color: meta.accent }}>
                        <Icon name="layers" size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-[var(--ink)] leading-snug line-clamp-2">{titleFor(b)}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px]">
                          <span className="font-medium capitalize" style={{ color: meta.accent }}>{meta.label}</span>
                          {typeof b.importance === 'number' && <span className="text-[var(--faint)]">· {(b.importance * 100).toFixed(0)}%</span>}
                          <span className="text-[var(--faint)]">· {relTime(b.created_at)}</span>
                        </div>
                        {b.tags && b.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {b.tags.filter(t => !/^[0-9a-f-]{8,}$/i.test(t)).slice(0, 4).map(t => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)]">{t}</span>
                            ))}
                          </div>
                        )}
                        <p className="font-mono text-[10.5px] text-[var(--faint)] truncate mt-1.5">{b.blob_id.slice(0, 32)}…</p>
                      </div>
                      <Icon name="arrow-right" size={14} className="text-[var(--faint)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
