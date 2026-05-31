'use client';

import type { AgentEvent, MemoryRetrieval } from '@/types';
import Icon, { type IconName } from '@/components/ui/Icon';
import Mascot from '@/components/ui/Mascot';
import { WalToken } from '@/components/ui/Brand';

interface AgentFeedProps {
  events: AgentEvent[];
  isRunning: boolean;
}

/* ─── Retrieved-memory cards (explainable retrieval) ────────────────────── */
function MemoryRetrievalList({ retrievals }: { retrievals: MemoryRetrieval[] }) {
  if (retrievals.length === 0) return null;
  return (
    <div className="mt-3 grid gap-2.5">
      {retrievals.map((r, i) => (
        <div
          key={i}
          className="group bg-white border border-[#e6e4dc] rounded-2xl p-4 hover:border-[#0e0e0e] hover:shadow-float transition-all anim-fade-up"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-lg grad-bg flex items-center justify-center flex-shrink-0">
                <Icon name="sparkle" size={15} className="text-white" />
              </span>
              <p className="text-sm font-semibold leading-snug truncate">{r.title}</p>
            </div>
            <span className="flex-shrink-0 pill grad-bg text-white text-[11px] font-bold px-2.5 py-1">
              {(r.cosine_score * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-xs text-[#6b6b66] leading-relaxed mb-2.5">{r.reason}</p>
          <div className="flex items-center flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-white grad-bg">
              <WalToken size={11} variant="white" />
              Walrus memory
            </span>
            {r.memory_type && (
              <span className="chip-glass rounded-full px-2 py-0.5 text-[#4a4a45] capitalize font-medium">
                {r.memory_type}
              </span>
            )}
            {typeof r.importance === 'number' && r.importance > 0 && (
              <span className="chip-glass rounded-full px-2 py-0.5 text-[#4a4a45]">
                {(r.importance * 100).toFixed(0)}% importance
              </span>
            )}
            {r.session_id && (
              <span className="chip-glass rounded-full px-2 py-0.5 font-mono text-[#9a9a93]">
                {r.session_id.slice(0, 8)}
              </span>
            )}
            <span className="rounded-full px-2 py-0.5 font-mono text-[#9a9a93] bg-[#f0eee8]">
              {r.workspace_id}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Stage style map ───────────────────────────────────────────────────── */
type StageStyle = { icon: IconName; label: string; accent: string; node: 'grad' | 'solid' };

const STAGE: Record<string, StageStyle> = {
  session_start:      { icon: 'sparkle', label: 'Session started',        accent: '#9a9a93', node: 'solid' },
  memory_loaded:      { icon: 'search',  label: 'Searched memory',         accent: '#06b6d4', node: 'grad' },
  memory_empty:       { icon: 'database', label: 'No prior memory yet',    accent: '#9a9a93', node: 'solid' },
  memory_selected:    { icon: 'sparkle', label: 'Recalled relevant memory', accent: '#6366f1', node: 'grad' },
  research_start:     { icon: 'flask',   label: 'Researching',             accent: '#6366f1', node: 'solid' },
  research_complete:  { icon: 'check',   label: 'Research complete',       accent: '#22c55e', node: 'solid' },
  synthesis_start:    { icon: 'merge',   label: 'Synthesizing',            accent: '#a855f7', node: 'solid' },
  synthesis_complete: { icon: 'check',   label: 'Synthesis complete',      accent: '#22c55e', node: 'solid' },
  memory_decision:    { icon: 'sparkle', label: 'Memory decision',         accent: '#a855f7', node: 'solid' },
  memory_committing:  { icon: 'commit',  label: 'Committing to Walrus',    accent: '#f59e0b', node: 'solid' },
  memory_committed:   { icon: 'database', label: 'Memory stored on Walrus', accent: '#06b6d4', node: 'grad' },
  memory_skipped:     { icon: 'close',   label: 'Not worth storing',       accent: '#9a9a93', node: 'solid' },
  casual_reply:       { icon: 'sparkle', label: 'Replied',                 accent: '#9a9a93', node: 'solid' },
  walrus_warning:     { icon: 'question', label: 'Walrus warning',         accent: '#f59e0b', node: 'solid' },
  session_complete:   { icon: 'check',   label: 'Done',                    accent: '#22c55e', node: 'solid' },
  error:              { icon: 'close',   label: 'Something went wrong',    accent: '#ef4444', node: 'solid' },
};

function StageRow({ event, isLast }: { event: AgentEvent; isLast: boolean }) {
  const s = STAGE[event.event] ?? { icon: 'sparkle' as IconName, label: event.event, accent: '#9a9a93', node: 'solid' as const };

  // session_complete is rendered as the AnswerCard upstream — skip its row noise
  const detail: React.ReactNode = (() => {
    switch (event.event) {
      case 'memory_loaded':
        return `${event.count} memor${event.count !== 1 ? 'ies' : 'y'} rehydrated from Walrus`;
      case 'memory_selected':
        return <MemoryRetrievalList retrievals={event.retrievals} />;
      case 'research_start':
        return <span className="italic text-[#6b6b66]">“{event.question}”</span>;
      case 'research_complete':
        return `${event.findings_count} findings · ${(event.confidence * 100).toFixed(0)}% confidence`;
      case 'synthesis_complete': {
        const sign = event.confidence_delta >= 0 ? '+' : '';
        return (
          <span>
            {event.themes.join(' · ')}
            {event.confidence_delta !== 0 && (
              <span className={event.confidence_delta > 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}>
                {' '}({sign}{(event.confidence_delta * 100).toFixed(0)}% vs. prior)
              </span>
            )}
          </span>
        );
      }
      case 'memory_committed':
        return (
          <span className="text-xs">
            {event.memory_type && <span className="font-semibold capitalize">{event.memory_type}</span>}
            {typeof event.importance === 'number' && <span className="text-[#6b6b66]"> · {(event.importance * 100).toFixed(0)}% importance</span>}
            <span className="block font-mono text-[#06b6d4] mt-0.5">{event.blob_id.slice(0, 18)}…</span>
          </span>
        );
      case 'memory_decision':
        return event.decision.should_store
          ? <span className="text-[#6b6b66]">{event.decision.reason}</span>
          : <span className="text-[#9a9a93]">{event.decision.reason}</span>;
      case 'memory_skipped':
        return <span className="text-[#9a9a93]">{event.reason}</span>;
      case 'walrus_warning':
      case 'error':
        return event.message;
      default:
        return null;
    }
  })();

  const isCard = event.event === 'memory_selected';

  return (
    <div className="relative flex gap-3.5 anim-fade-up">
      {/* rail */}
      <div className="flex flex-col items-center flex-shrink-0">
        <span
          className={`anim-node w-8 h-8 rounded-full flex items-center justify-center text-white ${
            s.node === 'grad' ? 'grad-bg' : ''
          }`}
          style={s.node === 'solid' ? { background: s.accent } : undefined}
        >
          <Icon name={s.icon} size={16} className="text-white" strokeWidth={2} />
        </span>
        {!isLast && <span className="w-px flex-1 bg-[#e6e4dc] min-h-[14px] my-1" />}
      </div>

      {/* content */}
      <div className={`flex-1 min-w-0 ${isLast ? 'pb-1' : 'pb-5'}`}>
        <p className="text-sm font-semibold leading-7" style={{ color: s.accent }}>
          {s.label}
        </p>
        {detail && !isCard && (
          <p className="text-sm text-[#6b6b66] leading-relaxed break-words">{detail}</p>
        )}
        {detail && isCard && detail}
      </div>
    </div>
  );
}

function ThinkingRow() {
  return (
    <div className="relative flex gap-3.5">
      <div className="flex flex-col items-center flex-shrink-0">
        <span className="w-8 h-8 rounded-full grad-bg flex items-center justify-center">
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="pulse-dot w-1 h-1 rounded-full bg-white"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </span>
        </span>
      </div>
      <div className="flex-1 flex items-center">
        <p className="text-sm font-medium text-[#9a9a93]">Working…</p>
      </div>
    </div>
  );
}

export default function AgentFeed({ events, isRunning }: AgentFeedProps) {
  if (events.length === 0 && !isRunning) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="relative mb-3">
          <div className="absolute inset-0 -z-10 halo scale-110" />
          <Mascot pose="peace" priority alt="Mnemos mascot" className="w-44 h-auto anim-float" />
        </div>
        <p className="text-xl font-bold text-[#0e0e0e]">Ready when you are.</p>
        <p className="text-sm text-[#9a9a93] mt-1.5 max-w-xs leading-relaxed">
          Ask anything. Mnemos recalls what it knows and stores what it learns — on Walrus.
        </p>
      </div>
    );
  }

  // Hide the final session_complete row (its content becomes the AnswerCard)
  const visible = events.filter((e) => e.event !== 'session_complete');

  return (
    <div className="pt-1">
      {visible.map((event, i) => (
        <StageRow key={i} event={event} isLast={i === visible.length - 1 && !isRunning} />
      ))}
      {isRunning && <ThinkingRow />}
    </div>
  );
}
