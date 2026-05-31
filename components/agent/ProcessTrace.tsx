'use client';

import Icon, { type IconName } from '@/components/ui/Icon';
import { WalToken } from '@/components/ui/Brand';
import type { AgentEvent } from '@/types';

/* A clean, compact summary of how Mnemos produced an answer — derived from the
   SSE event stream. Theme-aware; reads as a tidy pipeline, not a debug log. */

interface Step {
  icon: IconName;
  label: string;
  detail?: string;
  accent: string;
}

function buildSteps(events: AgentEvent[]): Step[] {
  const steps: Step[] = [];

  const memLoaded = events.find((e) => e.event === 'memory_loaded');
  const memSelected = events.find((e) => e.event === 'memory_selected');
  if (memLoaded?.event === 'memory_loaded') {
    const n = memLoaded.count;
    const top =
      memSelected?.event === 'memory_selected' && memSelected.retrievals[0]
        ? memSelected.retrievals[0]
        : null;
    steps.push({
      icon: 'search',
      label: `Recalled ${n} memor${n !== 1 ? 'ies' : 'y'} from Walrus`,
      detail: top ? `Top match ${(top.cosine_score * 100).toFixed(0)}% · ${top.title}` : undefined,
      accent: '#6366f1',
    });
  } else if (events.some((e) => e.event === 'memory_empty')) {
    steps.push({ icon: 'database', label: 'No prior memory in this workspace', accent: '#9a9a93' });
  }

  const research = events.find((e) => e.event === 'research_complete');
  if (research?.event === 'research_complete') {
    steps.push({
      icon: 'flask',
      label: 'Researched the question',
      detail: `${research.findings_count} findings · ${(research.confidence * 100).toFixed(0)}% confidence`,
      accent: '#06b6d4',
    });
  }

  const synth = events.find((e) => e.event === 'synthesis_complete');
  if (synth?.event === 'synthesis_complete') {
    steps.push({
      icon: 'merge',
      label: 'Synthesized the answer',
      detail: synth.themes.slice(0, 3).join(' · '),
      accent: '#a855f7',
    });
  }

  const committed = events.find((e) => e.event === 'memory_committed');
  const skipped = events.find((e) => e.event === 'memory_skipped');
  if (committed?.event === 'memory_committed') {
    steps.push({
      icon: 'database',
      label: 'Stored a new memory on Walrus',
      detail: [
        committed.memory_type ? committed.memory_type : null,
        typeof committed.importance === 'number' ? `${(committed.importance * 100).toFixed(0)}% importance` : null,
      ].filter(Boolean).join(' · ') || undefined,
      accent: '#22c55e',
    });
  } else if (skipped?.event === 'memory_skipped') {
    steps.push({ icon: 'close', label: 'Skipped storage', detail: skipped.reason, accent: '#9a9a93' });
  }

  return steps;
}

export default function ProcessTrace({ events }: { events: AgentEvent[] }) {
  const steps = buildSteps(events);
  if (steps.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-1.5 mb-3.5">
        <WalToken size={14} variant="color" />
        <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--faint)]">Mnemos pipeline</span>
      </div>

      <ol className="relative">
        {steps.map((s, i) => (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {/* rail */}
            <div className="flex flex-col items-center flex-shrink-0">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-white"
                style={{ background: s.accent }}
              >
                <Icon name={s.icon} size={14} className="text-white" strokeWidth={2.2} />
              </span>
              {i < steps.length - 1 && <span className="w-px flex-1 bg-[var(--line)] my-1" />}
            </div>
            {/* content */}
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] font-semibold leading-snug text-[var(--ink)]">{s.label}</p>
              {s.detail && <p className="text-[12px] text-[var(--muted)] mt-0.5 leading-relaxed">{s.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
