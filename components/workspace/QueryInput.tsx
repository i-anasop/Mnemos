'use client';

import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/Icon';

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isRunning: boolean;
  large?: boolean;
}

const PLACEHOLDER_QUERIES = [
  'What are the key risks of AI in critical infrastructure?',
  'How should organizations approach AI governance in 2026?',
  'What are the emerging patterns in multi-agent AI systems?',
  'Analyze the implications of decentralized AI memory systems',
];

export default function QueryInput({ onSubmit, isRunning, large = false }: QueryInputProps) {
  const [query, setQuery] = useState('');
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER_QUERIES[0]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const idx = Math.floor(Math.random() * PLACEHOLDER_QUERIES.length);
    setPlaceholder(PLACEHOLDER_QUERIES[idx]);
  }, []);

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed || isRunning) return;
    onSubmit(trimmed);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, large ? 200 : 140)}px`;
  }, [query, large]);

  return (
    <div
      className={`bg-[var(--card)] border border-[var(--line)] rounded-[1.75rem] shadow-[0_10px_36px_-16px_rgba(0,0,0,0.22)] focus-within:border-[var(--muted)] transition-colors ${
        large ? 'px-5 pt-5 pb-3' : 'px-4 pt-4 pb-2.5'
      }`}
    >
      <textarea
        ref={textareaRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isRunning}
        rows={large ? 2 : 1}
        aria-label="Research query"
        className={`w-full bg-transparent text-[var(--ink)] placeholder-[var(--faint)] resize-none outline-none leading-relaxed disabled:opacity-50 ${
          large ? 'text-[17px]' : 'text-[15px]'
        }`}
      />

      <div className="flex items-center justify-between mt-2">
        {/* left tools */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Attach"
            title="Attach"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors"
          >
            <Icon name="plus" size={19} />
          </button>
          <span className="hidden sm:flex items-center gap-1.5 ml-0.5 px-2.5 py-1 rounded-full text-[12px] font-medium text-[var(--muted)] bg-[var(--paper)] border border-[var(--line)]">
            <span className="w-1.5 h-1.5 rounded-full grad-bg" />
            Walrus memory
          </span>
        </div>

        {/* right tools */}
        <div className="flex items-center gap-1">
          {isRunning ? (
            <span className="flex items-center gap-1.5 mr-1 text-xs text-[#6366f1] font-medium">
              <span className="w-1.5 h-1.5 rounded-full grad-bg animate-pulse" />
              Thinking…
            </span>
          ) : (
            <>
              <button
                type="button"
                aria-label="Dictate"
                title="Dictate"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors"
              >
                <Icon name="mic" size={18} />
              </button>
              <button
                type="button"
                aria-label="Voice mode"
                title="Voice mode"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors"
              >
                <Icon name="waveform" size={18} />
              </button>
            </>
          )}
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || isRunning}
            aria-label="Send"
            className={`rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed transition-opacity ${
              large ? 'w-11 h-11' : 'w-9 h-9'
            }`}
          >
            <Icon name="arrow-up-right" size={large ? 18 : 16} className="-rotate-45" />
          </button>
        </div>
      </div>
    </div>
  );
}
