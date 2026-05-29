'use client';

import { useState, useRef, useEffect } from 'react';

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isRunning: boolean;
}

const PLACEHOLDER_QUERIES = [
  'What are the key risks of AI in critical infrastructure?',
  'How should organizations approach AI governance in 2026?',
  'What are the emerging patterns in multi-agent AI systems?',
  'Analyze the implications of decentralized AI memory',
];

export default function QueryInput({ onSubmit, isRunning }: QueryInputProps) {
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
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [query]);

  return (
    <div className="bg-white border-[1.5px] border-[#0e0e0e] rounded-[1.75rem] shadow-[0_12px_40px_-16px_rgba(0,0,0,0.25)] focus-within:shadow-[0_16px_48px_-14px_rgba(99,102,241,0.35)] transition-shadow px-5 py-4">
      <textarea
        ref={textareaRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask Mnemos to remember something…"
        disabled={isRunning}
        rows={1}
        aria-label="Research query"
        className="w-full bg-transparent text-[15px] text-[#0e0e0e] placeholder-[#b3b1a8] resize-none outline-none leading-relaxed disabled:opacity-50"
      />
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-[#9a9a93]">
          {isRunning ? (
            <span className="flex items-center gap-1.5 text-[#6366f1] font-medium">
              <span className="w-1.5 h-1.5 rounded-full grad-bg animate-pulse" />
              Thinking…
            </span>
          ) : (
            <span className="hidden sm:inline">{placeholder}</span>
          )}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!query.trim() || isRunning}
          className="pill pill-ink text-sm px-6 py-2.5 disabled:opacity-25 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Running…' : 'Ask  ↵'}
        </button>
      </div>
    </div>
  );
}
