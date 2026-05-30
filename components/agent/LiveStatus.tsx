'use client';

import type { AgentEvent } from '@/types';

/* Maps the latest stream event to a single human phase label. */
const PHASE: Record<string, string> = {
  session_start:      'Thinking',
  memory_loaded:      'Recalling memory',
  memory_empty:       'Thinking',
  memory_selected:    'Recalling memory',
  research_start:     'Researching',
  research_complete:  'Researching',
  synthesis_start:    'Synthesizing',
  synthesis_complete: 'Synthesizing',
  memory_committing:  'Storing to Walrus',
  memory_committed:   'Storing to Walrus',
};

export function currentPhase(events: AgentEvent[]): string {
  for (let i = events.length - 1; i >= 0; i--) {
    const label = PHASE[events[i].event];
    if (label) return label;
  }
  return 'Thinking';
}

export default function LiveStatus({ events }: { events: AgentEvent[] }) {
  const label = currentPhase(events);
  return (
    <div className="flex items-center gap-3 anim-fade-up py-1">
      <span className="w-8 h-8 rounded-full grad-bg flex items-center justify-center flex-shrink-0">
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
      <span className="text-[15px] font-medium text-[#0e0e0e]">
        {label}
        <span className="text-[#9a9a93]">…</span>
      </span>
    </div>
  );
}
