'use client';

import type { AgentEvent, MemoryRetrieval } from '@/types';

interface AgentFeedProps {
  events: AgentEvent[];
  isRunning: boolean;
}

function MemoryRetrievalList({ retrievals }: { retrievals: MemoryRetrieval[] }) {
  return (
    <div className="mt-1.5 space-y-1.5">
      {retrievals.map((r, i) => (
        <div key={i} className="pl-3 border-l-2 border-[#06b6d4]/30">
          <p className="text-[10px] font-semibold text-[#06b6d4] leading-snug truncate">
            {r.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-mono text-[#444] bg-[#111] px-1.5 py-0.5 rounded">
              {(r.cosine_score * 100).toFixed(0)}% match
            </span>
            {r.confidence > 0 && (
              <span className="text-[9px] font-mono text-[#444]">
                {(r.confidence * 100).toFixed(0)}% conf
              </span>
            )}
          </div>
          <p className="text-[9px] text-[#444] mt-0.5 leading-relaxed">{r.reason}</p>
        </div>
      ))}
    </div>
  );
}

function EventRow({ event }: { event: AgentEvent }) {
  const styles: Record<string, { icon: string; color: string; label: string }> = {
    session_start:      { icon: '◌', color: '#888',    label: 'Session started' },
    memory_loaded:      { icon: '◈', color: '#06b6d4', label: 'Memory loaded' },
    memory_empty:       { icon: '◎', color: '#555',    label: 'No prior memory' },
    memory_selected:    { icon: '↳', color: '#06b6d4', label: 'Retrieved from Walrus' },
    research_start:     { icon: '◉', color: '#6366f1', label: 'Researching' },
    research_complete:  { icon: '✓', color: '#22c55e', label: 'Research complete' },
    synthesis_start:    { icon: '◈', color: '#a855f7', label: 'Synthesizing' },
    synthesis_complete: { icon: '✓', color: '#22c55e', label: 'Synthesis complete' },
    memory_committing:  { icon: '↑', color: '#f59e0b', label: 'Committing to Walrus' },
    memory_committed:   { icon: '◈', color: '#06b6d4', label: 'Memory stored' },
    walrus_warning:     { icon: '⚠', color: '#f59e0b', label: 'Warning' },
    session_complete:   { icon: '◉', color: '#22c55e', label: 'Session complete' },
    error:              { icon: '✕', color: '#ef4444', label: 'Error' },
  };

  const style = styles[event.event] ?? { icon: '·', color: '#888', label: event.event };

  const detail = (() => {
    switch (event.event) {
      case 'memory_loaded':
        return `${event.count} blob${event.count !== 1 ? 's' : ''} retrieved from Walrus`;
      case 'memory_selected':
        return <MemoryRetrievalList retrievals={event.retrievals} />;
      case 'research_start':
        return event.question;
      case 'research_complete':
        return `${event.findings_count} findings · confidence ${(event.confidence * 100).toFixed(0)}%`;
      case 'synthesis_complete': {
        const delta = event.confidence_delta;
        const sign = delta >= 0 ? '+' : '';
        return `${event.themes.join(', ')} · Δ ${sign}${(delta * 100).toFixed(0)}%`;
      }
      case 'memory_committed':
        return (
          <span>
            blob:{' '}
            <span className="font-mono text-[#06b6d4]">
              {event.blob_id.slice(0, 12)}…
            </span>
          </span>
        );
      case 'session_complete':
        return event.summary;
      case 'walrus_warning':
      case 'error':
        return event.message;
      default:
        return null;
    }
  })();

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#1a1a1a] last:border-0">
      <span className="mt-0.5 text-sm font-mono leading-none flex-shrink-0" style={{ color: style.color }}>
        {style.icon}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold" style={{ color: style.color }}>
          {style.label}
        </span>
        {detail && (
          <div className="text-xs text-[#666] mt-0.5 leading-relaxed break-words">{detail}</div>
        )}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-3 px-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="pulse-dot w-1.5 h-1.5 rounded-full bg-[#06b6d4]"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

export default function AgentFeed({ events, isRunning }: AgentFeedProps) {
  if (events.length === 0 && !isRunning) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center px-6">
        <div className="text-3xl text-[#1f1f1f] mb-3 font-mono">◎</div>
        <p className="text-xs text-[#444]">Agent activity will appear here</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {events.map((event, i) => (
        <EventRow key={i} event={event} />
      ))}
      {isRunning && <ThinkingDots />}
    </div>
  );
}
