'use client';

import { useState, useRef, useEffect } from 'react';
import Icon, { type IconName } from '@/components/ui/Icon';

export interface SuggestionGroup {
  icon: IconName;
  label: string;
  items: string[];
}

export const SUGGESTIONS: SuggestionGroup[] = [
  {
    icon: 'shield',
    label: 'Risks',
    items: [
      'Key risks of AI in critical infrastructure',
      'Security risks of autonomous AI agents',
      'Risks of AI in financial decision-making',
      'How do AI systems fail in production?',
      'Mitigating prompt-injection attacks',
    ],
  },
  {
    icon: 'target',
    label: 'Governance',
    items: [
      'How should organizations approach AI governance?',
      'Compare the EU AI Act and US frameworks',
      'What makes an AI audit effective?',
      'Designing an internal AI usage policy',
      'Accountability for autonomous agents',
    ],
  },
  {
    icon: 'merge',
    label: 'Agents',
    items: [
      'Patterns in multi-agent AI systems',
      'Orchestrator vs. swarm agent architectures',
      'How do agents share state reliably?',
      'Evaluating agent reasoning quality',
      'When to use tool-calling vs. fine-tuning',
    ],
  },
  {
    icon: 'database',
    label: 'Memory',
    items: [
      'Implications of decentralized AI memory',
      'Vector search vs. knowledge graphs for memory',
      'How does persistent memory improve agents?',
      'Verifiable memory with content addressing',
      'Privacy concerns with long-term AI memory',
    ],
  },
];

export default function SuggestionChips({ onSelect }: { onSelect: (query: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={ref} className="relative flex flex-wrap gap-2 justify-center mt-5">
      {SUGGESTIONS.map((g) => {
        const isOpen = open === g.label;
        return (
          <div key={g.label} className="relative">
            <button
              onClick={() => setOpen(isOpen ? null : g.label)}
              className={`group inline-flex items-center gap-2 text-[13px] font-medium rounded-xl px-3.5 py-2 border transition-colors ${
                isOpen
                  ? 'text-[var(--ink)] border-[var(--ink)] bg-[var(--card)]'
                  : 'text-[var(--muted)] hover:text-[var(--ink)] bg-[var(--card)] border-[var(--line)] hover:border-[var(--ink)]'
              }`}
            >
              <Icon name={g.icon} size={15} className={isOpen ? 'text-[#6366f1]' : 'text-[var(--faint)] group-hover:text-[#6366f1] transition-colors'} />
              {g.label}
            </button>

            {isOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-30 w-[20rem] max-w-[80vw] anim-fade-up">
                <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl shadow-[0_18px_50px_-18px_rgba(0,0,0,0.4)] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)]">
                    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--ink)]">
                      <Icon name={g.icon} size={14} className="text-[var(--muted)]" />
                      {g.label}
                    </span>
                    <button onClick={() => setOpen(null)} aria-label="Close" className="text-[var(--faint)] hover:text-[var(--ink)] transition-colors">
                      <Icon name="close" size={15} />
                    </button>
                  </div>
                  <div className="py-1">
                    {g.items.map((item) => (
                      <button
                        key={item}
                        onClick={() => { setOpen(null); onSelect(item); }}
                        className="w-full text-left text-[13.5px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] px-4 py-2.5 transition-colors"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
