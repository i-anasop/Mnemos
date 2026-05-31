'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';

/* Copy / like / dislike actions shown under each Mnemos reply. */
export default function MessageActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<'up' | 'down' | null>(null);

  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }).catch(() => {});
  };

  const btn = 'w-8 h-8 rounded-lg flex items-center justify-center text-[var(--faint)] hover:text-[var(--ink)] hover:bg-[var(--card)] transition-colors';

  return (
    <div className="flex items-center gap-0.5 mt-3 -ml-1">
      <button onClick={copy} aria-label="Copy" title={copied ? 'Copied' : 'Copy'} className={btn}>
        <Icon name={copied ? 'check' : 'copy'} size={15} />
      </button>
      <button
        onClick={() => setVote(vote === 'up' ? null : 'up')}
        aria-label="Good response"
        title="Good response"
        className={`${btn} ${vote === 'up' ? 'text-[#22c55e]' : ''}`}
      >
        <Icon name="thumbUp" size={15} />
      </button>
      <button
        onClick={() => setVote(vote === 'down' ? null : 'down')}
        aria-label="Bad response"
        title="Bad response"
        className={`${btn} ${vote === 'down' ? 'text-[#ef4444]' : ''}`}
      >
        <Icon name="thumbDown" size={15} />
      </button>
    </div>
  );
}
